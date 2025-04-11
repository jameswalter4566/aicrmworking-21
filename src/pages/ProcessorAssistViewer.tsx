
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

interface LoanCondition {
  id?: string;
  description: string;
  status: "pending" | "cleared" | "waived";
}

interface ImportedConditions {
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
  const [conditions, setConditions] = useState<ImportedConditions>({
    masterConditions: [],
    generalConditions: [],
    priorToFinalConditions: [],
    complianceConditions: []
  });
  
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
  
  useEffect(() => {
    if (id) {
      fetchLoanApplicationData(id);
    }
  }, [id]);
  
  const fetchLoanApplicationData = async (leadId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('retrieve-leads', {
        body: { 
          leadId,
          industryFilter: 'mortgage'
        }
      });

      if (error) {
        console.error("Error fetching loan application:", error);
        toast.error("Failed to load loan application details");
        setLoading(false);
        return;
      }

      if (!data.success || !data.data || data.data.length === 0) {
        console.error("API returned error or no data:", data.error);
        toast.error(data.error || "Failed to load loan application details");
        setLoading(false);
        return;
      }

      const lead = data.data[0];
      const loanAmountStr = lead.mortgageData?.property?.loanAmount || '0';
      const loanAmount = parseFloat(loanAmountStr.replace(/,/g, '')) || 0;
      
      // Determine the current step based on loan status or other data
      let currentStep = "applicationCreated"; // Default to first step
      
      if (lead.mortgageData?.loan?.status) {
        const status = lead.mortgageData.loan.status.toLowerCase();
        if (status.includes("processing")) currentStep = "processing";
        else if (status.includes("approved")) currentStep = "approved";
        else if (status.includes("closing")) currentStep = "closing";
        else if (status.includes("funded")) currentStep = "funded";
        else if (status.includes("submitted")) currentStep = "submitted";
      }
      
      setLoanApplication({
        id: lead.id,
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        propertyAddress: lead.propertyAddress || 'No address provided',
        loanAmount: loanAmount,
        loanStatus: lead.mortgageData?.loan?.status || "Processing",
        loanId: lead.mortgageData?.loan?.loanNumber || `ML-${lead.id}`,
        mortgageData: lead.mortgageData || {},
        currentStep: currentStep
      });
    } catch (error) {
      console.error("Error in fetchLoanApplicationData:", error);
      toast.error("An unexpected error occurred");
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
    // Here you would implement the actual task processing logic
  };

  const goBack = () => {
    navigate('/processor');
  };

  const handleConditionsLoaded = (importedConditions: ImportedConditions) => {
    setConditions({
      masterConditions: importedConditions.masterConditions || [],
      generalConditions: importedConditions.generalConditions || [],
      priorToFinalConditions: importedConditions.priorToFinalConditions || [],
      complianceConditions: importedConditions.complianceConditions || []
    });
    toast.success("Conditions have been imported successfully");
  };

