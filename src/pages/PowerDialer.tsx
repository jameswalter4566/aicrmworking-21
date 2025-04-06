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
import { Phone, PhoneCall, PhoneIncoming, PhoneOff, Clock, MessageSquare, User, Bot, RefreshCw, AlertCircle } from "lucide-react";
import Phone2 from "@/components/icons/Phone2";
import Phone3 from "@/components/icons/Phone3";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { thoughtlyService, ThoughtlyContact } from "@/services/thoughtly";
import { useTwilio } from "@/hooks/use-twilio";

const activityLogsData = {
  1: [
    { type: "call", status: "attempted", timestamp: "2023-05-15 10:23 AM", notes: "No answer", sender: "user" },
    { type: "sms", status: "sent", timestamp: "2023-05-15 10:30 AM", content: "Hi Dan, I tried reaching out to you. Would you be available later today?", sender: "user" },
    { type: "disposition", status: "changed", timestamp: "2023-05-15 10:32 AM", from: "New Lead", to: "Not Contacted", sender: "user" },
  ],
  2: [
    { type: "call", status: "completed", timestamp: "2023-05-14 2:45 PM", duration: "4:32", notes: "Discussed property requirements", sender: "user" },
    { type: "sms", status: "sent", timestamp: "2023-05-14 3:15 PM", content: "Thanks for the call. Can you send me more info about the property?", sender: "lead" },
    { type: "sms", status: "sent", timestamp: "2023-05-14 3:20 PM", content: "Of course! I'll email you the details shortly.", sender: "user" },
    { type: "disposition", status: "changed", timestamp: "2023-05-14 3:25 PM", from: "New Lead", to: "Contacted", sender: "user" },
  ],
  3: [
    { type: "call", status: "completed", timestamp: "2023-05-13 11:15 AM", duration: "7:21", notes: "Scheduled property viewing", sender: "user" },
    { type: "disposition", status: "changed", timestamp: "2023-05-13 11:25 AM", from: "Contacted", to: "Appointment Set", sender: "user" },
    { type: "sms", status: "sent", timestamp: "2023-05-13 11:30 AM", content: "Looking forward to showing you the property on Friday at 3 PM!", sender: "user" },
    { type: "sms", status: "received", timestamp: "2023-05-13 11:35 AM", content: "Great, I'll see you then. Thank you!", sender: "lead" },
  ],
  4: [
    { type: "call", status: "attempted", timestamp: "2023-05-12 9:10 AM", notes: "Voicemail left", sender: "user" },
    { type: "disposition", status: "changed", timestamp: "2023-05-12 9:15 AM", from: "New Lead", to: "Not Contacted", sender: "user" },
  ],
  5: [
    { type: "call", status: "attempted", timestamp: "2023-05-11 4:30 PM", notes: "No answer", sender: "user" },
    { type: "call", status: "attempted", timestamp: "2023-05-12 10:45 AM", notes: "No answer", sender: "user" },
    { type: "sms", status: "sent", timestamp: "2023-05-12 10:50 AM", content: "Hi James, I've tried to reach you. Please call me back when you have a moment.", sender: "user" },
    { type: "disposition", status: "changed", timestamp: "2023-05-12 10:55 AM", from: "New Lead", to: "Not Contacted", sender: "user" },
  ],
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

const PowerDialer = () => {
  const [leads, setLeads] = useState<ThoughtlyContact[]>([]);
  const [activeCallId, setActiveCallId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lineCount, setLineCount] = useState("1");
  const [isDialing, setIsDialing] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [dialQueue, setDialQueue] = useState<number[]>([]);
  const [dialingMode, setDialingMode] = useState<"power" | "ai">("power");
  const [aiResponses, setAiResponses] = useState<string[]>([
    "Hello, this is AI assistant calling on behalf of SalesPro CRM.",
    "I'm analyzing the lead's information...",
    "I see they're interested in property in the downtown area.",
    "I'll try to schedule a meeting with our agent.",
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [noLeadsSelectedError, setNoLeadsSelectedError] = useState(false);
  
  const { 
    initialized, 
    makeCall, 
    endCall, 
    activeCalls, 
    microphoneActive, 
    audioStreaming 
  } = useTwilio();

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
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast({
        title: "Error",
        description: "Failed to load leads. Please refresh and try again.",
        variant: "destructive",
      });
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
    setNoLeadsSelectedError(false);
    
    if (selectedLeads.length === 0) {
      toast({
        title: "No Leads Selected",
        description: "Please select at least one lead to dial.",
        variant: "destructive",
      });
      setNoLeadsSelectedError(true);
      return;
    }
    
    if (!initialized) {
      toast({
        title: "Phone System Not Ready",
        description: "The browser-based phone system is not initialized. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDialogOpen(true);
  };

  const startDialing = async () => {
    if (selectedLeads.length === 0) {
      toast({
        title: "No Leads Selected",
        description: "Please select at least one lead to dial.",
        variant: "destructive",
      });
      setNoLeadsSelectedError(true);
      setIsDialogOpen(false);
      return;
    }

    const leadsToDial = selectedLeads;
    
    setDialQueue(leadsToDial);
    setIsDialogOpen(false);
    setIsDialing(true);
    
    const batchSize = parseInt(lineCount);
    const firstBatch = leadsToDial.slice(0, batchSize);
    
    if (firstBatch.length > 0) {
      setActiveCallId(firstBatch[0]);
      
      toast({
        title: `Starting ${dialingMode === "ai" ? "AI" : "power"} dialer`,
        description: `Dialing with ${batchSize} line${batchSize > 1 ? 's' : ''}`,
      });
      
      initiateCall(firstBatch[0]);
    }
  };

  const initiateCall = async (leadId: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || !lead.phone1) {
      toast({
        title: "Invalid Lead",
        description: `Lead #${leadId} has no phone number.`,
        variant: "destructive",
      });
      
      moveToNextLead(leadId);
      return;
    }
    
    const normalizedPhone = normalizePhoneNumber(lead.phone1);
    
    if (!normalizedPhone) {
      toast({
        title: "Invalid Phone Number",
        description: `The phone number for ${lead.firstName} ${lead.lastName} is invalid.`,
        variant: "destructive",
      });
      
      moveToNextLead(leadId);
      return;
    }
    
    toast({
      title: "Dialing",
      description: `Calling ${lead.firstName} ${lead.lastName} at ${normalizedPhone}...`,
    });
    
    console.log(`Making browser-based call to lead ${leadId} with phone number ${normalizedPhone}`);
    
    try {
      const result = await makeCall(normalizedPhone, leadId);
      
      if (result.success) {
        toast({
          title: "Call Connected",
          description: `Call to ${lead.firstName} ${lead.lastName} is in progress.`,
        });
        
        setActiveCallId(leadId);
      } else {
        toast({
          title: "Call Failed",
          description: result.error || "Could not connect the call",
          variant: "destructive",
        });
        
        moveToNextLead(leadId);
      }
    } catch (error) {
      console.error(`Error making call to ${lead.phone1}:`, error);
      toast({
        title: "Call Failed",
        description: "Network error or service unavailable",
        variant: "destructive",
      });
      
      moveToNextLead(leadId);
    }
  };

  const moveToNextLead = (currentLeadId: number) => {
    const currentIndex = dialQueue.indexOf(currentLeadId);
    
    endCall(currentLeadId);
    
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < dialQueue.length) {
      const nextLeadId = dialQueue[nextIndex];
      setTimeout(() => {
        initiateCall(nextLeadId);
        setActiveCallId(nextLeadId);
      }, 1000);
    } else {
      setIsDialing(false);
      setActiveCallId(null);
      toast({
        title: "Dialing Complete",
        description: "All leads have been contacted",
      });
    }
  };

  const endDialingSession = async () => {
    if (activeCallId) {
      await endCall(activeCallId);
    }
    
    setIsDialing(false);
    setActiveCallId(null);
    setDialQueue([]);
    
    toast({
      title: "Session Ended",
      description: "Dialing session has been terminated",
    });
  };

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
      setNoLeadsSelectedError(false);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const isAllSelected = leads.length > 0 && leads.every(lead => 
    lead.id && selectedLeads.includes(lead.id)
  );

  const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    } else if (digitsOnly.length > 10 && !digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    } else if (digitsOnly.length > 10 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }
    
    return digitsOnly ? `+${digitsOnly}` : '';
  };

  const currentCallStatus = activeCallId && activeCalls[activeCallId] 
    ? activeCalls[activeCallId].status 
    : null;

  const showAudioIndicators = activeCallId && activeCalls[activeCallId];

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="flex-1 p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">
              Browser-Based {dialingMode === "ai" ? "AI Dialer" : "Power Dialer"}
            </h1>
            {!isDialing ? (
              <div className="flex items-center gap-2">
                {noLeadsSelectedError && (
                  <div className="text-red-500 flex items-center gap-1 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Please select leads to dial</span>
                  </div>
                )}
                <Button 
                  className="bg-crm-blue hover:bg-crm-blue/90 rounded-lg flex items-center gap-2"
                  onClick={startDialSession}
                  disabled={!initialized}
                >
                  <Phone className="h-4 w-4" />
                  Start Dialing Session
                </Button>
              </div>
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

          <div className="grid grid-cols-1 gap-6 h-full">
            <Card className="shadow-sm">
              <CardHeader className="bg-crm-blue/5 border-b pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Phone className="h-5 w-5 text-crm-blue" />
                  {isDialing ? 'Active Call' : (dialingMode === "ai" ? 'AI Call Dashboard' : 'Call Dashboard')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {isDialing ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="h-5 w-5 text-green-500 animate-pulse" />
                        <span className="font-medium">
                          {activeCallId && leads.find(l => l.id === activeCallId) 
                            ? `Calling ${leads.find(l => l.id === activeCallId)?.firstName} ${leads.find(l => l.id === activeCallId)?.lastName}`
                            : 'Initializing calls...'}
                        </span>
                        {showAudioIndicators && (
                          <div className="flex items-center ml-2 gap-2 text-sm">
                            <Badge className={microphoneActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {microphoneActive ? "Mic active" : "Mic inactive"}
                            </Badge>
                            <Badge className={audioStreaming ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                              {audioStreaming ? "Audio streaming" : "No audio stream"}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <Badge className={currentCallStatus === 'in-progress' ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"} px-3 py-1>
                        {currentCallStatus === 'in-progress' ? 'Connected' : 'Connecting...'}
                      </Badge>
                    </div>
                    
                    {dialingMode === "ai" && (
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
                    )}
                    
                    <Card className="border rounded-md">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium">Activity Log</CardTitle>
                      </CardHeader>
                      <ScrollArea className="h-[300px] rounded-md">
                        <div className="p-4">
                          {activeCallId && activityLogsData[activeCallId as keyof typeof activityLogsData] ? (
                            <div className="space-y-4">
                              {activityLogsData[activeCallId as keyof typeof activityLogsData].map((log, index) => (
                                <div 
                                  key={index} 
                                  className={`flex ${log.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div 
                                    className={`flex max-w-[75%] ${
                                      log.sender === 'user' 
                                        ? 'bg-crm-blue text-white rounded-tl-lg rounded-bl-lg rounded-tr-lg' 
                                        : 'bg-gray-100 text-gray-800 rounded-tr-lg rounded-br-lg rounded-tl-lg'
                                    } p-3 shadow-sm`}
                                  >
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        {log.type === 'call' && (
                                          log.status === 'attempted' ? 
                                            <PhoneOff className={`h-4 w-4 ${log.sender === 'user' ? 'text-white' : 'text-red-500'}`} /> : 
                                            <PhoneIncoming className={`h-4 w-4 ${log.sender === 'user' ? 'text-white' : 'text-green-500'}`} />
                                        )}
                                        {log.type === 'sms' && (
                                          <MessageSquare className={`h-4 w-4 ${log.sender === 'user' ? 'text-white' : 'text-blue-500'}`} />
                                        )}
                                        {log.type === 'disposition' && (
                                          <User className={`h-4 w-4 ${log.sender === 'user' ? 'text-white' : 'text-purple-500'}`} />
                                        )}
                                        <span className={`font-medium text-sm ${log.sender === 'user' ? 'text-white' : 'text-gray-800'}`}>
                                          {log.type === 'call' && `Call ${log.status}`}
                                          {log.type === 'sms' && `Message ${log.status === 'received' ? 'received' : 'sent'}`}
                                          {log.type === 'disposition' && 'Status Changed'}
                                        </span>
                                      </div>
                                      <div className={`text-sm ${log.sender === 'user' ? 'text-white/90' : 'text-gray-700'}`}>
                                        {log.type === 'call' && log.notes}
                                        {log.type === 'sms' && log.content}
                                        {log.type === 'disposition' && `From "${log.from}" to "${log.to}"`}
                                      </div>
                                      <div className={`text-xs ${log.sender === 'user' ? 'text-white/70' : 'text-gray-500'} mt-1 flex items-center`}>
                                        <Clock className="h-3 w-3 mr-1" />
                                        {log.timestamp}
                                        {log.type === 'call' && log.duration && (
                                          <span className="ml-2">Duration: {log.duration}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-10 text-gray-500">
                              {isDialing ? 'Loading activity log...' : 'No active call selected'}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </Card>

                    {activeCallId && activeCalls[activeCallId] && (
                      <Card className="border rounded-md mt-2">
                        <CardContent className="p-4 flex justify-center items-center gap-4">
                          <Button
                            variant="outline"
                            size="icon"
                            className={`${activeCalls[activeCallId].isMuted ? 'bg-red-50' : 'bg-gray-50'} rounded-full h-12 w-12`}
                            onClick={() => useTwilio().toggleMute(activeCallId)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-off">
                              {activeCalls[activeCallId].isMuted ? (
                                <>
                                  <line x1="2" x2="22" y1="2" y2="22" />
                                  <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                                  <path d="M5 12v-2a7 7 0 0 1 12-5" />
                                  <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                                  <line x1="12" x2="12" y1="19" y2="22" />
                                </>
                              ) : (
                                <>
                                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                  <line x1="12" x2="12" y1="19" y2="22" />
                                </>
                              )}
                            </svg>
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            className="bg-red-500 text-white rounded-full h-14 w-14"
                            onClick={() => moveToNextLead(activeCallId)}
                          >
                            <PhoneOff className="h-6 w-6" />
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] gap-4">
                    <div className="w-20 h-20 rounded-full bg-crm-blue/10 flex items-center justify-center">
                      {dialingMode === "ai" ? (
                        <Bot className="h-10 w-10 text-crm-blue" />
                      ) : (
                        <Phone className="h-10 w-10 text-crm-blue" />
                      )}
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-medium mb-2">
                        {dialingMode === "ai" ? "Start an AI Dialing Session" : "Start a Browser Dialing Session"}
                      </h3>
                      <p className="text-gray-500 max-w-md">
                        {dialingMode === "ai"
                          ? "Let our AI assistant call leads for you using your browser. Watch and intervene only when needed."
                          : "Make calls to leads directly from your browser. First select leads from the table below, then start dialing."
                        }
                      </p>
                      {!initialized && (
                        <div className="mt-2 text-amber-600 font-medium">
                          Phone system not yet initialized. Please wait or refresh the page.
                        </div>
                      )}
                    </div>
                    <Button 
                      className={`mt-4 rounded-lg ${selectedLeads.length > 0 && initialized ? 'bg-crm-blue hover:bg-crm-blue/90' : 'bg-gray-300'}`}
                      onClick={startDialSession}
                      disabled={selectedLeads.length === 0 || !initialized}
                    >
                      {selectedLeads.length > 0 
                        ? `Start Dialing (${selectedLeads.length} selected)` 
                        : "Select Leads First"}
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
            <div className="text-sm flex items-center gap-2">
              {noLeadsSelectedError && (
                <div className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>Please select leads to dial</span>
                </div>
              )}
              <div className="text-gray-500">
                {isLoading ? 'Loading leads...' : (
                  selectedLeads.length > 0 ? 
                  `${selectedLeads.length} leads selected` : 
                  `${leads.length} leads available`
                )}
              </div>
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
                        ${selectedLeads.includes(lead.id!) ? 'bg-blue-50/50' : ''}
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
            <DialogTitle className="text-xl">Dialer Settings</DialogTitle>
            <DialogDescription>
              You've selected {selectedLeads.length} leads to dial
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Dialing Mode</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className={`justify-start text-left h-auto py-3 rounded-lg ${dialingMode === "power" ? "border-crm-blue bg-crm-blue/5" : ""}`}
                  onClick={() => setDialingMode("power")}
                >
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-crm-blue" />
                    <div className="flex-1">
                      <div className="font-medium">Browser Dialer</div>
                      <div className="text-xs text-gray-500">Make calls directly from your browser</div>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline" 
                  className={`justify-start text-left h-auto py-3 rounded-lg ${dialingMode === "ai" ? "border-crm-blue bg-crm-blue/5" : ""}`}
                  onClick={() => setDialingMode("ai")}
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-crm-blue" />
                    <div className="flex-1">
                      <div className="font-medium">AI Dialer</div>
                      <div className="text-xs text-gray-500">AI calls leads for you</div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Number of Lines</h3>
              <ToggleGroup type="single" value={lineCount} onValueChange={(value) => value && setLineCount(value)} className="flex justify-center">
                <ToggleGroupItem value="1" className="px-5 data-[state=on]:bg-crm-blue data-[state=on]:text-white">1</ToggleGroupItem>
                <ToggleGroupItem value="2" className="px-5 data-[state=on]:bg-crm-blue data-[state=on]:text-white">2</ToggleGroupItem>
                <ToggleGroupItem value="3" className="px-5 data-[state=on]:bg-crm-blue data-[state=on]:text-white">3</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button 
              onClick={startDialing}
              className="bg-crm-blue hover:bg-crm-blue/90 rounded-lg"
            >
              Start Dialing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default PowerDialer;
