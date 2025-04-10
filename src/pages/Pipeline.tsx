
import React, { useEffect, useState } from "react";
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
import { thoughtlyService } from "@/services/thoughtly";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface MortgageLead {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone1?: string;
  propertyAddress?: string;
  disposition?: string;
  createdAt?: string;
  addedToPipelineAt?: string;
  mortgageData?: Record<string, any>;
}

const Pipeline = () => {
  const { activeIndustry } = useIndustry();
  const [loading, setLoading] = useState(true);
  const [mortgageLeads, setMortgageLeads] = useState<MortgageLead[]>([]);
  const [stats, setStats] = useState({
    totalValue: 0,
    totalLeads: 0,
    thisMonth: 0,
    thisMonthCount: 0,
    lastMonth: 0,
    lastMonthCount: 0,
    ytd: 0,
    ytdCount: 0
  });

  useEffect(() => {
    const fetchMortgageLeads = async () => {
      setLoading(true);
      try {
        // Only fetch mortgage leads when in the mortgage industry
        if (activeIndustry === "mortgage") {
          const response = await thoughtlyService.retrieveLeads({ leadType: "mortgage" });
          console.log("Mortgage leads retrieved:", response);
          setMortgageLeads(response.data || []);
          
          // Calculate statistics
          calculateStatistics(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching mortgage leads:", error);
        toast.error("Failed to load mortgage pipeline data");
      } finally {
        setLoading(false);
      }
    };

    fetchMortgageLeads();
  }, [activeIndustry]);

  // Calculate statistics from the leads
  const calculateStatistics = (leads: MortgageLead[]) => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    let totalValue = 0;
    let thisMonthValue = 0;
    let thisMonthCount = 0;
    let lastMonthValue = 0;
    let lastMonthCount = 0;
    let ytdValue = 0;
    let ytdCount = 0;

    leads.forEach(lead => {
      // Get loan amount from mortgage data if available
      const loanAmount = lead.mortgageData?.property?.loanAmount 
        ? parseFloat(lead.mortgageData.property.loanAmount.replace(/[^0-9.]/g, ''))
        : 0;
      
      // If no loan amount, use a default estimate
      const value = loanAmount || 250000;
      totalValue += value;
      
      if (lead.addedToPipelineAt) {
        const addedDate = new Date(lead.addedToPipelineAt);
        const month = addedDate.getMonth();
        const year = addedDate.getFullYear();
        
        // This month stats
        if (month === thisMonth && year === thisYear) {
          thisMonthValue += value;
          thisMonthCount++;
        }
        
        // Last month stats
        if ((month === thisMonth - 1 || (thisMonth === 0 && month === 11)) && 
            (month === thisMonth - 1 ? year === thisYear : year === thisYear - 1)) {
          lastMonthValue += value;
          lastMonthCount++;
        }
        
        // Year-to-date stats
        if (year === thisYear) {
          ytdValue += value;
          ytdCount++;
        }
      }
    });
    
    setStats({
      totalValue,
      totalLeads: leads.length,
      thisMonth: thisMonthValue,
      thisMonthCount,
      lastMonth: lastMonthValue,
      lastMonthCount,
      ytd: ytdValue,
      ytdCount
    });
  };

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Calculate stage color
  const getStageColor = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  // Get loan amount from mortgage data
  const getLoanAmount = (lead: MortgageLead) => {
    if (lead.mortgageData?.property?.loanAmount) {
      return parseFloat(lead.mortgageData.property.loanAmount.replace(/[^0-9.]/g, ''));
    }
    return 250000; // Default value if not specified
  };

  // Get stage from mortgage data or default to "Active"
  const getStage = (lead: MortgageLead) => {
    return lead.mortgageData?.loan?.status || "Active";
  };

  // Get probability based on disposition
  const getProbability = (lead: MortgageLead) => {
    switch (lead.disposition) {
      case 'Submitted':
        return 80;
      case 'Appointment Set':
        return 60;
      case 'Contacted':
        return 40;
      case 'Not Contacted':
        return 20;
      default:
        return 50;
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (activeIndustry !== "mortgage") {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
          <h2 className="text-2xl font-semibold mb-2">Mortgage Pipeline</h2>
          <p className="text-gray-500">
            Pipeline is only available in the mortgage industry mode.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mortgage Pipeline</h1>
        <Button className="bg-green-600 hover:bg-green-700">
          <PlusCircle className="h-4 w-4 mr-2" />
          New Loan Application
        </Button>
      </div>

      <div className="bg-white p-4 rounded-md border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">Pipeline Value</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.totalValue)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.totalLeads} active applications</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">This Month</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.thisMonth)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.thisMonthCount} new applications</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">Last Month</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.lastMonth)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.lastMonthCount} applications</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">YTD</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.ytd)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.ytdCount} applications</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold">Active Loan Applications</h2>
          <Button variant="outline" size="sm">
            View <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : mortgageLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Borrower
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Property
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Loan Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Added Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mortgageLeads.map((lead) => (
                  <tr key={lead.id} className="table-row">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      <Link to={`/leads/${lead.id}`}>
                        {lead.firstName} {lead.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.propertyAddress || 'No address provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="font-medium ml-1">{formatCurrency(getLoanAmount(lead))}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(getStage(lead))}`}>
                        {getStage(lead)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(lead.addedToPipelineAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${getProbability(lead)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-700">{getProbability(lead)}%</span>
                        {getProbability(lead) >= 50 ? (
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
        ) : (
          <div className="flex flex-col items-center justify-center p-10">
            <p className="text-gray-500 mb-4">No mortgage leads in your pipeline yet.</p>
            <p className="text-sm text-gray-400">
              Add leads to your pipeline by clicking the "Push to Pipeline" button on a lead profile.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Pipeline;
