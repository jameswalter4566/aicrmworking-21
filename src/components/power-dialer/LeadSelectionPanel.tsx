
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone1: string;
  email: string;
}

interface LeadSelectionPanelProps {
  onLeadsSelected: (leads: Lead[]) => void;
}

const LeadSelectionPanel: React.FC<LeadSelectionPanelProps> = ({ onLeadsSelected }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  
  const LEADS_PER_PAGE = 50;

  useEffect(() => {
    fetchLeads();
  }, [currentPage]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data: fetchedData } = await supabase.functions.invoke('retrieve-leads', {
        body: {
          page: currentPage,
          pageSize: LEADS_PER_PAGE
        }
      });
      
      if (fetchedData?.data) {
        setLeads(fetchedData.data);
        setTotalLeads(fetchedData.metadata?.totalLeadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(lead => lead.id)));
    }
  };

  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleConfirmSelection = () => {
    const selectedLeadsList = leads.filter(lead => selectedLeads.has(lead.id));
    onLeadsSelected(selectedLeadsList);
  };

  const maxPages = Math.ceil(totalLeads / LEADS_PER_PAGE);
  const isPrevDisabled = currentPage === 0;
  const isNextDisabled = currentPage >= maxPages - 1;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Button 
          onClick={handleSelectAll}
          variant="outline"
        >
          {selectedLeads.size === leads.length ? 'Deselect All' : 'Select All'}
        </Button>
        
        <span className="text-sm text-gray-500">
          {selectedLeads.size} leads selected
        </span>
      </div>

      <ScrollArea className="h-[calc(100vh-450px)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedLeads.has(lead.id)}
                    onCheckedChange={() => handleSelectLead(lead.id)}
                  />
                </TableCell>
                <TableCell>{`${lead.firstName} ${lead.lastName}`}</TableCell>
                <TableCell>{lead.phone1}</TableCell>
                <TableCell>{lead.email}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      <div className="sticky bottom-0 bg-white py-4 border-t">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={isPrevDisabled}
                className="gap-1 pl-2.5"
                aria-label="Go to previous page"
              >
                <span>Previous</span>
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span className="px-4">
                Page {currentPage + 1} of {maxPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(maxPages - 1, p + 1))}
                disabled={isNextDisabled}
                className="gap-1 pr-2.5"
                aria-label="Go to next page"
              >
                <span>Next</span>
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};

export default LeadSelectionPanel;
