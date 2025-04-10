
import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { 
  Building, 
  PlusCircle, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import { useIndustry } from "@/context/IndustryContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface MortgageLead {
  id: number;
  firstName: string;
  lastName: string;
  propertyAddress: string;
  value: number;
  stage: string;
  listedDate: string;
  probability: number;
  trend: "up" | "down";
  isMortgageLead?: boolean;
  client: string;
}

const Pipeline = () => {
  const { activeIndustry } = useIndustry();
  const [listings, setListings] = useState<MortgageLead[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeListings: 0,
    thisMonth: 0,
    lastMonth: 0,
    ytd: 0,
    activeCount: 0,
    thisMonthCount: 0,
    lastMonthCount: 0,
    ytdCount: 4
  });

  useEffect(() => {
    // Only fetch mortgage leads if we're in the mortgage industry
    if (activeIndustry === 'mortgage') {
      fetchMortgageLeads();
    }
  }, [activeIndustry]);

  const fetchMortgageLeads = async () => {
    setLoading(true);
    try {
      console.log("Fetching mortgage leads...");
      
      const { data, error } = await supabase.functions.invoke('retrieve-leads', {
        body: { 
          source: 'all',
          industryFilter: 'mortgage'
        }
      });

      if (error) {
        console.error("Error fetching mortgage leads:", error);
        toast.error("Failed to load mortgage leads");
        setLoading(false);
        return;
      }

      if (!data.success) {
        console.error("API returned error:", data.error);
        toast.error(data.error || "Failed to load mortgage leads");
        setLoading(false);
        return;
      }

      console.log("Retrieved leads data:", data);
      
      // Process mortgage leads
      const mortgageLeads = data.data
        .filter((lead: any) => lead.isMortgageLead)
        .map((lead: any) => ({
          id: lead.id,
          firstName: lead.firstName || '',
          lastName: lead.lastName || '',
          propertyAddress: lead.propertyAddress || 'No address provided',
          value: lead.mortgageData?.property?.loanAmount ? 
            parseFloat(lead.mortgageData.property.loanAmount) : 
            0,
          stage: lead.mortgageData?.loan?.status || "Active",
          listedDate: new Date(lead.addedToPipelineAt || lead.updatedAt || lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          probability: lead.mortgageData?.loan?.probability || 80,
          trend: "up",
          client: `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
        }));

      console.log("Processed mortgage leads:", mortgageLeads);
      setListings(mortgageLeads);
      
      // Calculate stats
      const totalValue = mortgageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      
      setStats({
        activeListings: totalValue,
        thisMonth: 0, // You would calculate this based on date filtering
        lastMonth: 350000, // Example value
        ytd: 1250000, // Example value
        activeCount: mortgageLeads.length,
        thisMonthCount: 0,
        lastMonthCount: 1,
        ytdCount: 4
      });
    } catch (error) {
      console.error("Error in fetchMortgageLeads:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Redirect to deals page if not in mortgage industry
  useEffect(() => {
    if (activeIndustry !== 'mortgage') {
      navigate('/deals');
    }
  }, [activeIndustry, navigate]);

  // Formatting function for currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleNewApplication = () => {
    // Navigate to a form for new mortgage application
    navigate('/mortgage-application');
    toast.success("Starting new mortgage application");
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mortgage Pipeline</h1>
        <Button 
          className="bg-mortgage-purple hover:bg-mortgage-darkPurple text-white"
          onClick={handleNewApplication}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New Mortgage Application
        </Button>
      </div>

      <div className="bg-white p-4 rounded-md border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">Active Applications</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.activeListings)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.activeCount} applications</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">This Month</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.thisMonth)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.thisMonthCount} closed applications</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">Last Month</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.lastMonth)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.lastMonthCount} closed application</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">YTD</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.ytd)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.ytdCount} closed applications</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold">Active Mortgage Applications</h2>
          <Button variant="outline" size="sm">
            View <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple" />
          </div>
        ) : listings.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            <p>No mortgage applications found</p>
            <p className="mt-2 text-sm">Add mortgage leads to your pipeline to see them here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Property
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Client
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
                    Probability
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {listings.map((listing) => (
                  <tr key={listing.id} className="table-row">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-mortgage-purple">
                      {listing.propertyAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {listing.client}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{formatCurrency(listing.value)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-mortgage-lightPurple text-mortgage-darkPurple">
                        {listing.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {listing.listedDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-mortgage-purple h-2 rounded-full" 
                            style={{ width: `${listing.probability}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-700">{listing.probability}%</span>
                        {listing.trend === "up" ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500 ml-1" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500 ml-1" />
                        )}
                      </div>
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

export default Pipeline;
