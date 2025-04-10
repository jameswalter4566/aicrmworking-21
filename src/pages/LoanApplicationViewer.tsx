
import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import MainLayout from "@/components/layouts/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoanApplicationSidebar from "@/components/mortgage/LoanApplicationSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
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
}

const LoanApplicationViewer = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [loanApplication, setLoanApplication] = useState<LoanApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("1003");
  
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

      setLoanApplication({
        id: lead.id,
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        propertyAddress: lead.propertyAddress || 'No address provided',
        loanAmount: loanAmount,
        loanStatus: lead.mortgageData?.loan?.status || "Processing",
        loanId: lead.mortgageData?.loan?.loanNumber || `ML-${lead.id}`,
        mortgageData: lead.mortgageData || {}
      });
    } catch (error) {
      console.error("Error in fetchLoanApplicationData:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case "1003":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">1003 Loan Application</h2>
            <p className="text-gray-600">
              Form 1003 is the standard form used by borrowers to apply for a mortgage loan.
            </p>
            {/* Placeholder for actual 1003 form component */}
            <div className="mt-4 p-4 border rounded-md bg-gray-50">
              <p>Borrower: {loanApplication?.firstName} {loanApplication?.lastName}</p>
              <p>Property Address: {loanApplication?.propertyAddress}</p>
              <p>Loan Amount: ${loanApplication?.loanAmount.toLocaleString()}</p>
            </div>
          </div>
        );
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[calc(100vh-100px)]">
          <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple" />
        </div>
      </MainLayout>
    );
  }

  if (!loanApplication) {
    return (
      <MainLayout>
        <div className="text-center p-6">
          <h2 className="text-2xl font-bold text-gray-700">Loan application not found</h2>
          <p className="mt-2 text-gray-500">The requested loan application could not be found.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-100px)]">
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
    </MainLayout>
  );
};

export default LoanApplicationViewer;
