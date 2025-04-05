import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Phone, PhoneCall, PhoneIncoming, PhoneOff, Clock, MessageSquare, User, Bot, Upload, RefreshCw } from "lucide-react";
import Phone2 from "@/components/icons/Phone2";
import Phone3 from "@/components/icons/Phone3";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { twilioService } from "@/services/twilio";
import { thoughtlyService, ThoughtlyContact } from "@/services/thoughtly";
import IntelligentFileUpload from "@/components/IntelligentFileUpload";
import { supabase } from "@/integrations/supabase/client";

const defaultLeads = [
  {
    id: 1,
    firstName: "Dan",
    lastName: "Corkill",
    email: "hi@followupboss.com",
    phone1: "(218) 304-6145",
    phone2: "",
    disposition: "Not Contacted",
    avatar: "",
  },
  {
    id: 2,
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.j@example.com",
    phone1: "(555) 123-4567",
    phone2: "(555) 987-6543",
    disposition: "Contacted",
    avatar: "",
  },
  {
    id: 3,
    firstName: "Robert",
    lastName: "Smith",
    email: "robert@example.com",
    phone1: "(555) 987-6543",
    phone2: "",
    disposition: "Appointment Set",
    avatar: "",
  },
  {
    id: 4,
    firstName: "Maria",
    lastName: "Garcia",
    email: "maria.g@example.com",
    phone1: "(555) 222-3333",
    phone2: "(555) 444-5555",
    disposition: "Not Contacted",
    avatar: "",
  },
  {
    id: 5,
    firstName: "James",
    lastName: "Wilson",
    email: "james.w@example.com",
    phone1: "(555) 666-7777",
    phone2: "",
    disposition: "Not Contacted",
    avatar: "",
  },
];

const mapThoughtlyContactToLead = (contact: any): ThoughtlyContact => {
  let firstName = '', lastName = '';
  if (contact.name) {
    const nameParts = contact.name.split(' ');
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ') || '';
  }

  return {
    id: contact.attributes?.id ? Number(contact.attributes.id) : Date.now(),
    firstName: contact.attributes?.firstName || firstName,
    lastName: contact.attributes?.lastName || lastName,
    email: contact.email || '',
    phone1: contact.phone_number || '',
    phone2: contact.attributes?.phone2 || '',
    disposition: contact.attributes?.disposition || 'Not Contacted',
    avatar: contact.attributes?.avatar || '',
    tags: contact.tags || [],
    countryCode: contact.country_code || 'US'
  };
};

