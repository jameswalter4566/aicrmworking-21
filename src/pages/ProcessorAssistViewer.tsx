import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoanProgressTracker from "@/components/mortgage/LoanProgressTracker";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Briefcase, FileText, HomeIcon, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  id: string;
  description: string;
  status: "pending" | "cleared" | "waived";
}
const ProcessorAssistViewer = () => {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const [loanApplication, setLoanApplication] = useState<LoanApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("employment");
  const tasks: Record<string, ProcessorTask[]> = {
    employment: [{
      id: "employment-verification",
      name: "Employment Verification",
      description: "Verify borrower's employment and income information",
      status: "pending",
      icon: <Briefcase className="h-5 w-5" />
    }, {
      id: "income-documentation",
      name: "Income Documentation",
      description: "Collect and organize income documentation",
      status: "pending",
      icon: <FileText className="h-5 w-5" />
    }],
    title: [{
      id: "title-search",
      name: "Order Title Search",
      description: "Request title search from title company",
      status: "pending",
      icon: <FileText className="h-5 w-5" />
    }, {
      id: "title-insurance",
      name: "Title Insurance",
      description: "Process title insurance requirements",
      status: "pending",
      icon: <ClipboardCheck className="h-5 w-5" />
    }],
    appraisal: [{
      id: "order-appraisal",
      name: "Order Appraisal",
      description: "Request property appraisal from approved vendor",
      status: "pending",
      icon: <HomeIcon className="h-5 w-5" />
    }, {
      id: "appraisal-followup",
      name: "Appraisal Follow-up",
      description: "Track and follow up on appraisal status",
      status: "pending",
      icon: <ClipboardCheck className="h-5 w-5" />
    }],
    documents: [{
      id: "document-collection",
      name: "Document Collection",
      description: "Track required documentation from borrower",
      status: "pending",
      icon: <FileText className="h-5 w-5" />
    }, {
      id: "document-organization",
      name: "Document Organization",
      description: "Organize and classify loan documentation",
      status: "pending",
      icon: <ClipboardCheck className="h-5 w-5" />
    }]
  };
  useEffect(() => {
    if (id) {
      fetchLoanApplicationData(id);
    }
  }, [id]);
  const fetchLoanApplicationData = async (leadId: string) => {
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('retrieve-leads', {
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
        if (status.includes("processing")) currentStep = "processing";else if (status.includes("approved")) currentStep = "approved";else if (status.includes("closing")) currentStep = "closing";else if (status.includes("funded")) currentStep = "funded";else if (status.includes("submitted")) currentStep = "submitted";
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
  const renderTaskSection = (taskCategory: string) => {
    const categoryTasks = tasks[taskCategory] || [];
    return <div className="space-y-4">
        {categoryTasks.map(task => <div key={task.id} className="bg-blue-800 text-white rounded-md border border-blue-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-700 p-2 rounded-full">
                  {task.icon}
                </div>
                <div>
                  <h3 className="font-medium">{task.name}</h3>
                  <p className="text-sm text-blue-200">{task.description}</p>
                </div>
              </div>
              <Button onClick={() => handleTaskAction(task.id)} className="bg-blue-600 hover:bg-blue-500 text-white">
                Initiate
              </Button>
            </div>
          </div>)}
      </div>;
  };
  if (loading) {
    return <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>;
  }
  if (!loanApplication) {
    return <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold text-gray-700">Loan application not found</h2>
        <p className="mt-2 text-gray-500">The requested loan application could not be found.</p>
        <Button onClick={goBack} className="mt-4" variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>;
  }
  return <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Back Button Header */}
      <div className="bg-white shadow-sm p-4">
        <Button onClick={goBack} variant="outline" size="sm" className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Processor Assist
        </Button>
      </div>

      {/* Loan Progress Tracker */}
      <LoanProgressTracker currentStep={loanApplication.currentStep || "applicationCreated"} />

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-blue-800 mb-2">
            Processor Tasks: {loanApplication.loanId}
          </h1>
          <div className="flex items-center mt-2 text-sm text-gray-600">
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium mr-2">
              {loanApplication.loanStatus}
            </span>
            <span>{loanApplication.firstName} {loanApplication.lastName} • {loanApplication.propertyAddress}</span>
            <span className="ml-4 font-medium">{formatCurrency(loanApplication.loanAmount)}</span>
          </div>
        </div>

        {/* Borrower's Remaining Conditions Section */}
        <div className="rounded-lg shadow-sm p-6 mb-6 bg-slate-50">
          <h2 className="text-xl font-bold text-white mb-4">
            Borrower's Remaining Conditions
          </h2>
          
          <div className="grid grid-cols-1 gap-6">
            {/* Master Conditions */}
            <Card className="bg-blue-800">
              <CardHeader className="bg-blue-800 pb-2">
                <CardTitle className="text-lg font-medium text-white">Master Conditions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-blue-800">
                <div className="text-sm text-blue-200 italic">
                  No master conditions found. Conditions will appear here when the approval letter is parsed.
                </div>
              </CardContent>
            </Card>
            
            {/* General Conditions */}
            <Card className="bg-blue-800">
              <CardHeader className="bg-blue-800 pb-2">
                <CardTitle className="text-lg font-medium text-white">General Conditions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-blue-800">
                <div className="text-sm text-blue-200 italic">
                  No general conditions found. Conditions will appear here when the approval letter is parsed.
                </div>
              </CardContent>
            </Card>
            
            {/* Prior to Final Conditions */}
            <Card className="bg-blue-800">
              <CardHeader className="bg-blue-800 pb-2">
                <CardTitle className="text-lg font-medium text-white">Prior to Final Conditions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-blue-800">
                <div className="text-sm text-blue-200 italic">
                  No prior to final conditions found. Conditions will appear here when the approval letter is parsed.
                </div>
              </CardContent>
            </Card>
            
            {/* Compliance Conditions */}
            <Card className="bg-blue-800">
              <CardHeader className="bg-blue-800 pb-2">
                <CardTitle className="text-lg font-medium text-white">Compliance Conditions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-blue-800">
                <div className="text-sm text-blue-200 italic">
                  No compliance conditions found. Conditions will appear here when the approval letter is parsed.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4 bg-blue-900">
            <TabsTrigger value="employment" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white">
              Employment Verification
            </TabsTrigger>
            <TabsTrigger value="title" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white">
              Title Order
            </TabsTrigger>
            <TabsTrigger value="appraisal" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white">
              Appraisal Order
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white">
              Document Handler
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="employment" className="rounded-lg shadow-sm p-6 bg-blue-50">
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
    </div>;
};
export default ProcessorAssistViewer;