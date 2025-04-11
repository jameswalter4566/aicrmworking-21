
import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { 
  Building, 
  ChevronDown,
  Loader2
} from "lucide-react";
import { useIndustry } from "@/context/IndustryContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface MortgageDeal {
  id: number;
  firstName: string;
  lastName: string;
  propertyAddress: string;
  value: number;
  stage: string;
  listedDate: string;
  loanStatus: string;
  loanId: string;
  client: string;
}

const ProcessorAssist = () => {
  const { activeIndustry } = useIndustry();
  const [deals, setDeals] = useState<MortgageDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeIndustry === 'mortgage') {
      fetchMortgageDeals();
    } else {
      navigate('/deals');
    }
  }, [activeIndustry, navigate]);

  const fetchMortgageDeals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('retrieve-leads', {
        body: { 
          source: 'all',
          industryFilter: 'mortgage'
        }
      });

      if (error) {
        console.error("Error fetching mortgage deals:", error);
        toast.error("Failed to load mortgage deals");
        setLoading(false);
        return;
      }

      if (!data.success) {
        console.error("API returned error:", data.error);
        toast.error(data.error || "Failed to load mortgage deals");
        setLoading(false);
        return;
      }

      const mortgageDeals = data.data
        .filter((lead: any) => lead.isMortgageLead)
        .map((lead: any) => {
          const loanAmountStr = lead.mortgageData?.property?.loanAmount || '0';
          const loanAmount = parseFloat(loanAmountStr.replace(/,/g, '')) || 0;

          return {
            id: lead.id,
            firstName: lead.firstName || '',
            lastName: lead.lastName || '',
            propertyAddress: lead.propertyAddress || 'No address provided',
            value: loanAmount,
            stage: lead.mortgageData?.loan?.status || "Processing",
            listedDate: new Date(lead.addedToPipelineAt || lead.updatedAt || lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            client: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
            loanStatus: lead.mortgageData?.loan?.status || "Processing",
            loanId: lead.mortgageData?.loan?.loanNumber || `ML-${lead.id}`
          };
        });

      console.log("Processed mortgage deals for processor:", mortgageDeals);
      setDeals(mortgageDeals);
    } catch (error) {
      console.error("Error in fetchMortgageDeals:", error);
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

  const handleDealClick = (deal: MortgageDeal) => {
    // Navigate to the ProcessorAssistViewer instead of LoanApplicationViewer
    navigate(`/processor-assist/${deal.id}`);
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Processor Assist</h1>
        <Button 
          className="bg-mortgage-purple hover:bg-mortgage-darkPurple text-white"
          onClick={() => navigate('/loan-application/new')}
        >
          Process New Application
        </Button>
      </div>

      <div className="bg-white rounded-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold">Active Loan Applications</h2>
          <Button variant="outline" size="sm">
            View <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple" />
          </div>
        ) : deals.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            <p>No active loan applications found</p>
            <p className="mt-2 text-sm">Applications in processing will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Client Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Property Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Loan Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date Added
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Loan Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Loan ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deals.map((deal) => (
                  <tr 
                    key={deal.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleDealClick(deal)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-mortgage-purple">
                      {deal.client}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {deal.propertyAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium">{formatCurrency(deal.value)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-mortgage-lightPurple text-mortgage-darkPurple">
                        {deal.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {deal.listedDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-mortgage-lightPurple text-mortgage-darkPurple">
                        {deal.loanStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {deal.loanId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProcessorAssist;
