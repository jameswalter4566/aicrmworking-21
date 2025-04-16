import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoanProgressTracker from "@/components/mortgage/LoanProgressTracker";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Briefcase, FileText, HomeIcon, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import EmailConditionsParser from "@/components/mortgage/EmailConditionsParser";
import { ConditionItem, LoanCondition } from "@/components/mortgage/ConditionItem";
import { SidebarProvider } from "@/components/ui/sidebar";
import ProcessorSidebar from "@/components/mortgage/ProcessorSidebar";
import ConversationSection from "@/components/mortgage/ConversationSection";
import OrderServiceSection from "@/components/mortgage/OrderServiceSection";
import AILoanOfficerAssist from "@/components/mortgage/AILoanOfficerAssist";

interface LoanApplication {
  id: string;
  firstName: string;
  lastName: string;
  propertyAddress: string;
  loanAmount: number;
  loanStatus: string;
  loanId: string;
  mortgageData?: any;
  currentStep?: string;
}

interface ProcessorTask {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  icon: React.ReactNode;
}

interface ParsedConditions {
  masterConditions: LoanCondition[];
  generalConditions: LoanCondition[];
  priorToFinalConditions: LoanCondition[];
  complianceConditions: LoanCondition[];
}

const ProcessorAssistViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loanApplication, setLoanApplication] = useState<LoanApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("employment");
  const [activeSection, setActiveSection] = useState("conditions");
  const [parsedConditions, setParsedConditions] = useState<ParsedConditions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  useEffect(() => {
    if (id) {
      fetchLoanApplicationData(id);
    }
  }, [id]);
  
  const fetchLoanApplicationData = async (leadId: string) => {
    setLoading(true);
    setLoadError(null);
    
    console.log(`Fetching loan application data for lead ID: ${leadId}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('retrieve-leads', {
        body: { 
          leadId: leadId,
          industryFilter: 'mortgage',
          exactMatch: true
        }
      });

      if (error) {
        console.error("Error fetching loan application:", error);
        toast.error("Failed to load loan application details");
        setLoadError(`API Error: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!data.success || !data.data || data.data.length === 0) {
        console.error("API returned error or no data:", data.error);
        toast.error(data.error || "Failed to load loan application details");
        setLoadError(`No data returned for lead ID: ${leadId}`);
        setLoading(false);
        return;
      }

      console.log(`Retrieved ${data.data.length} leads for ID ${leadId}:`, data);
      
      const lead = data.data[0];
      
      if (lead.id.toString() !== leadId.toString()) {
        console.error(`Lead ID mismatch! Requested ${leadId} but got ${lead.id}`);
        setLoadError(`Data error: Received incorrect lead (${lead.id}) instead of requested lead (${leadId})`);
        setLoading(false);
        return;
      }
      
      console.log("Retrieved lead data:", lead);
      
      if (!lead.firstName && !lead.lastName) {
        console.warn("Lead is missing first name and last name:", lead);
      }
      
      const loanAmountStr = lead.mortgageData?.property?.loanAmount || '0';
      const loanAmount = parseFloat(loanAmountStr.replace(/,/g, '')) || 0;
      
      let currentStep = "applicationCreated";
      
      if (lead.mortgageData?.loan?.status) {
        const status = lead.mortgageData.loan.status.toLowerCase();
        if (status.includes("processing")) currentStep = "processing";
        else if (status.includes("approved")) currentStep = "approved";
        else if (status.includes("closing")) currentStep = "closing";
        else if (status.includes("funded")) currentStep = "funded";
        else if (status.includes("submitted")) currentStep = "submitted";
      }
      
      const loanAppData = {
        id: lead.id,
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        propertyAddress: lead.propertyAddress || 'No address provided',
        loanAmount: loanAmount,
        loanStatus: lead.mortgageData?.loan?.status || "Processing",
        loanId: lead.mortgageData?.loan?.loanNumber || `ML-${lead.id}`,
        mortgageData: lead.mortgageData || {},
        currentStep: currentStep
      };
      
      console.log("Processed loan application data:", loanAppData);
      setLoanApplication(loanAppData);
    } catch (error: any) {
      console.error("Error in fetchLoanApplicationData:", error);
      toast.error("An unexpected error occurred");
      setLoadError(`Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleTaskAction = (taskId: string) => {
    toast.success(`Task ${taskId} initiated`);
  };

  const goBack = () => {
    navigate('/processor');
  };

  const handleConditionsFound = (conditions: ParsedConditions) => {
    setParsedConditions(conditions);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  const tasks: Record<string, ProcessorTask[]> = {
    employment: [
      {
        id: "employment-verification",
        name: "Employment Verification",
        description: "Verify borrower's employment and income information",
        status: "pending",
        icon: <Briefcase className="h-5 w-5" />
      },
      {
        id: "income-documentation",
        name: "Income Documentation",
        description: "Collect and organize income documentation",
        status: "pending",
        icon: <FileText className="h-5 w-5" />
      }
    ],
    title: [
      {
        id: "title-search",
        name: "Order Title Search",
        description: "Request title search from title company",
        status: "pending",
        icon: <FileText className="h-5 w-5" />
      },
      {
        id: "title-insurance",
        name: "Title Insurance",
        description: "Process title insurance requirements",
        status: "pending",
        icon: <ClipboardCheck className="h-5 w-5" />
      }
    ],
    appraisal: [
      {
        id: "order-appraisal",
        name: "Order Appraisal",
        description: "Request property appraisal from approved vendor",
        status: "pending",
        icon: <HomeIcon className="h-5 w-5" />
      },
      {
        id: "appraisal-followup",
        name: "Appraisal Follow-up",
        description: "Track and follow up on appraisal status",
        status: "pending",
        icon: <ClipboardCheck className="h-5 w-5" />
      }
    ],
    documents: [
      {
        id: "document-collection",
        name: "Document Collection",
        description: "Track required documentation from borrower",
        status: "pending",
        icon: <FileText className="h-5 w-5" />
      },
      {
        id: "document-organization",
        name: "Document Organization",
        description: "Organize and classify loan documentation",
        status: "pending",
        icon: <ClipboardCheck className="h-5 w-5" />
      }
    ]
  };

  const renderTaskSection = (taskCategory: string) => {
    const categoryTasks = tasks[taskCategory] || [];
    
    return (
      <div className="space-y-4">
        {categoryTasks.map(task => (
          <div key={task.id} className="bg-white rounded-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-mortgage-lightPurple p-2 rounded-full">
                  {task.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{task.name}</h3>
                  <p className="text-sm text-gray-500">{task.description}</p>
                </div>
              </div>
              <Button 
                onClick={() => handleTaskAction(task.id)}
                className="bg-mortgage-purple hover:bg-mortgage-darkPurple text-white"
              >
                Initiate
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderConditionsSection = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <EmailConditionsParser 
            clientLastName={loanApplication?.lastName || ''} 
            loanNumber={loanApplication?.loanId || ''}
            leadId={loanApplication?.id || ''}
            onConditionsFound={handleConditionsFound}
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-blue-700 mb-4">
            Borrower's Remaining Conditions
          </h2>
          
          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-white border border-blue-100">
              <CardHeader className="bg-blue-50 pb-2">
                <CardTitle className="text-lg font-medium text-blue-900 flex items-center">
                  Master Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-white">
                {parsedConditions?.masterConditions?.length > 0 ? (
                  <div className="space-y-2">
                    {parsedConditions.masterConditions.map((condition, index) => (
                      <ConditionItem 
                        key={condition.id || `master-${index}`}
                        condition={condition}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-blue-800 italic">
                    No master conditions found.
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-blue-100">
              <CardHeader className="bg-blue-50 pb-2">
                <CardTitle className="text-lg font-medium text-blue-900">
                  General Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-white">
                {parsedConditions?.generalConditions?.length > 0 ? (
                  <div className="space-y-2">
                    {parsedConditions.generalConditions.map((condition, index) => (
                      <ConditionItem 
                        key={condition.id || `general-${index}`}
                        condition={condition}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-blue-800 italic">
                    No general conditions found.
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-blue-100">
              <CardHeader className="bg-blue-50 pb-2">
                <CardTitle className="text-lg font-medium text-blue-900">
                  Prior to Final Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-white">
                {parsedConditions?.priorToFinalConditions?.length > 0 ? (
                  <div className="space-y-2">
                    {parsedConditions.priorToFinalConditions.map((condition, index) => (
                      <ConditionItem 
                        key={condition.id || `final-${index}`}
                        condition={condition}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-blue-800 italic">
                    No prior to final conditions found.
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-blue-100">
              <CardHeader className="bg-blue-50 pb-2">
                <CardTitle className="text-lg font-medium text-blue-900">
                  Compliance Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-white">
                {parsedConditions?.complianceConditions?.length > 0 ? (
                  <div className="space-y-2">
                    {parsedConditions.complianceConditions.map((condition, index) => (
                      <ConditionItem 
                        key={condition.id || `compliance-${index}`}
                        condition={condition}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-blue-800 italic">
                    No compliance conditions found.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderTaskTabs = () => {
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4 bg-white border border-blue-100">
          <TabsTrigger 
            value="employment" 
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
          >
            Employment Verification
          </TabsTrigger>
          <TabsTrigger 
            value="title" 
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
          >
            Title Order
          </TabsTrigger>
          <TabsTrigger 
            value="appraisal" 
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
          >
            Appraisal Order
          </TabsTrigger>
          <TabsTrigger 
            value="documents" 
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
          >
            Document Handler
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="employment" className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Employment Verification Tasks</h2>
          {renderTaskSection("employment")}
        </TabsContent>
        
        <TabsContent value="title" className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Title Order Tasks</h2>
          {renderTaskSection("title")}
        </TabsContent>
        
        <TabsContent value="appraisal" className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Appraisal Order Tasks</h2>
          {renderTaskSection("appraisal")}
        </TabsContent>
        
        <TabsContent value="documents" className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Document Handler Tasks</h2>
          {renderTaskSection("documents")}
        </TabsContent>
      </Tabs>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case "conditions":
        return renderConditionsSection();
      case "conversation":
        return <ConversationSection leadId={id || ''} />;
      case "orderServices":
        return (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-blue-800 mb-2">Select a Service to Order</h3>
            <p className="text-blue-600">Please select a service from the sidebar to order.</p>
          </div>
        );
      case "employmentVerification":
        return <OrderServiceSection serviceName="employmentVerification" leadId={id || ''} />;
      case "titleOrder":
        return <OrderServiceSection serviceName="titleOrder" leadId={id || ''} />;
      case "aiLoanOfficer":
        return <AILoanOfficerAssist leadId={id || ''} />;
      default:
        return renderTaskTabs();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple mx-auto mb-4" />
          <p className="text-gray-600">Loading borrower data for ID: {id}...</p>
        </div>
      </div>
    );
  }

  if (loadError || !loanApplication) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold text-gray-700">
          {loadError ? "Error loading loan application" : "Loan application not found"}
        </h2>
        <p className="mt-2 text-gray-500">
          {loadError || `The requested loan application (ID: ${id}) could not be found.`}
        </p>
        <Button onClick={goBack} className="mt-4" variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-white w-full">
        <ProcessorSidebar 
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          loanId={loanApplication.loanId}
          borrowerName={`${loanApplication.firstName} ${loanApplication.lastName}`}
        />
        
        <div className="flex-1 flex flex-col">
          <div className="bg-white shadow-sm p-4">
            <Button 
              onClick={goBack} 
              variant="outline" 
              size="sm" 
              className="rounded-full border-blue-300 hover:bg-blue-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4 text-blue-700" />
              Back to Processor Assist
            </Button>
          </div>

          <LoanProgressTracker currentStep={loanApplication.currentStep || "applicationCreated"} />

          <div className="flex-1 p-6">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h1 className="text-2xl font-bold text-blue-700 mb-2">
                {activeSection === "conditions" ? "Processor Tasks" : 
                 activeSection === "conversation" ? "Client Conversations" :
                 activeSection === "orderServices" ? "Order Services" :
                 activeSection === "employmentVerification" ? "Employment Verification" :
                 activeSection === "titleOrder" ? "Title Order" :
                 activeSection === "aiLoanOfficer" ? "AI Loan Officer Assist" : 
                 "Processor Tasks"}: {loanApplication.loanId}
              </h1>
              <div className="flex flex-wrap items-center mt-2 text-sm text-gray-600">
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium mr-2 mb-1">
                  {loanApplication.loanStatus}
                </span>
                <span className="mr-4 mb-1">{loanApplication.firstName} {loanApplication.lastName}</span>
                <span className="mr-4 mb-1">• {loanApplication.propertyAddress}</span>
                <span className="font-medium mb-1">{formatCurrency(loanApplication.loanAmount)}</span>
              </div>
            </div>

            {renderContent()}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ProcessorAssistViewer;
