
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
import { Phone, PhoneCall, PhoneIncoming, PhoneOff, Clock, MessageSquare, User, Bot, Upload, RefreshCw, Loader2 } from "lucide-react";
import Phone2 from "@/components/icons/Phone2";
import Phone3 from "@/components/icons/Phone3";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { thoughtlyService, ThoughtlyContact } from "@/services/thoughtly";
import IntelligentFileUpload from "@/components/IntelligentFileUpload";
import { Progress } from "@/components/ui/progress";

// Sample interview ID for Thoughtly - replace with actual ID or make configurable
const DEFAULT_INTERVIEW_ID = "b5f3a296-9de0-4c97-bd9e-41c0ac31678c";

// Default leads for testing
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [lineCount, setLineCount] = useState("1");
  const [isDialing, setIsDialing] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  // Fix for the type error - ensure dialQueue is typed as number[]
  const [dialQueue, setDialQueue] = useState<number[]>([]);
  const [aiResponses, setAiResponses] = useState<string[]>([
    "Hello, this is AI assistant calling on behalf of SalesPro CRM.",
    "I'm analyzing the lead's information...",
    "I'll prepare to start calling using Thoughtly's AI Assistant.",
  ]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [thoughtlyContacts, setThoughtlyContacts] = useState<any[]>([]);
  const [activeCallId, setActiveCallId] = useState<number | null>(null);
  const [callProgress, setCallProgress] = useState(0);
  const [callsInProgress, setCallsInProgress] = useState<Record<string, any>>({});
  const [interviewId, setInterviewId] = useState(DEFAULT_INTERVIEW_ID);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isInitiatingCalls, setIsInitiatingCalls] = useState(false);
  
  // Activity log for calls
  const [callLogs, setCallLogs] = useState<Array<{
    contactId: string | number;
    action: string;
    status: string;
    timestamp: string;
    details?: string;
  }>>([]);
  
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

  // Load contacts directly from Thoughtly
  const fetchThoughtlyContacts = async () => {
    setIsLoadingContacts(true);
    try {
      // Ensure we get contacts with phone numbers only
      const contacts = await thoughtlyService.getContacts({
        phone_numbers_only: true,
        limit: 50
      });
      
      if (contacts && Array.isArray(contacts)) {
        // Map contacts to our standard format
        const mappedContacts = contacts.map(mapThoughtlyContactToLead);
        setThoughtlyContacts(contacts); 
        setLeads(mappedContacts);
        
        addCallLog("system", "Contacts loaded", `Successfully loaded ${contacts.length} contacts from Thoughtly`);
        
        toast({
          title: "Contacts Loaded",
          description: `Successfully loaded ${contacts.length} contacts from Thoughtly.`,
        });
        return contacts;
      } else {
        toast({
          title: "No Contacts Found",
          description: "No contacts were found in Thoughtly. Try importing some leads first.",
          variant: "destructive",
        });
        return [];
      }
    } catch (error) {
      console.error("Error fetching Thoughtly contacts:", error);
      toast({
        title: "Error",
        description: "Failed to load contacts from Thoughtly.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Helper function to add entries to the call log
  const addCallLog = (contactId: string | number, action: string, details?: string, status: string = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setCallLogs(prev => [
      {
        contactId,
        action,
        status,
        timestamp,
        details
      },
      ...prev
    ]);
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

  // Start the AI dialing process
  const startDialing = async () => {
    setIsDialogOpen(false);
    setIsDialing(true);
    
    // First, fetch latest contacts from Thoughtly
    setAiResponses(prev => [...prev, "Loading contacts from Thoughtly..."]);
    
    const contacts = await fetchThoughtlyContacts();
    
    if (!contacts || contacts.length === 0) {
      setAiResponses(prev => [...prev, "No contacts found. Please import contacts first."]);
      setIsDialing(false);
      return;
    }
    
    setAiResponses(prev => [...prev, `Found ${contacts.length} contacts ready for calling.`]);
    
    // Filter contacts based on selection or use all if none selected
    const contactsToCall = selectedLeads.length > 0 
      ? contacts.filter(contact => contact.id && selectedLeads.includes(Number(contact.id)))
      : contacts;
    
    // Fix: Convert string IDs to numbers when setting dialQueue
    setDialQueue(contactsToCall.map(c => Number(c.id)));
    
    toast({
      title: "AI Dialing Started",
      description: `Preparing to call ${contactsToCall.length} leads`,
    });
    
    setAiResponses(prev => [...prev, `Initiating AI calls for ${contactsToCall.length} contacts...`]);
    
    // Start the calling process
    initiateAICalls(contactsToCall);
  };

  // Initiate AI calls using the Thoughtly API
  const initiateAICalls = async (contacts: any[]) => {
    setIsInitiatingCalls(true);
    try {
      // Add log entry for starting calls
      addCallLog("system", "Starting AI calls", `Initiating calls for ${contacts.length} contacts`);
      
      // Calculate how many lines to use based on lineCount setting
      const linesToUse = parseInt(lineCount);
      setAiResponses(prev => [...prev, `Using ${linesToUse} line${linesToUse > 1 ? 's' : ''} for concurrent calls`]);
      
      // Make the API call to Thoughtly to initiate calls
      const result = await thoughtlyService.callContacts(
        contacts.slice(0, 10), // For safety, limit to 10 calls initially
        interviewId,
        {
          lines: linesToUse,
          source: "SalesPro CRM",
          aiDialerSession: true
        }
      );
      
      if (result.success) {
        // Update UI to show calls are in progress
        setAiResponses(prev => [...prev, `Successfully initiated ${result.summary.successful} AI calls!`]);
        
        // Add detailed log entries for each call
        result.results.success.forEach((callResult: any) => {
          const contact = contacts.find(c => String(c.id) === String(callResult.contact_id));
          
          // Update calls in progress
          setCallsInProgress(prev => ({
            ...prev, 
            [callResult.contact_id]: {
              status: 'in-progress',
              startTime: new Date().toISOString(),
              contact: contact
            }
          }));
          
          // Add to call log
          addCallLog(
            callResult.contact_id,
            "Call initiated", 
            `AI assistant calling ${contact?.firstName || ''} ${contact?.lastName || ''}`,
            "success"
          );
        });
        
        // Handle any failed calls
        result.results.errors.forEach((error: any) => {
          addCallLog(
            error.contact_id || 'unknown',
            "Call failed",
            `Error: ${error.error || 'Unknown error'}`,
            "error"
          );
        });
        
        // Start progress tracking
        trackCallProgress(contacts.slice(0, 10));
      } else {
        setAiResponses(prev => [...prev, `Failed to initiate calls: ${result.error || 'Unknown error'}`]);
        addCallLog("system", "Call initiation failed", result.error || "Unknown error", "error");
      }
    } catch (error) {
      console.error("Error initiating AI calls:", error);
      setAiResponses(prev => [...prev, `Error: ${error.message || 'Failed to initiate AI calls'}`]);
      addCallLog("system", "Call initiation error", error.message || "Unknown error", "error");
      
      toast({
        title: "Error",
        description: "Failed to initiate AI calls. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInitiatingCalls(false);
    }
  };

  // Simulate call progress tracking for demo purposes
  const trackCallProgress = (contacts: any[]) => {
    // For demo: update call progress over time
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setCallProgress(Math.min(progress, 100));
      
      // Simulate calls completing
      if (progress >= 30 && progress <= 90 && progress % 15 === 0) {
        const randomContact = contacts[Math.floor(Math.random() * contacts.length)];
        if (randomContact && randomContact.id) {
          completeCall(String(randomContact.id));
        }
      }
      
      if (progress >= 100) {
        clearInterval(interval);
        handleCallsCompleted();
      }
    }, 1000);
  };
  
  // Simulate a call completion
  const completeCall = (contactId: string) => {
    // Remove contact from in-progress calls
    setCallsInProgress(prev => {
      const newCalls = { ...prev };
      const contact = newCalls[contactId]?.contact;
      delete newCalls[contactId];
      
      // Add completion log
      addCallLog(
        contactId,
        "Call completed",
        `AI assistant finished call with ${contact?.firstName || ''} ${contact?.lastName || ''}`,
        "success"
      );
      
      // Update AI responses with a random outcome
      const outcomes = [
        "Lead is interested and requested more information.",
        "Scheduled a follow-up call for next week.",
        "Not interested at this time.",
        "Asked for email with details about our services.",
        "Requested a meeting with a sales representative."
      ];
      
      setAiResponses(prev => [
        ...prev, 
        `Call with ${contact?.firstName || ''} ${contact?.lastName || ''} completed: ${outcomes[Math.floor(Math.random() * outcomes.length)]}`
      ]);
      
      return newCalls;
    });
  };
  
  // Handle when all calls are completed
  const handleCallsCompleted = () => {
    setAiResponses(prev => [...prev, "All AI calls have been completed!"]);
    addCallLog("system", "Calls completed", "All AI-assisted calls have been completed");
    
    toast({
      title: "All Calls Completed",
      description: "The AI dialing session has finished all calls.",
    });
  };

  const handleSelectAllLeads = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(leads.map(lead => lead.id!).filter(Boolean));
    } else {
      setSelectedLeads([]);
      setIsImportDialogOpen(false);
    }
  };

  const handleSelectLead = (leadId: number, checked: boolean) => {
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
    lead.id && selectedLeads.includes(lead.id)
  );

  const endDialingSession = () => {
    setIsDialing(false);
    setActiveCallId(null);
    setDialQueue([]);
    setCallProgress(0);
    setCallsInProgress({});
    setCallLogs([]);
    
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
                    
                    {/* Call Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span>Call Progress</span>
                        <span>{callProgress}%</span>
                      </div>
                      <Progress value={callProgress} className="h-2" />
                    </div>
                    
                    {/* Active Calls */}
                    {Object.keys(callsInProgress).length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mb-2">
                        {Object.entries(callsInProgress).map(([contactId, data]) => (
                          <Card key={contactId} className="bg-blue-50 border border-blue-200">
                            <CardContent className="py-2 px-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <PhoneCall className="h-3 w-3 text-blue-500 animate-pulse" />
                                <span className="text-sm font-medium">
                                  {data.contact?.firstName} {data.contact?.lastName}
                                </span>
                              </div>
                              <Badge variant="outline" className="bg-blue-100">Active</Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {/* AI Assistant Card */}
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
                          
                          {isLoadingContacts && (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Loading contacts from Thoughtly...</span>
                            </div>
                          )}
                          
                          {isInitiatingCalls && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Initiating AI calls...</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Activity Log Card */}
                    <Card className="border rounded-md">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium">Activity Log</CardTitle>
                      </CardHeader>
                      <ScrollArea className="h-[300px] rounded-md">
                        <div className="p-4">
                          {callLogs.length > 0 ? (
                            <div className="space-y-3">
                              {callLogs.map((log, index) => (
                                <div 
                                  key={index} 
                                  className={`p-2 rounded-lg border ${
                                    log.status === 'success' ? 'bg-green-50 border-green-200' : 
                                    log.status === 'error' ? 'bg-red-50 border-red-200' : 
                                    'bg-blue-50 border-blue-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm">
                                      {log.action}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {log.timestamp}
                                    </span>
                                  </div>
                                  {log.details && (
                                    <p className="text-xs text-gray-600">{log.details}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-gray-500">
                              No call activity yet
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

      {/* Dialer Settings Dialog */}
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
              <h3 className="text-sm font-medium mb-2">Interview ID</h3>
              <input 
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={interviewId}
                onChange={(e) => setInterviewId(e.target.value)}
                placeholder="Enter Thoughtly Agent ID"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in the URL of your Thoughtly Agent page.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={startDialing} 
              className="bg-crm-blue hover:bg-crm-blue/90"
            >
              Start Calls
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Import Leads to Thoughtly</DialogTitle>
            <DialogDescription>
              These leads will be synced with Thoughtly's AI Dialer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-600">
              You've selected {selectedLeads.length} leads to import to Thoughtly's AI Dialer system.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={importLeadsToThoughtly}
              disabled={isImporting}
              className={`${isImporting ? 'opacity-70' : ''} bg-crm-blue hover:bg-crm-blue/90`}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import to Thoughtly'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* File Upload Dialog */}
      <Dialog open={isFileUploadOpen} onOpenChange={setIsFileUploadOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="text-xl">Import Leads</DialogTitle>
            <DialogDescription>
              Upload your leads from a CSV file to import them into the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 py-4">
            <IntelligentFileUpload onComplete={handleFileUploadComplete} />
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default AIDialer;
