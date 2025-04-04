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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Phone, PhoneCall, PhoneIncoming, PhoneOff, Clock, MessageSquare, User, Bot } from "lucide-react";
import Phone2 from "@/components/icons/Phone2";
import Phone3 from "@/components/icons/Phone3";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { twilioService } from "@/services/twilio";

const leadsData = [
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
  const [leads, setLeads] = useState(leadsData);
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
  const [callSids, setCallSids] = useState<Record<number, string>>({});
  const [twilioInitialized, setTwilioInitialized] = useState(false);

  useEffect(() => {
    const initTwilio = async () => {
      const micAccess = await twilioService.initializeAudioContext();
      if (micAccess) {
        const deviceInitialized = await twilioService.initializeTwilioDevice();
        setTwilioInitialized(deviceInitialized);
        
        if (!deviceInitialized) {
          toast({
            title: "Error",
            description: "Failed to initialize phone system. Please check your connection.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access to use the dialer.",
          variant: "destructive",
        });
      }
    };

    initTwilio();

    return () => {
      twilioService.cleanup();
    };
  }, []);

  const startDialSession = () => {
    setIsDialogOpen(true);
  };

  const startDialing = async () => {
    if (!twilioInitialized) {
      toast({
        title: "Error",
        description: "Phone system not initialized. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    const leadsToDial = selectedLeads.length > 0 
      ? leads.filter(lead => selectedLeads.includes(lead.id)).map(lead => lead.id)
      : leads.map(lead => lead.id);
    
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
      
      firstBatch.forEach((leadId, index) => {
        setTimeout(() => {
          initiateCall(leadId);
        }, index * 500);
      });
    }
  };

  const initiateCall = async (leadId: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    toast({
      title: "Dialing",
      description: `Calling ${lead.firstName} ${lead.lastName} at ${lead.phone1}...`,
    });
    
    const { success, callSid, error } = await twilioService.makeCall(lead.phone1);
    
    if (success && callSid) {
      setCallSids(prev => ({ ...prev, [leadId]: callSid }));
      
      monitorCallStatus(leadId, callSid);
    } else {
      toast({
        title: "Call Failed",
        description: error || "Could not connect the call",
        variant: "destructive",
      });
      
      moveToNextLead(leadId);
    }
  };

  const monitorCallStatus = (leadId: number, callSid: string) => {
    const intervalId = setInterval(async () => {
      const status = await twilioService.checkCallStatus(callSid);
      
      if (["completed", "busy", "no-answer", "failed", "canceled"].includes(status)) {
        clearInterval(intervalId);
        
        switch(status) {
          case "completed":
            toast({
              title: "Call Completed",
              description: `Call with ${leads.find(l => l.id === leadId)?.firstName} has ended`,
            });
            break;
          case "busy":
            toast({
              title: "Line Busy",
              description: `${leads.find(l => l.id === leadId)?.firstName}'s line is busy`,
              variant: "destructive",
            });
            break;
          case "no-answer":
            toast({
              title: "No Answer",
              description: `${leads.find(l => l.id === leadId)?.firstName} did not answer`,
              variant: "destructive",
            });
            break;
          default:
            toast({
              title: "Call Failed",
              description: `Call to ${leads.find(l => l.id === leadId)?.firstName} could not be completed`,
              variant: "destructive",
            });
        }
        
        moveToNextLead(leadId);
      }
    }, 3000);
  };

  const moveToNextLead = (currentLeadId: number) => {
    const currentIndex = dialQueue.indexOf(currentLeadId);
    const linesInUse = parseInt(lineCount);
    const nextIndex = currentIndex + linesInUse;
    
    if (nextIndex < dialQueue.length) {
      const nextLeadId = dialQueue[nextIndex];
      initiateCall(nextLeadId);
      
      if (activeCallId === currentLeadId) {
        setActiveCallId(nextLeadId);
      }
    } else {
      if (dialQueue.slice(Math.max(0, dialQueue.length - linesInUse)).includes(currentLeadId)) {
        setIsDialing(false);
        setActiveCallId(null);
        toast({
          title: "Dialing Complete",
          description: "All leads have been contacted",
        });
      }
    }
  };

  const endDialingSession = async () => {
    Object.keys(callSids).forEach(async (leadId) => {
      await twilioService.endCall();
    });
    
    setIsDialing(false);
    setActiveCallId(null);
    setDialQueue([]);
    setCallSids({});
    
    toast({
      title: "Session Ended",
      description: "Dialing session has been terminated",
    });
  };

  const handleSelectAllLeads = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(leads.map(lead => lead.id));
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

  const isAllSelected = leads.length > 0 && leads.every(lead => 
    selectedLeads.includes(lead.id)
  );

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="flex-1 p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">
              {dialingMode === "ai" ? "AI Dialer" : "Power Dialer"}
            </h1>
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
                      </div>
                      <Badge className="bg-green-100 text-green-800 px-3 py-1">
                        Lines in use: {lineCount}
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
                        {dialingMode === "ai" ? "Start an AI Dialing Session" : "Start a Power Dialing Session"}
                      </h3>
                      <p className="text-gray-500 max-w-md">
                        {dialingMode === "ai"
                          ? "Let our AI assistant call leads for you. Watch and intervene only when needed."
                          : "Call multiple leads in sequence with our power dialer. Select leads from the table below or dial all leads."
                        }
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
            <h2 className="text-lg font-medium">Leads to Dial</h2>
            <div className="text-sm text-gray-500">
              {selectedLeads.length > 0 ? `${selectedLeads.length} leads selected` : 'All leads will be dialed'}
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
                {leads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className={`
                      hover:bg-gray-50 
                      ${activeCallId === lead.id ? 'bg-blue-50' : ''}
                    `}
                  >
                    <TableCell>
                      <Checkbox 
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                        aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={getDispositionClass(lead.disposition)}>
                        {lead.disposition}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {lead.avatar ? (
                          <AvatarImage src={lead.avatar} alt={`${lead.firstName} ${lead.lastName}`} />
                        ) : (
                          <AvatarFallback className="bg-crm-blue/10 text-crm-blue">
                            {lead.firstName.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span>{lead.firstName} {lead.lastName}</span>
                    </TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.phone1}</TableCell>
                    <TableCell>{lead.phone2 || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Dialer Settings</DialogTitle>
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
                      <div className="font-medium">Power Dialer</div>
                      <div className="text-xs text-gray-500">
                        Manually call leads in sequence
                      </div>
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
                      <div className="text-xs text-gray-500">
                        AI assistant handles calls
                      </div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
            
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
    </MainLayout>
  );
};

export default PowerDialer;