  const renderTaskSection = (taskCategory: string) => {
    const categoryTasks = tasks[taskCategory] || [];
    
    return (
      <div className="space-y-4">
        {categoryTasks.map(task => (
          <div key={task.id} className="bg-blue-900 rounded-lg border border-blue-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-800 p-2 rounded-full">
                  {task.icon}
                </div>
                <div>
                  <h3 className="font-medium text-white">{task.name}</h3>
                  <p className="text-sm text-blue-300">{task.description}</p>
                </div>
              </div>
              <Button 
                onClick={() => handleTaskAction(task.id)}
                className="bg-blue-700 hover:bg-blue-600 text-white"
              >
                Initiate
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderConditionsList = (conditions: LoanCondition[]) => {
    if (!conditions || conditions.length === 0) {
      return (
        <div className="text-sm text-blue-300 italic">
          No conditions found. Use the email parser above to import conditions from approval letter.
        </div>
      );
    }

    return (
      <ul className="space-y-2">
        {conditions.map((condition, index) => (
          <li key={condition.id || `cond-${index}`} className="flex items-start gap-2 p-2 rounded-lg bg-blue-800">
            <div className="flex-shrink-0 mt-1">
              <div className="w-4 h-4 border-2 border-blue-300 rounded-full"></div>
            </div>
            <div>
              <p className="text-white">{condition.description}</p>
              <p className="text-xs text-blue-300 mt-1">Status: {condition.status}</p>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!loanApplication) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold text-gray-700">Loan application not found</h2>
        <p className="mt-2 text-gray-500">The requested loan application could not be found.</p>
        <Button onClick={goBack} className="mt-4" variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Back Button Header */}
      <div className="bg-white shadow-sm p-4">
        <Button 
          onClick={goBack} 
          variant="outline" 
          size="sm" 
          className="rounded-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Processor Assist
        </Button>
      </div>

      {/* Loan Progress Tracker */}
      <LoanProgressTracker currentStep={loanApplication.currentStep || "applicationCreated"} />

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="bg-blue-900 rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            Processor Tasks: {loanApplication.loanId}
          </h1>
          <div className="flex items-center mt-2 text-sm text-blue-300">
            <span className="px-2 py-1 rounded-full bg-blue-800 text-blue-100 text-xs font-medium mr-2">
              {loanApplication.loanStatus}
            </span>
            <span>{loanApplication.firstName} {loanApplication.lastName} • {loanApplication.propertyAddress}</span>
            <span className="ml-4 font-medium">{formatCurrency(loanApplication.loanAmount)}</span>
          </div>
        </div>

        {/* Email Parser Component */}
        <EmailConditionsParser 
          borrowerLastName={loanApplication.lastName}
          loanId={loanApplication.loanId}
          onConditionsLoaded={handleConditionsLoaded}
        />

        {/* Borrower's Remaining Conditions Section */}
        <div className="bg-blue-900 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Borrower's Remaining Conditions
          </h2>
          
          <div className="grid grid-cols-1 gap-6">
            {/* Master Conditions */}
            <Card className="bg-blue-800">
              <CardHeader className="bg-blue-700 pb-2 rounded-t-lg">
                <CardTitle className="text-lg font-medium text-white">Master Conditions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-blue-800 rounded-b-lg">
                {renderConditionsList(conditions.masterConditions)}
              </CardContent>
            </Card>
            
            {/* General Conditions */}
            <Card className="bg-blue-800">
              <CardHeader className="bg-blue-700 pb-2 rounded-t-lg">
                <CardTitle className="text-lg font-medium text-white">General Conditions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-blue-800 rounded-b-lg">
                {renderConditionsList(conditions.generalConditions)}
              </CardContent>
            </Card>
            
            {/* Prior to Final Conditions */}
            <Card className="bg-blue-800">
              <CardHeader className="bg-blue-700 pb-2 rounded-t-lg">
                <CardTitle className="text-lg font-medium text-white">Prior to Final Conditions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-blue-800 rounded-b-lg">
                {renderConditionsList(conditions.priorToFinalConditions)}
              </CardContent>
            </Card>
            
            {/* Compliance Conditions */}
            <Card className="bg-blue-800">
              <CardHeader className="bg-blue-700 pb-2 rounded-t-lg">
                <CardTitle className="text-lg font-medium text-white">Compliance Conditions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-blue-800 rounded-b-lg">
                {renderConditionsList(conditions.complianceConditions)}
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4 bg-blue-900 text-white">
            <TabsTrigger 
              value="employment" 
              className="text-white data-[state=active]:bg-blue-700 data-[state=active]:text-white"
            >
              Employment Verification
            </TabsTrigger>
            <TabsTrigger 
              value="title" 
              className="text-white data-[state=active]:bg-blue-700 data-[state=active]:text-white"
            >
              Title Order
            </TabsTrigger>
            <TabsTrigger 
              value="appraisal" 
              className="text-white data-[state=active]:bg-blue-700 data-[state=active]:text-white"
            >
              Appraisal Order
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="text-white data-[state=active]:bg-blue-700 data-[state=active]:text-white"
            >
              Document Handler
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="employment" className="bg-blue-900 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Employment Verification Tasks</h2>
            {renderTaskSection("employment")}
          </TabsContent>
          
          <TabsContent value="title" className="bg-blue-900 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Title Order Tasks</h2>
            {renderTaskSection("title")}
          </TabsContent>
          
          <TabsContent value="appraisal" className="bg-blue-900 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Appraisal Order Tasks</h2>
            {renderTaskSection("appraisal")}
          </TabsContent>
          
          <TabsContent value="documents" className="bg-blue-900 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Document Handler Tasks</h2>
            {renderTaskSection("documents")}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProcessorAssistViewer;
