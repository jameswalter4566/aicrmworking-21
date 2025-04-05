
import React, { useState, useEffect, useRef } from "react";
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
import { useTwilio } from "@/hooks/use-twilio";

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

// Temporary interview ID - this would normally come from configuration or an API call
const DEFAULT_INTERVIEW_ID = "some-interview-id";

const AIDialer = () => {
  const [leads, setLeads] = useState<ThoughtlyContact[]>([]);
  const [thoughtlyContacts, setThoughtlyContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingThoughtlyContacts, setIsLoadingThoughtlyContacts] = useState(false);
  const [activeCallId, setActiveCallId] = useState<number | string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [lineCount, setLineCount] = useState("1");
  const [isDialing, setIsDialing] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<(number | string)[]>([]);
  const [dialQueue, setDialQueue] = useState<(number | string)[]>([]);
  const [currentDialIndex, setCurrentDialIndex] = useState(0);
  const [processingLeadIds, setProcessingLeadIds] = useState<(number | string)[]>([]);
  const [aiResponses, setAiResponses] = useState<string[]>([
    "Hello, this is AI assistant calling on behalf of SalesPro CRM.",
    "I'm analyzing the lead's information...",
    "I see they're interested in property in the downtown area.",
    "I'll try to schedule a meeting with our agent.",
  ]);
  const [activityLog, setActivityLog] = useState<{
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error';
  }[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [interviewId, setInterviewId] = useState(DEFAULT_INTERVIEW_ID);
  
  // Ref to store interval ID for the auto-dialer
  const autoDialerIntervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    fetchLeads();
  }, []);
  
  const fetchThoughtlyContacts = async () => {
    setIsLoadingThoughtlyContacts(true);
    try {
      const contacts = await thoughtlyService.getContacts({
        phone_numbers_only: true,
        limit: 50
      });
      
      if (Array.isArray(contacts)) {
        console.log('Fetched Thoughtly contacts:', contacts);
        setThoughtlyContacts(contacts);
        
        // Map remote contacts to our local format
        const mappedContacts = contacts.map(contact => thoughtlyService.mapRemoteContactToLocal(contact));
        setLeads(mappedContacts);
        
        addToActivityLog('Loaded contacts from Thoughtly', 'success');
      } else {
        console.error('Invalid response from Thoughtly contacts:', contacts);
        throw new Error('Invalid response format from Thoughtly API');
      }
    } catch (error) {
      console.error('Error fetching Thoughtly contacts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contacts from Thoughtly. Using local data instead.",
        variant: "destructive",
      });
      
      // Fallback to regular leads
      fetchLeads();
      
      addToActivityLog('Failed to fetch Thoughtly contacts', 'error');
    } finally {
      setIsLoadingThoughtlyContacts(false);
    }
  };
  
  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      // Try to get contacts from Thoughtly first
      await fetchThoughtlyContacts();
    } catch (thoughtlyError) {
      console.error("Error fetching Thoughtly contacts:", thoughtlyError);
      
      try {
        const retrievedLeads = await thoughtlyService.retrieveLeads();
        
        if (retrievedLeads && Array.isArray(retrievedLeads) && retrievedLeads.length > 0) {
          setLeads(retrievedLeads);
          console.log("Loaded leads from retrieve-leads function:", retrievedLeads);
          addToActivityLog('Loaded leads from database', 'success');
        } else {
          console.log("No leads retrieved, using default data");
          setLeads(defaultLeads);
          addToActivityLog('Using sample lead data', 'info');
        }
      } catch (error) {
        console.error("Error fetching leads:", error);
        toast({
          title: "Error",
          description: "Failed to retrieve contacts. Using sample data instead.",
          variant: "destructive",
        });
        setLeads(defaultLeads);
        addToActivityLog('Failed to fetch leads, using sample data', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshLeads = () => {
    toast({
      title: "Refreshing Leads",
      description: "Retrieving the latest leads data...",
    });
    fetchThoughtlyContacts();
  };

  useEffect(() => {
    if (selectedLeads.length === leads.length && selectedLeads.length > 0) {
      setIsImportDialogOpen(true);
    }
  }, [selectedLeads, leads.length]);

  const startDialSession = () => {
    setIsDialogOpen(true);
  };

  const addToActivityLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLog(prev => [...prev, { timestamp, message, type }]);
  };

  const startDialing = async () => {
    const leadsToDial = selectedLeads.length > 0 
      ? leads.filter(lead => lead.id !== undefined && selectedLeads.includes(lead.id))
      : leads;
    
    if (leadsToDial.length === 0) {
      toast({
        title: "No Leads Selected",
        description: "Please select at least one lead to dial.",
        variant: "destructive",
      });
      return;
    }

    // Convert leads to thoughtly contacts if needed
    let contactsToCall: string[] = [];
    
    // Set up the dial queue with thoughtly contact IDs if available
    if (thoughtlyContacts.length > 0) {
      // Map our leads back to thoughtly contact IDs
      contactsToCall = leadsToDial
        .map(lead => {
          const thoughtlyContact = thoughtlyContacts.find(tc => 
            (tc.phone_number === lead.phone1) || 
            (tc.attributes?.id && String(tc.attributes.id) === String(lead.id))
          );
          
          return thoughtlyContact ? thoughtlyContact.id : null;
        })
        .filter((id): id is string => id !== null);
      
      if (contactsToCall.length === 0) {
        toast({
          title: "No Valid Contacts",
          description: "Could not find valid Thoughtly contacts to dial.",
          variant: "destructive",
        });
        return;
      }
    } else {
      toast({
        title: "No Thoughtly Contacts",
        description: "Cannot proceed with AI dialing without Thoughtly contacts.",
        variant: "destructive",
      });
      return;
    }
    
    setDialQueue(contactsToCall);
    setCurrentDialIndex(0);
    setIsDialogOpen(false);
    setIsDialing(true);
    setActivityLog([]);
    
    toast({
      title: "AI Dialing Started",
      description: `Now dialing ${contactsToCall.length} leads`,
    });
    
    addToActivityLog(`Starting AI dialing session for ${contactsToCall.length} leads`, 'info');
    
    // Start the dialing process
    const maxConcurrentCalls = parseInt(lineCount);
    const processQueue = async () => {
      if (!isDialing) return;
      
      const currentIndex = currentDialIndex;
      if (currentIndex < contactsToCall.length) {
        // Calculate how many new calls to initiate
        const activeCalls = processingLeadIds.length;
        const newCallsToInitiate = Math.min(
          maxConcurrentCalls - activeCalls,
          contactsToCall.length - currentIndex
        );
        
        if (newCallsToInitiate > 0) {
          const newContactsToCall = contactsToCall.slice(
            currentIndex,
            currentIndex + newCallsToInitiate
          );
          
          // Update state to track new calls being processed
          setProcessingLeadIds(prev => [...prev, ...newContactsToCall]);
          setCurrentDialIndex(prev => prev + newCallsToInitiate);
          
          // Start calls
          for (const contactId of newContactsToCall) {
            initiateAICall(contactId);
            
            // Small delay between starting calls
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } else if (processingLeadIds.length === 0) {
        // All calls are finished
        setIsDialing(false);
        toast({
          title: "Dialing Complete",
          description: "All leads have been contacted",
        });
        addToActivityLog("All leads have been contacted", "success");
        
        // Clear interval when done
        if (autoDialerIntervalRef.current) {
          clearInterval(autoDialerIntervalRef.current);
          autoDialerIntervalRef.current = null;
        }
      }
    };
    
    // Start auto-dialer interval
    processQueue(); // Initial run
    autoDialerIntervalRef.current = window.setInterval(processQueue, 5000);
  };

  const initiateAICall = async (contactId: string) => {
    try {
      // Find the Thoughtly contact
      const contact = thoughtlyContacts.find(c => c.id === contactId);
      if (!contact) {
        throw new Error(`Contact with ID ${contactId} not found`);
      }
      
      // Update UI to show active call
      setActiveCallId(contactId);
      
      const name = contact.name || "Lead";
      const phone = contact.phone_number || "Unknown";
      
      addToActivityLog(`Calling ${name} at ${phone}`, 'info');
      
      // Generate some dynamic AI responses
      const dynamicResponses = [
        `Hello, this is AI assistant calling for ${name}.`,
        "I'm reviewing your property interests...",
        "I see you've been looking at properties in the area.",
        "Let me connect you with our team to discuss options."
      ];
      
      setAiResponses(dynamicResponses);
      
      // Make the actual call through Thoughtly
      const callResult = await thoughtlyService.callContact(contactId, interviewId);
      
      if (callResult.success) {
        addToActivityLog(`Successfully connected call to ${name}`, 'success');
        
        // Simulate a call in progress for 10-15 seconds
        await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
        
        // Update with more AI responses
        setAiResponses(prev => [
          ...prev, 
          `I've gathered some information from ${name}.`,
          "They're interested in viewing properties next week.",
          "I've scheduled a follow-up appointment with an agent."
        ]);
        
        // Simulate call completion after another 5-10 seconds
        await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
        
        addToActivityLog(`Call with ${name} completed successfully`, 'success');
      } else {
        addToActivityLog(`Failed to connect call to ${name}`, 'error');
      }
    } catch (error) {
      console.error(`Error initiating AI call for contact ${contactId}:`, error);
      addToActivityLog(`Error calling contact: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      // Remove from processing list
      setProcessingLeadIds(prev => prev.filter(id => id !== contactId));
      
      // Reset active call ID if this was the active one
      if (activeCallId === contactId) {
        setActiveCallId(null);
      }
    }
  };

  const handleSelectAllLeads = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(leads.filter(lead => lead.id !== undefined).map(lead => lead.id!));
    } else {
      setSelectedLeads([]);
      setIsImportDialogOpen(false);
    }
  };

  const handleSelectLead = (leadId: number | string, checked: boolean) => {
    if (checked) {
      const newSelectedLeads = [...selectedLeads, leadId];
      setSelectedLeads(newSelectedLeads);
      
      if (newSelectedLeads.length === leads.length) {
        setIsImportDialogOpen(true);
      }
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
      setIsImportDialogOpen(false);
    }
  };

  const isAllSelected = leads.length > 0 && leads.every(lead => 
    lead.id !== undefined && selectedLeads.includes(lead.id)
  );

  const endDialingSession = () => {
    // Clear the auto-dialer interval
    if (autoDialerIntervalRef.current) {
      clearInterval(autoDialerIntervalRef.current);
      autoDialerIntervalRef.current = null;
    }
    
    setIsDialing(false);
    setActiveCallId(null);
    setDialQueue([]);
    setProcessingLeadIds([]);
    
    toast({
      title: "Session Ended",
      description: "AI dialing session has been terminated",
    });
    
    addToActivityLog("Dialing session terminated by user", "info");
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
      
      // Refresh contacts after import
      fetchThoughtlyContacts();
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
        // Refresh Thoughtly contacts after syncing
        fetchThoughtlyContacts();
        
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
                  disabled={isLoadingThoughtlyContacts}
                >
                  {isLoadingThoughtlyContacts ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4" />
                      Start Dialing Session
                    </>
                  )}
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
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
                          {currentDialIndex} / {dialQueue.length} calls processed
                        </Badge>
                        <Badge className="bg-green-100 text-green-800 px-3 py-1">
                          Lines in use: {processingLeadIds.length} / {lineCount}
                        </Badge>
                      </div>
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
                        <div className="p-4">
                          {activityLog.length > 0 ? (
                            <div className="space-y-2">
                              {activityLog.map((log, index) => (
                                <div 
                                  key={index} 
                                  className={`
                                    flex items-start gap-2 p-2 rounded-md
                                    ${log.type === 'success' ? 'bg-green-50' : ''}
                                    ${log.type === 'error' ? 'bg-red-50' : ''}
                                    ${log.type === 'info' ? 'bg-blue-50' : ''}
                                  `}
                                >
                                  <div className="flex-shrink-0 text-xs text-gray-500 mt-0.5">
                                    {log.timestamp}
                                  </div>
                                  <div className={`
                                    text-sm
                                    ${log.type === 'success' ? 'text-green-700' : ''}
                                    ${log.type === 'error' ? 'text-red-700' : ''}
                                    ${log.type === 'info' ? 'text-blue-700' : ''}
                                  `}>
                                    {log.message}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-gray-500">
                              No activity yet
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
                      disabled={isLoadingThoughtlyContacts}
                    >
                      {isLoadingThoughtlyContacts ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading Contacts...
                        </>
                      ) : (
                        <>Start Dialing</>
                      )}
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
                disabled={isLoading || isLoadingThoughtlyContacts}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading || isLoadingThoughtlyContacts ? 'animate-spin' : ''}`} />
                <span className="sr-only">Refresh leads</span>
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              {isLoading || isLoadingThoughtlyContacts ? 'Loading leads...' : (
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
                {isLoading || isLoadingThoughtlyContacts ? (
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
                        ${processingLeadIds.includes(String(lead.id)) ? 'bg-green-50' : ''}
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
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
