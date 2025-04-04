import React, { useState } from "react";
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
import { toast } from "sonner";
import { Phone, PhoneCall, PhoneIncoming, PhoneOff, Clock, MessageSquare, User, Bot } from "lucide-react";
import Phone2 from "@/components/icons/Phone2";
import Phone3 from "@/components/icons/Phone3";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

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

  const startDialSession = () => {
    setIsDialogOpen(true);
  };

  const startDialing = () => {
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
      
      toast.success(`Starting ${dialingMode === "ai" ? "AI" : "power"} dialer with ${batchSize} line${batchSize > 1 ? 's' : ''}`);
      
      firstBatch.forEach((leadId, index) => {
        setTimeout(() => {
          simulateCall(leadId);
        }, index * 500);
      });
    }
  };

  const simulateCall = (leadId: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    toast(`Dialing ${lead.firstName} ${lead.lastName} at ${lead.phone1}...`);
    
    const callDuration = 5000 + Math.random() * 10000;
    
    setTimeout(() => {
      const callResults = ["completed", "no-answer", "voicemail", "busy"];
      const result = callResults[Math.floor(Math.random() * callResults.length)];
      
      switch(result) {
        case "completed":
          toast.success(`Call with ${lead.firstName} completed`);
          break;
        case "no-answer":
          toast.error(`No answer from ${lead.firstName}`);
          break;
        case "voicemail":
          toast.info(`Left voicemail for ${lead.firstName}`);
          break;
        case "busy":
          toast.warning(`${lead.firstName}'s line is busy`);
          break;
      }
      
      moveToNextLead(leadId);
    }, callDuration);
  };

  const moveToNextLead = (currentLeadId: number) => {
    const currentIndex = dialQueue.indexOf(currentLeadId);
    const linesInUse = parseInt(lineCount);
    const nextIndex = currentIndex + linesInUse;
    
    if (nextIndex < dialQueue.length) {
      const nextLeadId = dialQueue[nextIndex];
      simulateCall(nextLeadId);
      
      if (activeCallId === currentLeadId) {
        setActiveCallId(nextLeadId);
      }
    } else {
      if (dialQueue.slice(Math.max(0, dialQueue.length - linesInUse)).includes(currentLeadId)) {
        setIsDialing(false);
        setActiveCallId(null);
        toast.success("Dialing session completed!");
      }
    }
  };

  const endDialingSession = () => {
    setIsDialing(false);
    setActiveCallId(null);
    setDialQueue([]);
    toast.info("Dialing session ended");
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
            <Card className="shadow-sm rounded-2xl">
              <CardHeader className="bg-crm-blue/5 border-b pb-3 rounded-t-2xl">
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
                      <Badge className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                        Lines in use: {lineCount}
                      </Badge>
                    </div>
                    
                    {dialingMode === "ai" && (
                      <Card className="border rounded-2xl mb-4 bg-gray-50">
                        <CardHeader className="pb-2 pt-3 px-4 border-b rounded-t-2xl">
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
                    
                    <Card className="border rounded-2xl">
                      <CardHeader className="pb-2 pt-3 px-4 rounded-t-2xl">
                        <CardTitle className="text-sm font-medium">Activity Log</CardTitle>
                      </CardHeader>
                      <ScrollArea className="h-[300px] rounded-b-2xl">
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
                  <div className="grid grid-cols-3 gap-4 rounded-2xl bg-gray-50 p-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <h3 className="text-sm font-medium text-gray-600">Total Leads</h3>
                      <p className="text-2xl font-bold mt-2">{leads.length}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PowerDialer;
