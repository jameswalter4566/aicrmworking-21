import React, { useState, useEffect, useCallback } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Phone, PhoneCall, PhoneIncoming, PhoneOff, Clock, MessageSquare, User, Bot, Upload, RefreshCw, Loader2 } from "lucide-react";
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
import { useTwilio } from "@/hooks/use-twilio";
import { Progress } from "@/components/ui/progress";

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

type CallStatus = 'queued' | 'connecting' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';

interface CallProgress {
  leadId: number;
  status: CallStatus;
  startTime: Date;
  endTime?: Date;
  notes?: string;
}

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
  const [processedLeads, setProcessedLeads] = useState<number[]>([]);
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [callInProgress, setCallInProgress] = useState(false);
  const [nextCallTimeout, setNextCallTimeout] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  
  const { 
    initialized, 
    isLoading: twilioLoading, 
    activeCalls, 
    callLog,
    addLogEntry,
    callThoughtlyContact 
  } = useTwilio();
  
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

  const startDialSession = () => {
    setIsDialogOpen(true);
  };

  const getLeadNameById = (leadId: number): string => {
    const lead = leads.find(l => l.id === leadId);
    return lead ? `${lead.firstName} ${lead.lastName}` : `Lead #${leadId}`;
  };

  const processNextLead = useCallback(async () => {
    if (dialQueue.length === 0) {
      addLogEntry("Dialing queue is empty, session complete");
      setIsDialing(false);
      setCallInProgress(false);
      
      toast({
        title: "Dialing Complete",
        description: "All leads have been processed.",
      });
      return;
    }
    
    const nextLeadId = dialQueue[0];
    const newQueue = dialQueue.slice(1);
    setDialQueue(newQueue);
    setActiveCallId(nextLeadId);
    
    const totalLeads = newQueue.length + processedLeads.length + 1;
    const completedLeads = processedLeads.length;
    setProgressPercent(Math.round((completedLeads / totalLeads) * 100));
    
    const lead = leads.find(l => l.id === nextLeadId);
    if (!lead) {
      addLogEntry(`Lead ${nextLeadId} not found, skipping`);
      processNextLead();
      return;
    }
    
    setAiResponses(prev => [
      ...prev, 
      `Now calling ${lead.firstName} ${lead.lastName} at ${lead.phone1}...`,
      `Analyzing lead information for ${lead.firstName}...`
    ]);
    
    addLogEntry(`Processing lead: ${lead.firstName} ${lead.lastName} (ID: ${nextLeadId})`);
    
    try {
      const result = await callThoughtlyContact(nextLeadId, "interview_demo_123");
      
      if (result.success) {
        addLogEntry(`Successfully initiated call to ${lead.firstName} ${lead.lastName}`);
        setProcessedLeads(prev => [...prev, nextLeadId]);
        
        setAiResponses(prev => [
          ...prev,
          `Call to ${lead.firstName} connected successfully`,
          `AI is now talking with ${lead.firstName}...`
        ]);

        const delayMs = 5000 + Math.random() * 3000;
        const timeoutId = window.setTimeout(() => {
          setAiResponses(prev => [
            ...prev,
            `Call with ${lead.firstName} ${lead.lastName} completed`,
            `Result: ${Math.random() > 0.3 ? 'Successful conversation' : 'Left voicemail'}`
          ]);
          
          processNextLead();
        }, delayMs);
        
        setNextCallTimeout(timeoutId);
      } else {
        addLogEntry(`Failed to call lead ${nextLeadId}: ${result.error}`);
        setAiResponses(prev => [
          ...prev,
          `Failed to connect call to ${lead.firstName} ${lead.lastName}`,
          `Reason: ${result.error || 'Connection issue'}`
        ]);
        
        const timeoutId = window.setTimeout(() => {
          processNextLead();
        }, 3000);
        setNextCallTimeout(timeoutId);
      }
      
    } catch (error) {
      addLogEntry(`Error processing lead ${nextLeadId}: ${error instanceof Error ? error.message : String(error)}`);
      
      const timeoutId = window.setTimeout(() => {
        processNextLead();
      }, 3000);
      setNextCallTimeout(timeoutId);
    }
  }, [dialQueue, leads, processedLeads, addLogEntry, callThoughtlyContact]);

  const startDialing = async () => {
    if (!initialized) {
      toast({
        title: "Error",
        description: "Phone system not initialized. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    const leadsToDial = selectedLeads.length > 0 
      ? leads.filter(lead => selectedLeads.includes(lead.id!)).map(lead => lead.id!)
      : leads.map(lead => lead.id!);
    
    if (leadsToDial.length === 0) {
      toast({
        title: "No Leads Selected",
        description: "Please select at least one lead to dial.",
        variant: "destructive",
      });
      return;
    }
    
    setProcessedLeads([]);
    setDialQueue(leadsToDial);
    setIsDialogOpen(false);
    setIsDialing(true);
    setCallInProgress(true);
    setAiResponses(["Initializing AI Dialer...", "Preparing to make calls..."]);
    setProgressPercent(0);
    
    addLogEntry(`Starting AI dialing session with ${leadsToDial.length} leads`);
    
    toast({
      title: "Starting AI Dialing Session",
      description: `Now initializing AI dialing for ${leadsToDial.length} leads`,
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
        addLogEntry(`Error: ${error.message}`);
        toast({
          title: "Error",
          description: "Failed to start dialing session. Please try again.",
          variant: "destructive"
        });
        setIsDialing(false);
        setCallInProgress(false);
        return;
      }

      console.log("Dialing session initialized successfully:", data);
      addLogEntry(`Dialing session initialized successfully`);
      
      if (data.success) {
        processNextLead();
      } else {
        addLogEntry(`Error: ${data.error || "Unknown error starting calls"}`);
        toast({
          title: "Warning",
          description: data.error || "There was an issue starting some calls",
          variant: "destructive"
        });
        setIsDialing(false);
        setCallInProgress(false);
      }
    } catch (err) {
      console.error("Exception during dialing:", err);
      addLogEntry(`Exception: ${err instanceof Error ? err.message : String(err)}`);
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
    if (nextCallTimeout) {
      clearTimeout(nextCallTimeout);
      setNextCallTimeout(null);
    }
    
    setIsDialing(false);
    setActiveCallId(null);
    setDialQueue([]);
    setCallInProgress(false);
    
    addLogEntry("Dialing session manually ended by user");
    
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

  const getCallStatusBadge = (status: CallStatus) => {
    switch (status) {
      case 'queued':
        return <Badge className="bg-gray-100 text-gray-800">Queued</Badge>;
      case 'connecting':
        return <Badge className="bg-blue-100 text-blue-800">Connecting</Badge>;
      case 'in-progress':
        return <Badge className="bg-green-100 text-green-800">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-purple-100 text-purple-800">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'busy':
        return <Badge className="bg-yellow-100 text-yellow-800">Busy</Badge>;
      case 'no-answer':
        return <Badge className="bg-orange-100 text-orange-800">No Answer</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
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
                disabled={isDialing}
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
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-crm-blue" />
                    AI Call Dashboard
                  </div>
                  
                  {isDialing && (
                    <div className="text-sm flex items-center gap-2">
                      <span>{processedLeads.length} of {processedLeads.length + dialQueue.length} calls</span>
                      <Progress value={progressPercent} className="w-28 h-2" />
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {isDialing ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="h-5 w-5 text-green-500 animate-pulse" />
                        <span className="font-medium">
                          {activeCallId ? 
                            `Currently calling: ${getLeadNameById(activeCallId)}` : 
                            'Initializing calls...'}
                        </span>
                      </div>
                      <Badge className="bg-green-100 text-green-800 px-3 py-1">
                        AI Dialer Active
                      </Badge>
                    </div>
                    
                    {activeCallId && (
                      <Card className="border rounded-md mb-4">
                        <CardHeader className="pb-2 pt-3 px-4 border-b">
                          <CardTitle className="text-sm font-medium flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <PhoneCall className="h-4 w-4 text-crm-blue" />
                              Current Call
                            </div>
                            <Badge className="bg-green-100 text-green-800 animate-pulse">
                              Active
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          {(() => {
                            const lead = leads.find(l => l.id === activeCallId);
                            return lead ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    {lead.avatar ? (
                                      <AvatarImage src={lead.avatar} alt={`${lead.firstName} ${lead.lastName}`} />
                                    ) : (
                                      <AvatarFallback className="bg-crm-blue/10 text-crm-blue">
                                        {lead.firstName ? lead.firstName.charAt(0) : '?'}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                                    <div className="text-sm text-gray-500 flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {lead.phone1}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-end">
                                  <Badge className={getDispositionClass(lead.disposition || 'Not Contacted')}>
                                    {lead.disposition || 'Not Contacted'}
                                  </Badge>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Lead ID: {lead.id}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-4 text-gray-500">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading lead information...
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    )}
                    
                    <Card className="border rounded-md mb-4 bg-gray-50">
                      <CardHeader className="pb-2 pt-3 px-4 border-b">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Bot className="h-4 w-4 text-crm-blue" />
                          AI Assistant
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <ScrollArea className="h-[150px]">
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
                        </ScrollArea>
                      </CardContent>
                    </Card>
                    
                    <Card className="border rounded-md mb-4">
                      <CardHeader className="pb-2 pt-3 px-4 border-b">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PhoneIncoming className="h-4 w-4 text-crm-blue" />
                            Call Queue
                          </div>
                          <span className="text-xs text-gray-500">
                            {dialQueue.length} leads remaining
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[120px]">
                          {dialQueue.length > 0 ? (
                            <div className="divide-y">
                              {dialQueue.slice(0, 5).map((leadId, index) => {
                                const lead = leads.find(l => l.id === leadId);
                                return lead ? (
                                  <div 
                                    key={leadId} 
                                    className="flex items-center justify-between p-3"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="bg-gray-100 rounded-full h-6 w-6 flex items-center justify-center text-xs font-medium text-gray-600">
                                        {index + 1}
                                      </div>
                                      <span>{lead.firstName} {lead.lastName}</span>
                                    </div>
                                    <Badge className="bg-gray-100 text-gray-800">
                                      Queued
                                    </Badge>
                                  </div>
                                ) : null;
                              })}
                              {dialQueue.length > 5 && (
                                <div className="p-3 text-center text-sm text-gray-500">
                                  +{dialQueue.length - 5} more leads in queue
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-[120px] text-gray-500">
                              Queue is empty
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                    
                    <Card className="border rounded-md">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium">Activity Log</CardTitle>
                      </CardHeader>
                      <ScrollArea className="h-[180px] rounded-md">
                        <div className="p-4">
                          {callLog.length > 0 ? (
                            <div className="space-y-2 text-sm">
                              {callLog.map((log, index) => (
                                <div key={index} className="text-gray-700">
                                  {log}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-gray-500">
                              No activity logged yet
                            </div>
                          )}
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
              {isDialing && (
                <CardFooter className="bg-gray-50 border-t p-3 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {processedLeads.length > 0 ? (
                      <span>Completed {processedLeads.length} calls</span>
                    ) : (
                      <span>Starting calls...</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={endDialingSession}
                  >
                    <PhoneOff className="h-4 w-4 mr-1" />
                    Stop Dialer
                  </Button>
                </CardFooter>
              )}
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
                disabled={isLoading || isDialing}
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
                      disabled={isDialing}
                    />
                  </TableHead>
                  <TableHead>Status</TableHead>
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
                  leads.map((lead) => {
                    const isActive = activeCallId === lead.id;
                    const isQueued = dialQueue.includes(lead.id!);
                    const isProcessed = processedLeads.includes(lead.id!);
                    
                    let rowStatus: string | React.ReactNode = '';
                    
                    if (isDialing) {
                      if (isActive) {
                        rowStatus = (
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                            <Badge className="bg-green-100 text-green-800">Active Call</Badge>
                          </div>
                        );
                      } else if (isQueued) {
                        rowStatus = <Badge className="bg-gray-100 text-gray-800">In Queue</Badge>;
                      } else if (isProcessed) {
                        rowStatus = <Badge className="bg-purple-100 text-purple-800">Completed</Badge>;
                      }
                    } else {
                      rowStatus = (
                        <Badge className={getDispositionClass(lead.disposition || 'Not Contacted')}>
                          {lead.disposition || 'Not Contacted'}
                        </Badge>
                      );
                    }
                    
                    return (
                      <TableRow 
                        key={lead.id} 
                        className={`
                          hover:bg-gray-50 
                          ${isActive ? 'bg-blue-50' : ''}
                          ${isProcessed && isDialing ? 'bg-gray-50' : ''}
                        `}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={lead.id ? selectedLeads.includes(lead.id) : false}
                            onCheckedChange={(checked) => lead.id && handleSelectLead(lead.id, !!checked)}
                            aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                            disabled={isDialing}
                          />
                        </TableCell>
                        <TableCell>
                          {rowStatus}
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
                    );
                  })
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
