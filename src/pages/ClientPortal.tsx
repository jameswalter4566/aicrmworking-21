import React, { useState, useEffect } from "react";
import ClientPortalSidebar from "@/components/mortgage/ClientPortalSidebar";
import { ClientPortalContent } from "@/components/mortgage/ClientPortalContent";
import { Card } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface LoanData {
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  monthlyPayment: number;
  savingsPerMonth: number;
  currentMonthlyPayment: number;
}

function HomeTab({ clientData }: { clientData: LoanData }) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="p-6 bg-sky-400 bg-opacity-30 rounded-xl shadow-lg">
          <h3 className="font-medium text-white mb-4">New Loan Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-white">
              <span className="text-gray-200">Loan Amount:</span>
              <span className="font-medium">${clientData.loanAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-white">
              <span className="text-gray-200">Interest Rate:</span>
              <span className="font-medium">{clientData.interestRate}%</span>
            </div>
            <div className="flex justify-between text-white">
              <span className="text-gray-200">Term:</span>
              <span className="font-medium">{clientData.loanTerm} years</span>
            </div>
            <div className="flex justify-between text-white">
              <span className="text-gray-200">Monthly Payment:</span>
              <span className="font-medium">${clientData.monthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-green-600 bg-opacity-80 rounded-xl shadow-lg">
          <h3 className="font-medium text-white mb-4">Your Savings</h3>
          <div className="text-center">
            <div className="mb-2">
              <div className="text-gray-100 mb-1">Monthly Savings</div>
              <div className="text-3xl font-bold text-white">
                ${clientData.savingsPerMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
            </div>
            <div className="text-sm text-gray-100">
              (${(clientData.savingsPerMonth * 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} per year)
            </div>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <div className="p-4">
          <h3 className="font-medium mb-3">Recent Alerts</h3>
          <Alert>
            <AlertTitle>New Document Required</AlertTitle>
            <AlertDescription>
              Please upload your most recent bank statement.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    </div>
  );
}

function ConditionsTab({ leadId }: { leadId: string | number }) {
  return <div>Conditions Content</div>;
}

function AttentionTab() {
  return <div>Attention Items Content</div>;
}

function SupportTab() {
  return <div>Support Content</div>;
}

const ClientPortal = () => {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState("home");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<number | null>(null);
  const [clientData, setClientData] = useState<LoanData>({
    loanAmount: 320000,
    interestRate: 4.5,
    loanTerm: 30,
    monthlyPayment: 1621.39,
    savingsPerMonth: 478.61,
    currentMonthlyPayment: 2100.00
  });

  useEffect(() => {
    const fetchClientPortal = async () => {
      if (!slug) {
        setError("No portal access key provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('client_portal_access')
          .select('lead_id, created_by')
          .eq('access_key', slug)
          .single();

        if (error) {
          console.error("Error fetching client portal:", error);
          setError("Invalid portal access key");
          setLoading(false);
          return;
        }

        if (data) {
          setLeadId(data.lead_id);
          
          // Here we would normally fetch the real loan data based on the lead ID
          // For now, we're using the static data defined in state
          
          setLoading(false);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    fetchClientPortal();
  }, [slug]);

  const renderActiveTab = () => {
    if (loading) {
      return <div className="flex justify-center p-8">Loading...</div>;
    }

    if (error) {
      return (
        <div className="p-8">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      );
    }

    if (!leadId) {
      return (
        <div className="p-8">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Lead not found</AlertDescription>
          </Alert>
        </div>
      );
    }

    switch (activeTab) {
      case "home":
        return <HomeTab clientData={clientData} />;
      case "conditions":
        return <ConditionsTab leadId={leadId} />;
      case "attention":
        return <AttentionTab />;
      case "support":
        return <SupportTab />;
      default:
        return <HomeTab clientData={clientData} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <ClientPortalSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        urgentCount={2}
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;
