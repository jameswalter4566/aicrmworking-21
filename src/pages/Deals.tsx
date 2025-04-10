import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
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

interface Deal {
  id: number;
  name: string;
  client: string;
  value: number;
  stage: string;
  closingDate: string;
  probability: number;
  trend: "up" | "down";
}

const Deals = () => {
  const { activeIndustry } = useIndustry();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const buttonColor = activeIndustry === 'mortgage' ? 'bg-[#9b87f5] hover:bg-[#7E69AB]' : 'bg-crm-blue hover:bg-crm-blue/90';
  const [stats, setStats] = useState({
    totalPipeline: 0,
    thisMonth: 0,
    lastMonth: 0,
    ytd: 0,
    activeCount: 0,
    thisMonthCount: 0,
    lastMonthCount: 0,
    ytdCount: 0
  });
  
  useEffect(() => {
    if (activeIndustry === 'mortgage') {
      navigate('/pipeline');
      return;
    }
    
    fetchDeals();
  }, [activeIndustry, navigate]);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const defaultDeals: Deal[] = [
        {
          id: 1,
          name: "123 Main St. Listing",
          client: "Dan Corkill",
          value: 450000,
          stage: "Contract",
          closingDate: "Apr 15, 2025",
          probability: 80,
          trend: "up",
        },
        {
          id: 2,
          name: "Highland Acres Property",
          client: "Sarah Johnson",
          value: 650000,
          stage: "Negotiation",
          closingDate: "May 3, 2025",
          probability: 60,
          trend: "down",
        },
        {
          id: 3,
          name: "Downtown Condo Purchase",
          client: "Robert Smith",
          value: 300000,
          stage: "Proposal",
          closingDate: "Apr 28, 2025",
          probability: 40,
          trend: "up",
        },
      ];

      setDeals(defaultDeals);
      calculateStats(defaultDeals);
    } catch (error) {
      console.error("Error fetching deals:", error);
      toast.error("Failed to load deals");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (dealsData: Deal[]) => {
    const totalPipeline = dealsData.reduce((sum, deal) => sum + deal.value, 0);
    
    setStats({
      totalPipeline,
      thisMonth: 0,
      lastMonth: 350000,
      ytd: 1250000,
      activeCount: dealsData.length,
      thisMonthCount: 0,
      lastMonthCount: 1,
      ytdCount: 4
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleDealClick = (deal: Deal) => {
    if (activeIndustry === 'mortgage') {
      navigate(`/loan-application/${deal.id}`);
    } else {
      toast.info("Deal details view coming soon");
    }
  };

  const handleNewDeal = () => {
    toast.success("Creating new deal");
    // navigate("/new-deal");
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Deals</h1>
        <Button className={buttonColor} onClick={handleNewDeal}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Deal
        </Button>
      </div>

      <div className="bg-white p-4 rounded-md border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">Total Pipeline</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.totalPipeline)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.activeCount} active deals</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">This Month</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.thisMonth)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.thisMonthCount} closed deals</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">Last Month</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.lastMonth)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.lastMonthCount} closed deal</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">YTD</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.ytd)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.ytdCount} closed deals</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold">Active Deals</h2>
          <Button variant="outline" size="sm">
            View <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-crm-blue" />
          </div>
        ) : deals.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            <p>No deals found</p>
            <p className="mt-2 text-sm">Add deals to your pipeline to see them here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Deal Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Client
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stage
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Closing Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Probability
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deals.map((deal) => (
                  <tr 
                    key={deal.id} 
                    className="table-row hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleDealClick(deal)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-crm-blue">
                      {deal.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {deal.client}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{formatCurrency(deal.value)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-crm-lightBlue text-crm-blue">
                        {deal.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {deal.closingDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-crm-blue h-2 rounded-full" 
                            style={{ width: `${deal.probability}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-700">{deal.probability}%</span>
                        {deal.trend === "up" ? (
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

export default Deals;
