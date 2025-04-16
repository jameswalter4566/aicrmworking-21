
import React, { useState, useEffect } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Search, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_leads');
      
      if (error) {
        console.error('Error fetching leads:', error);
        toast.error('Failed to load leads');
        return;
      }

      // Fixed: properly handling the response data which is an array
      setLeads(data || []);
    } catch (error) {
      console.error('Error in fetchLeads:', error);
      toast.error('Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSelection = () => {
    const selectedLeadsArray = leads.filter(lead => selectedLeads.has(lead.id));
    onLeadsSelected(selectedLeadsArray);
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    
    const fullName = `${lead.firstName} ${lead.lastName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return fullName.includes(searchLower) || 
           lead.email?.toLowerCase().includes(searchLower) || 
           lead.phone1?.includes(searchTerm);
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search leads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple" />
        </div>
      ) : (
        <>
          <ScrollArea className="h-[300px] border rounded-lg">
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
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.has(lead.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedLeads);
                          if (checked) {
                            newSelected.add(lead.id);
                          } else {
                            newSelected.delete(lead.id);
                          }
                          setSelectedLeads(newSelected);
                        }}
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

          {selectedLeads.size > 0 && (
            <div className="flex justify-between items-center pt-4">
              <p className="text-sm text-gray-500">
                {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected
              </p>
              <Button
                onClick={handleSaveSelection}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save to Calling List
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeadSelectionPanel;
