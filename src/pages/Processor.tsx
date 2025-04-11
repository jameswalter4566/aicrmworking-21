
import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { 
  Building, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Brain
} from "lucide-react";
import { useIndustry } from "@/context/IndustryContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProcessorDeal {
  id: number;
  client: string;
  propertyAddress: string;
  value: number;
  status: string;
  listedDate: string;
  probability: number;
  trend: "up" | "down";
  loanStatus?: string;
  loanId?: string;
}

const Processor = () => {
  const { activeIndustry } = useIndustry();
  const [deals, setDeals] = useState<ProcessorDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeApplications: 0,
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
        console.error("Error fetching mortgage leads:", error);
        toast.error("Failed to load mortgage applications");
        setLoading(false);
        return;
      }

      if (!data.success) {
        console.error("API returned error:", data.error);
        toast.error(data.error || "Failed to load mortgage applications");
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
            client: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
            propertyAddress: lead.propertyAddress || 'No address provided',
            value: loanAmount,
            status: lead.mortgageData?.loan?.status || "Processing",
            listedDate: new Date(lead.addedToPipelineAt || lead.updatedAt || lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            probability: lead.mortgageData?.loan?.probability || 80,
            trend: "up",
            loanStatus: lead.mortgageData?.loan?.status || "Processing",
            loanId: lead.mortgageData?.loan?.loanNumber || `ML-${lead.id}`
          };
        });

      setDeals(mortgageDeals);
      
      const totalValue = mortgageDeals.reduce((sum, lead) => sum + lead.value, 0);
      
      let thisMonthValue = 0;
      let thisMonthCount = 0;
      let lastMonthValue = 0;
      let lastMonthCount = 0;
      let ytdValue = 0;
      let ytdCount = 0;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      mortgageDeals.forEach(lead => {
        const leadDate = new Date(lead.listedDate);
        const leadMonth = leadDate.getMonth();
        const leadYear = leadDate.getFullYear();
        
        if (leadMonth === currentMonth && leadYear === currentYear) {
          thisMonthValue += lead.value;
          thisMonthCount++;
        }
        
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        
        if (leadMonth === lastMonth && leadYear === lastMonthYear) {
          lastMonthValue += lead.value;
          lastMonthCount++;
        }
        
        if (leadYear === currentYear) {
          ytdValue += lead.value;
          ytdCount++;
        }
      });
      
      setStats({
        activeApplications: totalValue,
        thisMonth: thisMonthValue,
        lastMonth: lastMonthValue,
        ytd: ytdValue,
        activeCount: mortgageDeals.length,
        thisMonthCount: thisMonthCount,
        lastMonthCount: lastMonthCount,
        ytdCount: ytdCount
      });
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

  const handleDealClick = (deal: ProcessorDeal) => {
    navigate(`/loan-application/${deal.id}`);
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Brain className="h-6 w-6 mr-2 text-mortgage-purple" />
          <h1 className="text-2xl font-bold">Processor Assistant</h1>
        </div>
        <Button 
          className="bg-mortgage-purple hover:bg-mortgage-darkPurple text-white"
          onClick={() => navigate('/mortgage-application')}
        >
          View Tasks
        </Button>
      </div>

      <div className="bg-white p-4 rounded-md border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">Active Applications</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.activeApplications)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.activeCount} applications</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">This Month</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.thisMonth)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.thisMonthCount} processed</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">Last Month</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.lastMonth)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.lastMonthCount} processed</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">YTD</div>
            <div className="text-2xl font-bold mt-2">{formatCurrency(stats.ytd)}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.ytdCount} processed</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold">Mortgage Applications in Processing</h2>
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
            <p>No mortgage applications found in pipeline</p>
            <p className="mt-2 text-sm">Add mortgage applications to your pipeline to see them here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Property Address</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Loan Status</TableHead>
                  <TableHead>Loan ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow 
                    key={deal.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleDealClick(deal)}
                  >
                    <TableCell className="font-medium text-mortgage-purple">
                      {deal.client}
                    </TableCell>
                    <TableCell className="text-sm">
                      {deal.propertyAddress}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="font-medium">{formatCurrency(deal.value)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-mortgage-lightPurple text-mortgage-darkPurple">
                        {deal.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {deal.listedDate}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-mortgage-lightPurple text-mortgage-darkPurple">
                          {deal.loanStatus}
                        </span>
                        {deal.trend === "up" ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500 ml-1" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500 ml-1" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {deal.loanId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Processor;
