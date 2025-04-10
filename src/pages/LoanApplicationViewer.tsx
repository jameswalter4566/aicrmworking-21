
import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoanApplicationSidebar from "@/components/mortgage/LoanApplicationSidebar";
import LoanProgressTracker from "@/components/mortgage/LoanProgressTracker";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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

const LoanApplicationViewer = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [loanApplication, setLoanApplication] = useState<LoanApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("1003-personal");
  
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

  const goBack = () => {
    navigate(-1);
  };

  const renderContent = () => {
    // First, determine the main tab
    const mainTab = activeTab.includes("-") ? activeTab.split("-")[0] : activeTab;
    const subSection = activeTab.includes("-") ? activeTab.split("-")[1] : null;
    
    switch(mainTab) {
      case "1003":
        if (subSection) {
          return render1003Section(subSection);
        }
        return render1003Section("personal"); // Default to personal info
        
      case "products":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Products and Pricing</h2>
            <p className="text-gray-600">
              View available loan products and pricing options.
            </p>
          </div>
        );
      case "processor":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Processor Assist</h2>
            <p className="text-gray-600">
              Get assistance with loan processing tasks.
            </p>
          </div>
        );
      case "pitchDeck":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Pitch Deck Pro</h2>
            <p className="text-gray-600">
              Create and manage presentation materials for this loan.
            </p>
          </div>
        );
      case "aiLoanOfficer":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">AI Loan Officer</h2>
            <p className="text-gray-600">
              Get AI assistance with loan officer tasks.
            </p>
          </div>
        );
      case "fees":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Fees</h2>
            <p className="text-gray-600">
              View and manage loan fees.
            </p>
          </div>
        );
      case "documents":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Document Manager</h2>
            <p className="text-gray-600">
              Manage loan documents and paperwork.
            </p>
          </div>
        );
      case "conditions":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Conditions</h2>
            <p className="text-gray-600">
              View and manage loan conditions.
            </p>
          </div>
        );
      case "withdraw":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Withdraw / Cancel Loan</h2>
            <p className="text-gray-600">
              Options to withdraw or cancel this loan application.
            </p>
          </div>
        );
      default:
        return <div className="p-6">Select an option from the sidebar</div>;
    }
  };

  // Helper function to render the appropriate 1003 section
  const render1003Section = (section: string) => {
    const sectionTitles = {
      personal: "Personal Information",
      employment: "Employment & Income",
      assets: "Assets",
      liabilities: "Liabilities",
      realEstate: "Real Estate Owned",
      loanInfo: "Loan Information",
      housing: "Housing Expenses",
      transaction: "Details of Transaction",
      declarations: "Declarations",
      government: "Government Monitoring"
    };
    
    const title = sectionTitles[section as keyof typeof sectionTitles] || "Loan Application";
    
    return (
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-4">1003: {title}</h2>
        <p className="text-gray-600 mb-4">
          {getDescription(section)}
        </p>
        
        {/* Placeholder for actual form sections - would be replaced with actual form components */}
        <div className="mt-4 p-4 border rounded-md bg-gray-50">
          {section === "personal" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">First Name</p>
                  <p>{loanApplication?.firstName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Last Name</p>
                  <p>{loanApplication?.lastName || 'Not provided'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Property Address</p>
                <p>{loanApplication?.propertyAddress || 'Not provided'}</p>
              </div>
            </div>
          )}
          
          {section !== "personal" && (
            <p className="text-gray-500 italic">
              This section has not been implemented yet. It will contain fields for {title.toLowerCase()}.
            </p>
          )}
        </div>
      </div>
    );
  };

  // Helper function to get descriptions for each section
  const getDescription = (section: string): string => {
    switch(section) {
      case "personal":
        return "Basic information about the borrower including name, address, and contact details.";
      case "employment":
        return "Information about current and previous employment, income sources, and verification.";
      case "assets":
        return "Details about financial assets including bank accounts, investments, and other holdings.";
      case "liabilities":
        return "Information about existing debts and financial obligations.";
      case "realEstate":
        return "Details about properties currently owned by the borrower.";
      case "loanInfo":
        return "Specific information about the loan being requested.";
      case "housing":
        return "Current housing expenses and projected expenses after the loan.";
      case "transaction":
        return "Breakdown of the purchase transaction including costs and sources of funds.";
      case "declarations":
        return "Legal declarations required for mortgage applications.";
      case "government":
        return "Government-required monitoring information for fair lending purposes.";
      default:
        return "Complete the form to continue with your loan application.";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple" />
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
          Back
        </Button>
      </div>

      {/* Loan Progress Tracker */}
      <LoanProgressTracker currentStep={loanApplication.currentStep || "applicationCreated"} />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <LoanApplicationSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-auto bg-white border-l">
          <div className="p-6 border-b bg-gray-50">
            <h1 className="text-2xl font-bold text-mortgage-darkPurple">
              Loan Application: {loanApplication.loanId}
            </h1>
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <span className="px-2 py-1 rounded-full bg-mortgage-lightPurple text-mortgage-darkPurple text-xs font-medium mr-2">
                {loanApplication.loanStatus}
              </span>
              <span>{loanApplication.firstName} {loanApplication.lastName} • {loanApplication.propertyAddress}</span>
            </div>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default LoanApplicationViewer;
