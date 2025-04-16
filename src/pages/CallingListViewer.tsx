import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Users, Phone, Search, Loader2, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import LeadSelectionPanel from "@/components/power-dialer/LeadSelectionPanel";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone1: string;
  email: string;
}

interface CallingList {
  id: string;
  name: string;
  leadCount: number;
  createdAt: string;
}

const CallingListViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [list, setList] = useState<CallingList | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [showLeadSelector, setShowLeadSelector] = useState(false);
  
  useEffect(() => {
    if (id) {
      fetchListDetails();
      fetchListLeads();
    }
  }, [id]);
  
  const fetchListDetails = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-calling-list', {
        body: { id }
      });
      
      if (error) {
        console.error("Error fetching calling list:", error);
        toast.error("Failed to load calling list details");
        return;
      }
      
      if (data) {
        setList(data);
      }
    } catch (error) {
      console.error("Error in fetchListDetails:", error);
      toast.error("Failed to load calling list details");
    }
  };
  
  const fetchListLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-calling-list-leads', {
        body: { listId: id }
      });
      
      if (error) {
        console.error("Error fetching calling list leads:", error);
        toast.error("Failed to load leads");
        return;
      }
      
      if (data && Array.isArray(data)) {
        setLeads(data);
      }
    } catch (error) {
      console.error("Error in fetchListLeads:", error);
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLeadsSelected = async (selectedLeads: Lead[]) => {
    try {
      const { error } = await supabase.functions.invoke('add-leads-to-calling-list', {
        body: { 
          listId: id,
          leadIds: selectedLeads.map(lead => lead.id) 
        }
      });
      
      if (error) {
        console.error("Error adding leads to calling list:", error);
        toast.error("Failed to add leads");
        return;
      }
      
      setShowLeadSelector(false);
      fetchListLeads();
      fetchListDetails();
    } catch (error) {
      console.error("Error in handleLeadsSelected:", error);
      toast.error("Failed to add leads");
    }
  };
  
  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    
    const fullName = `${lead.firstName} ${lead.lastName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return fullName.includes(searchLower) || 
           lead.email.toLowerCase().includes(searchLower) || 
           lead.phone1.includes(searchTerm);
  });
  
  return (
    <MainLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/people')}
          className="rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isLoading ? 'Loading...' : list?.name || 'Calling List'}
        </h1>
      </div>
      
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {list && (
              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                <Users className="h-3 w-3 mr-1" />
                {list.leadCount} Leads
              </Badge>
            )}
            <p className="text-sm text-gray-500">
              Created {list && new Date(list.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          <Button
            onClick={() => setShowLeadSelector(!showLeadSelector)}
            className="bg-mortgage-purple hover:bg-mortgage-purple/80 text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Leads
          </Button>
        </div>
        
        {showLeadSelector && (
          <div className="border rounded-lg p-4 mb-4">
            <h2 className="text-lg font-medium mb-4">Select Leads to Add</h2>
            <LeadSelectionPanel 
              listId={id || ''} 
              onLeadsSelected={handleLeadsSelected} 
            />
          </div>
        )}
        
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple" />
          </div>
        ) : filteredLeads.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-420px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
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
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-gray-300"
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="py-20 text-center text-gray-500">
            <p>No leads in this list yet. Click "Add Leads" to get started.</p>
          </div>
        )}
        
        {selectedLeads.size > 0 && (
          <div className="border-t mt-4 pt-4 flex justify-between items-center">
            <p>{selectedLeads.size} leads selected</p>
            <Button 
              className="bg-crm-blue hover:bg-crm-blue/90 text-white"
              onClick={() => {
                toast.info("Calling feature will be implemented soon");
              }}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Selected ({selectedLeads.size})
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CallingListViewer;