const getDispositionClass = (disposition: string) => {
  switch(disposition) {
    case "Not Contacted":
      return "bg-gray-100 text-gray-800";
    case "Contacted":
      return "bg-blue-100 text-blue-800";
    case "Appointment Set":
      return "bg-purple-100 text-purple-800";
    case "Submitted":
      return "bg-green-100 text-green-800";
    case "Dead":
      return "bg-red-100 text-red-800";
    case "DNC":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const AIDialer = () => {
  const [leads, setLeads] = useState<ThoughtlyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCallId, setActiveCallId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [lineCount, setLineCount] = useState("1");
  const [isDialing, setIsDialing] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [dialQueue, setDialQueue] = useState<number[]>([]);
  const [aiResponses, setAiResponses] = useState<string[]>([
    "Hello, this is AI assistant calling on behalf of SalesPro CRM.",
    "I'm analyzing the lead's information...",
    "I see they're interested in property in the downtown area.",
    "I'll try to schedule a meeting with our agent.",
  ]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [thoughtlyContacts, setThoughtlyContacts] = useState<any[]>([]);
  const [callInProgress, setCallInProgress] = useState(false);
  
  const isAllSelected = leads.length > 0 && selectedLeads.length === leads.length;
  
  const handleSelectAllLeads = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(leads.map(lead => lead.id!).filter(Boolean));
    } else {
      setSelectedLeads([]);
    }
  };
  
  const handleSelectLead = (leadId: number, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };
  
  useEffect(() => {
    fetchLeads();
  }, []);
  
  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const retrievedLeads = await thoughtlyService.retrieveLeads();
      
      if (retrievedLeads && Array.isArray(retrievedLeads) && retrievedLeads.length > 0) {
        setLeads(retrievedLeads);
        console.log("Loaded leads from retrieve-leads function:", retrievedLeads);
      } else {
        console.log("No leads retrieved, using default data");
        setLeads(defaultLeads);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast({
        title: "Error",
        description: "Failed to retrieve contacts. Using sample data instead.",
        variant: "destructive",
      });
      setLeads(defaultLeads);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshLeads = () => {
    toast({
      title: "Refreshing Leads",
      description: "Retrieving the latest leads data...",
    });
    fetchLeads();
  };

  useEffect(() => {
    if (selectedLeads.length === leads.length && selectedLeads.length > 0) {
      setIsImportDialogOpen(true);
    }
  }, [selectedLeads, leads.length]);

  const startDialSession = () => {
    setIsDialogOpen(true);
  };

  const startDialing = async () => {
    const leadsToDial = selectedLeads.length > 0 
      ? leads.filter(lead => selectedLeads.includes(lead.id!)).map(lead => lead.id!)
      : leads.map(lead => lead.id!);
    
    setDialQueue(leadsToDial);
    setIsDialogOpen(false);
    setIsDialing(true);
    setCallInProgress(true);
    
    toast({
      title: "Starting AI Dialing Session",
      description: `Now initializing AI dialing with ${lineCount} line${Number(lineCount) > 1 ? 's' : ''}`,
    });

    try {
      const { data, error } = await supabase.functions.invoke('start-dialing', {
        body: {
          leadIds: leadsToDial,
          interviewId: "interview_demo_123",
          lineCount: parseInt(lineCount)
        }
      });

      if (error) {
        console.error("Error starting dialing session:", error);
        toast({
          title: "Error",
          description: "Failed to start dialing session. Please try again.",
          variant: "destructive"
        });
        setIsDialing(false);
        setCallInProgress(false);
        return;
      }

      console.log("Dialing session started successfully:", data);
      
      if (data.success) {
        if (data.contacts && data.contacts.length > 0) {
          const firstContact = data.contacts[0];
          setActiveCallId(parseInt(firstContact.id));
          
          setAiResponses([
            "AI Dialer initialized successfully",
            `Calling ${firstContact.name || 'lead'} at ${firstContact.phone_number || ''}`,
            "Analyzing lead information...",
            "Conversation in progress..."
          ]);
          
          toast({
            title: "Call Initiated",
            description: `AI is now calling ${firstContact.name || 'lead'}`,
          });
        }
      } else {
        toast({
          title: "Warning",
          description: data.error || "There was an issue starting some calls",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Exception during dialing:", err);
      toast({
        title: "Error",
        description: "There was a problem connecting to the dialing service",
        variant: "destructive"
      });
      setIsDialing(false);
      setCallInProgress(false);
    }
  };

  const endDialingSession = () => {
    setIsDialing(false);
    setActiveCallId(null);
    setDialQueue([]);
    setCallInProgress(false);
    
    toast({
      title: "Session Ended",
      description: "AI dialing session has been terminated",
    });
  };

  const importLeadsToThoughtly = async () => {
    if (selectedLeads.length === 0) return;
    
    setIsImporting(true);
    
    try {
      const leadsToImport = leads.filter(lead => lead.id && selectedLeads.includes(lead.id));
      
      const result = await thoughtlyService.createBulkContacts(leadsToImport);
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${result.summary?.successful || 0} out of ${result.summary?.total || leadsToImport.length} leads to Thoughtly's AI Dialer.`,
      });
      
      setIsImportDialogOpen(false);
    } catch (error) {
      console.error("Error importing leads to Thoughtly:", error);
      toast({
        title: "Import Failed",
        description: "Failed to import leads to Thoughtly. See console for details.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUploadComplete = async (importedLeads: ThoughtlyContact[]) => {
    try {
      const leadsWithIds = importedLeads.map((lead, index) => ({
        ...lead,
        id: lead.id || Date.now() + index,
        disposition: lead.disposition || "Not Contacted",
        countryCode: "US",
        tags: ["CRM Import"]
      }));
      
      const result = await thoughtlyService.syncLeads(leadsWithIds);
      
      if (result?.data) {
        const mappedLeads = Array.isArray(result.data) ? result.data.map(mapThoughtlyContactToLead) : [];
        setLeads(mappedLeads);
        
        toast({
          title: "Leads Synced",
          description: `Successfully imported and synced ${leadsWithIds.length} leads to Thoughtly's AI Dialer.`,
        });
      }
      
      setIsFileUploadOpen(false);
    } catch (error) {
      console.error("Error syncing imported leads:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync imported leads with Thoughtly's AI Dialer.",
        variant: "destructive"
      });
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="flex-1 p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">AI Dialer</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-lg flex items-center gap-2"
                onClick={() => setIsFileUploadOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Import Leads
              </Button>
              
              {!isDialing ? (
                <Button 
                  className="bg-crm-blue hover:bg-crm-blue/90 rounded-lg flex items-center gap-2"
                  onClick={startDialSession}
                >
                  <Phone className="h-4 w-4" />
                  Start Dialing Session
                </Button>
              ) : (
                <Button 
                  variant="destructive"
                  className="rounded-lg flex items-center gap-2"
                  onClick={endDialingSession}
                >
                  <PhoneOff className="h-4 w-4" />
                  End Session
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 h-full">
            <Card className="shadow-sm">
              <CardHeader className="bg-crm-blue/5 border-b pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Phone className="h-5 w-5 text-crm-blue" />
                  AI Call Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {isDialing ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="h-5 w-5 text-green-500 animate-pulse" />
                        <span className="font-medium">
                          AI Dialer is processing calls
                        </span>
                      </div>
                      <Badge className="bg-green-100 text-green-800 px-3 py-1">
                        Lines in use: {lineCount}
                      </Badge>
                    </div>
                    
                    <Card className="border rounded-md mb-4 bg-gray-50">
                      <CardHeader className="pb-2 pt-3 px-4 border-b">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Bot className="h-4 w-4 text-crm-blue" />
                          AI Assistant
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-2 text-sm">
                          {aiResponses.map((response, index) => (
                            <div 
                              key={index} 
                              className={`
                                ${index === aiResponses.length - 1 ? 'animate-pulse' : ''}
                                flex items-start gap-2
                              `}
                            >
                              {index === aiResponses.length - 1 && (
                                <span className="block w-2 h-2 rounded-full bg-green-500 mt-2"></span>
                              )}
                              <p>{response}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border rounded-md">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium">Activity Log</CardTitle>
                      </CardHeader>
                      <ScrollArea className="h-[300px] rounded-md">
                        <div className="p-4 text-center text-gray-500">
                          No active calls yet
                        </div>
                      </ScrollArea>
                    </Card>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] gap-4">
                    <div className="w-20 h-20 rounded-full bg-crm-blue/10 flex items-center justify-center">
                      <Bot className="h-10 w-10 text-crm-blue" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-medium mb-2">
                        Start an AI Dialing Session
                      </h3>
                      <p className="text-gray-500 max-w-md">
                        Let our AI assistant call leads for you. Watch and intervene only when needed.
                      </p>
                    </div>
                    <Button 
                      className="mt-4 bg-crm-blue hover:bg-crm-blue/90 rounded-lg"
                      onClick={startDialSession}
                    >
                      Start Dialing
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="border-t p-6 bg-white">
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Leads to Dial</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={handleRefreshLeads}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="sr-only">Refresh leads</span>
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              {isLoading ? 'Loading leads...' : (
                selectedLeads.length > 0 ? 
                `${selectedLeads.length} leads selected` : 
                `${leads.length} leads available`
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-crm-blue/10">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAllLeads}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Disposition</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Primary Phone</TableHead>
                  <TableHead>Secondary Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading leads...
                    </TableCell>
                  </TableRow>
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No leads found. Import leads to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className={`
                        hover:bg-gray-50 
                        ${activeCallId === lead.id ? 'bg-blue-50' : ''}
                      `}
                    >
                      <TableCell>
                        <Checkbox 
                          checked={lead.id ? selectedLeads.includes(lead.id) : false}
                          onCheckedChange={(checked) => lead.id && handleSelectLead(lead.id, !!checked)}
                          aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge className={getDispositionClass(lead.disposition || 'Not Contacted')}>
                          {lead.disposition || 'Not Contacted'}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {lead.avatar ? (
                            <AvatarImage src={lead.avatar} alt={`${lead.firstName} ${lead.lastName}`} />
                          ) : (
                            <AvatarFallback className="bg-crm-blue/10 text-crm-blue">
                              {lead.firstName ? lead.firstName.charAt(0) : '?'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span>{lead.firstName} {lead.lastName}</span>
                      </TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.phone1}</TableCell>
                      <TableCell>{lead.phone2 || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">AI Dialer Settings</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Concurrent Lines</h3>
              <ToggleGroup 
                type="single" 
                value={lineCount}
                onValueChange={(value) => {
                  if (value) setLineCount(value);
                }}
                className="justify-start border rounded-lg p-1"
              >
                <ToggleGroupItem value="1" className="data-[state=on]:bg-crm-blue data-[state=on]:text-white rounded gap-1">
                  <Phone className="h-4 w-4" />
                  <span>1 Line</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="2" className="data-[state=on]:bg-crm-blue data-[state=on]:text-white rounded gap-1">
                  <Phone2 className="h-4 w-4" />
                  <span>2 Lines</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="3" className="data-[state=on]:bg-crm-blue data-[state=on]:text-white rounded gap-1">
                  <Phone3 className="h-4 w-4" />
                  <span>3 Lines</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Leads to Dial</h3>
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                {selectedLeads.length > 0 ? (
                  <span className="font-medium">{selectedLeads.length} leads selected</span>
                ) : (
                  <span>All leads will be dialed ({leads.length} total)</span>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-crm-blue hover:bg-crm-blue/90 rounded-lg"
              onClick={startDialing}
            >
              Start Dialing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Import Leads into AI Dialer</DialogTitle>
            <DialogDescription>
              Import all selected leads to the AI Dialer system to prepare them for automated calls.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg">
              <Upload className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Import {selectedLeads.length} leads to AI Dialer</p>
                <p className="text-sm text-blue-700">
                  This will make the leads available for AI calling campaigns
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => setIsImportDialogOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-crm-blue hover:bg-crm-blue/90 rounded-lg"
              onClick={importLeadsToThoughtly}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Importing...
                </>
              ) : (
                <>Import Leads</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isFileUploadOpen} onOpenChange={setIsFileUploadOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Import Leads</DialogTitle>
            <DialogDescription>
              Upload a CSV file with your leads data. Our AI will analyze and map the columns automatically.
            </DialogDescription>
          </DialogHeader>
          
          <IntelligentFileUpload onImportComplete={handleFileUploadComplete} />
          
          <DialogFooter className="flex sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => setIsFileUploadOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default AIDialer;
