
import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  PlusCircle, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from "lucide-react";
import { mortgageDealService, MortgageDeal } from "@/services/mortgageDealService";
import { format } from "date-fns";
import { toast } from "sonner";
import { useIndustry } from "@/context/IndustryContext";

const Deals = () => {
  const { activeIndustry } = useIndustry();
  const [deals, setDeals] = useState<MortgageDeal[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const mortgageDeals = await mortgageDealService.getAllDeals();
      setDeals(mortgageDeals);
    } catch (error) {
      console.error("Error fetching deals:", error);
      toast.error("Failed to load deals");
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const totalPipeline = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const activeDealsCount = deals.length;
  
  // This Month's deals (simplified for demo)
  const thisMonthDeals = deals.filter(deal => {
    const dealDate = new Date(deal.created_at);
    const now = new Date();
    return dealDate.getMonth() === now.getMonth() && 
           dealDate.getFullYear() === now.getFullYear();
  });
  
  const thisMonthValue = thisMonthDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const thisMonthCount = thisMonthDeals.length;

  // Last Month's deals (simplified for demo)
  const lastMonthDeals = deals.filter(deal => {
    const dealDate = new Date(deal.created_at);
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return dealDate.getMonth() === lastMonth && dealDate.getFullYear() === lastMonthYear;
  });
  
  const lastMonthValue = lastMonthDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const lastMonthCount = lastMonthDeals.length;

  // YTD deals
  const ytdDeals = deals.filter(deal => {
    const dealDate = new Date(deal.created_at);
    const now = new Date();
    return dealDate.getFullYear() === now.getFullYear();
  });
  
  const ytdValue = ytdDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const ytdCount = ytdDeals.length;

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Deals</h1>
        <div className="flex gap-2">
          <Button 
            variant="refresh" 
            size="icon" 
            onClick={fetchDeals} 
            disabled={loading}
            title="Refresh deals"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-crm-blue hover:bg-crm-blue/90">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-md border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">Total Pipeline</div>
            <div className="text-2xl font-bold mt-2">${totalPipeline.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">{activeDealsCount} active deals</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">This Month</div>
            <div className="text-2xl font-bold mt-2">${thisMonthValue.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">{thisMonthCount} deals</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">Last Month</div>
            <div className="text-2xl font-bold mt-2">${lastMonthValue.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">{lastMonthCount} deals</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">YTD</div>
            <div className="text-2xl font-bold mt-2">${ytdValue.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">{ytdCount} deals</div>
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
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No deals found. Use the "Push to Pipeline" button on a lead profile to create a deal.</p>
            </div>
          ) : (
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
                  <tr key={deal.id} className="table-row">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-crm-blue">
                      {deal.property_address ? 
                        `${deal.property_address.split(',')[0]} Mortgage` : 
                        `${deal.first_name} ${deal.last_name} Mortgage`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {deal.first_name} {deal.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{(deal.value || 0).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-crm-lightBlue text-crm-blue">
                        {deal.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {deal.closing_date ? format(new Date(deal.closing_date), 'MMM dd, yyyy') : 'Not set'}
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
                        {deal.probability >= 50 ? (
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
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Deals;
