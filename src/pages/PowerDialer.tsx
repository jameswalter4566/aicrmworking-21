import React, { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Phone, 
  PhoneOff, 
  User, 
  Mail, 
  Home, 
  Clock, 
  Calendar, 
  MoreHorizontal, 
  Play, 
  Pause, 
  Search,
  PhoneCall,
  AlertCircle
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import TwilioClient from "@/components/TwilioClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Phone3 from "@/components/icons/Phone3";

interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone1: string;
  phone2: string;
  stage: string;
  assigned: string;
  mailingAddress: string;
  propertyAddress: string;
  disposition?: string;
  lastContacted?: string;
  leadSource?: string;
  notes?: string;
  avatar?: string;
}

interface ActivityLog {
  id: number;
  leadId: number;
  type: 'call_attempt' | 'call_received' | 'message_sent' | 'message_received' | 'disposition_change' | 'system';
  timestamp: string;
  message: string;
  disposition?: string;
}

const dummyLeads: Lead[] = [
  {
    id: 1,
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    phone1: "+15551234567",
    phone2: "+15557654321",
    stage: "New Lead",
    assigned: "Study Bolt",
    mailingAddress: "123 Main St, Anytown USA",
    propertyAddress: "456 Oak Ave, Somewhere USA",
    disposition: "Interested",
    lastContacted: "2023-05-15",
    leadSource: "Website",
    notes: "Looking for a 3-bedroom home in the suburbs",
    avatar: "/placeholder.svg"
  },
  {
    id: 2,
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    phone1: "+15552345678",
    phone2: "+15558765432",
    stage: "Follow Up",
    assigned: "Study Bolt",
    mailingAddress: "789 Pine St, Anytown USA",
    propertyAddress: "321 Maple Dr, Somewhere USA",
    disposition: "Very Interested",
    lastContacted: "2023-05-20",
    leadSource: "Referral",
    notes: "Preapproved for $450k mortgage",
    avatar: "/placeholder.svg"
  },
  {
    id: 3,
    firstName: "Robert",
    lastName: "Johnson",
    email: "robert.j@example.com",
    phone1: "+15553456789",
    phone2: "+15559876543",
    stage: "New Lead",
    assigned: "Study Bolt",
    mailingAddress: "555 Cedar Ln, Anytown USA",
    propertyAddress: "777 Birch Rd, Somewhere USA",
    disposition: "Needs Follow Up",
    lastContacted: "2023-05-10",
    leadSource: "Open House",
    notes: "Looking in the downtown area",
    avatar: "/placeholder.svg"
  },
  {
    id: 4,
    firstName: "Emily",
    lastName: "Wilson",
    email: "emily.w@example.com",
    phone1: "+15554567890",
    phone2: "+15550987654",
    stage: "Contacted",
    assigned: "Study Bolt",
    mailingAddress: "888 Elm St, Anytown USA",
    propertyAddress: "999 Walnut Ave, Somewhere USA",
    disposition: "Call Back",
    lastContacted: "2023-05-22",
    leadSource: "Zillow",
    notes: "Interested in investment properties",
    avatar: "/placeholder.svg"
  },
  {
    id: 5,
    firstName: "Michael",
    lastName: "Brown",
    email: "michael.b@example.com",
    phone1: "+15555678901",
    phone2: "+15551098765",
    stage: "Nurturing",
    assigned: "Study Bolt",
    mailingAddress: "111 Spruce St, Anytown USA",
    propertyAddress: "222 Fir Dr, Somewhere USA",
    disposition: "Not Interested",
    lastContacted: "2023-05-18",
    leadSource: "Facebook Ad",
    notes: "Looking for commercial properties",
    avatar: "/placeholder.svg"
  }
];

const generateDummyLogs = (leadId: number): ActivityLog[] => {
  const types: Array<ActivityLog['type']> = [
    'call_attempt', 'call_received', 'message_sent', 
    'message_received', 'disposition_change', 'system'
  ];
  
  const logs: ActivityLog[] = [];
  const now = new Date();
  
  const count = 5 + Math.floor(Math.random() * 6);
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const minutesAgo = Math.floor(Math.random() * 60 * 24);
    const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000).toISOString();
    
    let message = '';
    let disposition = undefined;
    
    switch (type) {
      case 'call_attempt':
        message = 'Outbound call attempt';
        break;
      case 'call_received':
        message = 'Inbound call received';
        break;
      case 'message_sent':
        message = 'SMS sent: "Hi there, following up on our conversation about your property needs."';
        break;
      case 'message_received':
        message = 'SMS received: "Thanks for reaching out. I\'m still interested in exploring options."';
        break;
      case 'disposition_change':
        disposition = ['Interested', 'Very Interested', 'Not Interested', 'Call Back', 'Needs Follow Up'][Math.floor(Math.random() * 5)];
        message = `Disposition changed to ${disposition}`;
        break;
      case 'system':
        message = 'Lead imported from Zillow';
        break;
    }
    
    logs.push({
      id: leadId * 100 + i,
      leadId,
      type,
      timestamp,
      message,
      disposition
    });
  }
  
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const dummyActivityLogs: Record<number, ActivityLog[]> = {};
dummyLeads.forEach(lead => {
  dummyActivityLogs[lead.id] = generateDummyLogs(lead.id);
});

type CallStatus = "ready" | "in-progress" | "completed" | "no-answer" | "error";
type DialingMode = "single" | "power";

const PowerDialer = () => {
  const [leads, setLeads] = useState<Lead[]>(dummyLeads);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>(dummyLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [callStatuses, setCallStatuses] = useState<Record<number, CallStatus>>({});
  const [isDialerActive, setIsDialerActive] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState<number | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);
  const [dialingMode, setDialingMode] = useState<DialingMode>("single");
  const [simultaneousLines, setSimultaneousLines] = useState<number>(1);
  const [activityLogs, setActivityLogs] = useState<Record<number, ActivityLog[]>>(dummyActivityLogs);
  const dialerIntervalRef = useRef<number | null>(null);
  const [dialQueue, setDialQueue] = useState<number[]>([]);
  const [activeCallsCount, setActiveCallsCount] = useState(0);
  const [phoneSystemStatus, setPhoneSystemStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const processingDialRef = useRef(false);
  
  useEffect(() => {
    const filtered = leads.filter(lead => 
      `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone1.includes(searchTerm) ||
      lead.phone2.includes(searchTerm)
    );
    setFilteredLeads(filtered);
  }, [searchTerm, leads]);

  const handleDeviceReady = () => {
    setIsClientReady(true);
    setPhoneSystemStatus('ready');
    setStatusMessage(null);
    toast({
      title: "Dialer Ready",
      description: "You can now make calls to leads.",
    });
  };

  const handleCallError = (error: any) => {
    console.error("Call error:", error);
    
    // Check if this relates to audio permissions
    if (error.message && (
        error.message.includes("audio") || 
        error.message.includes("permission") ||
        error.message.includes("microphone")
    )) {
      setPhoneSystemStatus('error');
      setStatusMessage("Audio permission issue. Click Initialize Phone System button if it appears.");
    }
    
    if (activeLeadId) {
      setCallStatuses(prev => ({ ...prev, [activeLeadId]: "error" }));
      addActivityLog(activeLeadId, {
        type: 'system',
        message: `Call error: ${error.message || 'Unknown error'}`,
      });
      
      setActiveCallsCount(prev => Math.max(0, prev - 1));
      
      // Process next lead in queue after a short delay
      if (isDialerActive && dialingMode === "power") {
        setTimeout(() => {
          processNextLeadInQueue();
        }, 1000);
      }
    }
    
    toast({
      variant: "destructive",
      title: "Call Error",
      description: error.message || "There was an error with the call",
    });
  };

  const handleCallConnect = (connection: any) => {
    if (activeLeadId) {
      setCallStatuses(prev => ({ ...prev, [activeLeadId]: "in-progress" }));
      addActivityLog(activeLeadId, {
        type: 'call_attempt',
        message: 'Call connected',
      });
      toast({
        title: "Call Connected",
        description: "You are now connected to the lead.",
      });
    }
  };

  const handleCallDisconnect = () => {
    if (activeLeadId) {
      setCallStatuses(prev => ({ ...prev, [activeLeadId]: "completed" }));
      addActivityLog(activeLeadId, {
        type: 'call_attempt',
        message: 'Call ended',
      });
      
      setActiveCallsCount(prev => Math.max(0, prev - 1));
      
      // Process next lead in queue after a short delay
      if (isDialerActive && dialingMode === "power") {
        setTimeout(() => {
          processNextLeadInQueue();
        }, 1000);
      }
      
      setActiveLeadId(null);
      toast({
        title: "Call Ended",
        description: "The call has ended.",
      });
    }
  };

  const addActivityLog = (leadId: number, log: Omit<ActivityLog, 'id' | 'leadId' | 'timestamp'>) => {
    const timestamp = new Date().toISOString();
    const newLog: ActivityLog = {
      id: Date.now(),
      leadId,
      timestamp,
      ...log
    };

    setActivityLogs(prev => ({
      ...prev,
      [leadId]: [newLog, ...(prev[leadId] || [])]
    }));
  };

  const processNextLeadInQueue = () => {
    if (processingDialRef.current) {
      return;
    }
    
    if (!isDialerActive || activeCallsCount >= simultaneousLines) {
      return;
    }
    
    if (dialQueue.length === 0) {
      const newQueue = filteredLeads
        .filter(lead => !callStatuses[lead.id] || 
                       (callStatuses[lead.id] !== "in-progress" && 
                        callStatuses[lead.id] !== "ready"))
        .map(lead => lead.id);
      
      if (newQueue.length === 0) {
        stopDialerSession();
        toast({
          title: "Dialing Complete",
          description: "All available leads have been called.",
        });
        return;
      }
      
      setDialQueue(newQueue);
      // Trigger processing after state update
      setTimeout(() => processNextLeadInQueue(), 100);
      return;
    }
    
    processingDialRef.current = true;
    
    const nextLeadId = dialQueue[0];
    const updatedQueue = dialQueue.slice(1);
    setDialQueue(updatedQueue);
    
    initiateCall(nextLeadId).finally(() => {
      processingDialRef.current = false;
    });
  };

  useEffect(() => {
    if (isDialerActive && activeCallsCount < simultaneousLines && dialQueue.length > 0 && !processingDialRef.current) {
      const timer = setTimeout(() => {
        processNextLeadInQueue();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isDialerActive, activeCallsCount, simultaneousLines, dialQueue.length]);

  const initiateCall = async (leadId: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Lead not found",
      });
      return;
    }

    if (!window.twilioClient) {
      toast({
        variant: "destructive",
        title: "Phone Not Ready",
        description: "The phone system is not initialized. Please try again.",
      });
      return;
    }
    
    // Even if window.twilioClient exists, check if it's ready
    if (!window.twilioClient.isReady()) {
      // Try setting up the device first
      try {
        await window.twilioClient.setupDevice();
        // Still not ready after setup
        if (!window.twilioClient.isReady()) {
          throw new Error("Phone system is not ready. Please try again.");
        }
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Phone Not Ready",
          description: "The phone system is not ready. Please try again or check for the Initialize Phone System button.",
        });
        
        if (isDialerActive) {
          stopDialerSession();
        }
        return;
      }
    }

    setActiveCallsCount(prev => prev + 1);
    setActiveLeadId(leadId);
    setCallStatuses(prev => ({ ...prev, [leadId]: "ready" }));
    
    addActivityLog(leadId, {
      type: 'call_attempt',
      message: 'Initiating call...',
    });
    
    try {
      await window.twilioClient.makeCall(lead.phone1);
    } catch (error: any) {
      console.error("Failed to initiate call:", error);
      setCallStatuses(prev => ({ ...prev, [leadId]: "error" }));
      setActiveCallsCount(prev => Math.max(0, prev - 1));
      
      addActivityLog(leadId, {
        type: 'system',
        message: `Call error: ${error.message || 'Failed to initiate call'}`,
      });
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: error.message || "Failed to initiate call",
      });
      
      if (isDialerActive && dialingMode === "power") {
        // Schedule next call after a short delay
        setTimeout(() => {
          processNextLeadInQueue();
        }, 1000);
      }
    }
  };

  const endCall = (leadId: number) => {
    if (window.twilioClient && window.twilioClient.connection) {
      window.twilioClient.hangupCall();
      setCallStatuses(prev => ({ ...prev, [leadId]: "completed" }));
      setActiveLeadId(null);
      setActiveCallsCount(prev => Math.max(0, prev - 1));
      
      addActivityLog(leadId, {
        type: 'call_attempt',
        message: 'Call manually ended',
      });
      
      if (isDialerActive && dialingMode === "power") {
        setTimeout(() => {
          processNextLeadInQueue();
        }, 1000);
      }
    }
  };

  const startSingleDialSession = () => {
    // Try to handle the case where window.twilioClient doesn't exist yet
    if (!window.twilioClient) {
      setPhoneSystemStatus('error');
      setStatusMessage("Phone system not initialized. Check your browser's microphone permissions.");
      toast({
        variant: "destructive",
        title: "Phone Not Ready",
        description: "The phone system is not initialized. Please try again or check for the Initialize Phone System button.",
      });
      return;
    }
    
    // Check if it's ready, but don't block the operation completely
    // The initiateCall function will try to setup the device if needed
    setIsDialerActive(true);
    toast({
      title: "Single Dialer Active",
      description: "Starting to call leads one at a time.",
    });
    
    const newQueue = filteredLeads
      .filter(lead => !callStatuses[lead.id] || 
                     (callStatuses[lead.id] !== "in-progress" && 
                      callStatuses[lead.id] !== "ready"))
      .map(lead => lead.id);
    
    if (newQueue.length === 0) {
      setIsDialerActive(false);
      toast({
        title: "No Leads Available",
        description: "All leads have been contacted. Reset call statuses to try again.",
      });
      return;
    }
    
    setDialQueue(newQueue);
    // Trigger the first call
    setTimeout(() => processNextLeadInQueue(), 100);
  };

  const startPowerDialSession = () => {
    // Try to handle the case where window.twilioClient doesn't exist yet
    if (!window.twilioClient) {
      setPhoneSystemStatus('error');
      setStatusMessage("Phone system not initialized. Check your browser's microphone permissions.");
      toast({
        variant: "destructive",
        title: "Phone Not Ready",
        description: "The phone system is not initialized. Please try again or check for the Initialize Phone System button.",
      });
      return;
    }
    
    // Check if it's ready, but don't block the operation completely
    // The initiateCall function will try to setup the device if needed
    setIsDialerActive(true);
    toast({
      title: "Power Dialer Active",
      description: `Starting to call leads with ${simultaneousLines} line${simultaneousLines > 1 ? 's' : ''}.`,
    });
    
    const newQueue = filteredLeads
      .filter(lead => !callStatuses[lead.id] || 
                     (callStatuses[lead.id] !== "in-progress" && 
                      callStatuses[lead.id] !== "ready"))
      .map(lead => lead.id);
    
    if (newQueue.length === 0) {
      setIsDialerActive(false);
      toast({
        title: "No Leads Available",
        description: "All leads have been contacted. Reset call statuses to try again.",
      });
      return;
    }
    
    setDialQueue(newQueue);
    // Trigger the first set of calls
    setTimeout(() => processNextLeadInQueue(), 100);
  };

  const startDialerSession = () => {
    if (dialingMode === "single") {
      startSingleDialSession();
    } else {
      startPowerDialSession();
    }
  };

  const stopDialerSession = () => {
    setIsDialerActive(false);
    setDialQueue([]);
    
    if (activeLeadId) {
      endCall(activeLeadId);
    }
    
    toast({
      title: "Dialer Paused",
      description: "Dialing session has been paused.",
    });
  };

  const resetCallStatuses = () => {
    setCallStatuses({});
    toast({
      title: "Call Statuses Reset",
      description: "All call statuses have been reset.",
    });
  };

  const getStatusBadge = (status: CallStatus | undefined) => {
    switch (status) {
      case "ready":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Connecting...</Badge>;
      case "in-progress":
        return <Badge variant="outline" className="bg-green-100 text-green-800">In Progress</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Completed</Badge>;
      case "no-answer":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">No Answer</Badge>;
      case "error":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    return () => {
      if (window.twilioClient && window.twilioClient.connection) {
        window.twilioClient.hangupCall();
      }
      
      if (dialerIntervalRef.current) {
        clearInterval(dialerIntervalRef.current);
      }
    };
  }, []);

  return (
    <MainLayout>
      <TwilioClient 
        onDeviceReady={handleDeviceReady}
        onCallConnect={handleCallConnect}
        onCallDisconnect={handleCallDisconnect}
        onError={handleCallError}
      />
      
      <div className="flex flex-col h-[calc(100vh-7rem)] space-y-4">
        <div className="h-1/2 grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="md:col-span-2 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone3 className="h-6 w-6 mr-2 text-primary" />
                Power Dialer
              </CardTitle>
              <CardDescription>
                Call multiple leads automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Dialing Mode</h3>
                  <div className="flex space-x-4">
                    <Button 
                      variant={dialingMode === "single" ? "default" : "outline"}
                      onClick={() => setDialingMode("single")}
                      className="flex-1"
                      disabled={isDialerActive}
                    >
                      Single Dial
                    </Button>
                    <Button 
                      variant={dialingMode === "power" ? "default" : "outline"}
                      onClick={() => setDialingMode("power")}
                      className="flex-1"
                      disabled={isDialerActive}
                    >
                      Power Dial
                    </Button>
                  </div>
                </div>
                
                {dialingMode === "power" && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Simultaneous Lines</h3>
                    <RadioGroup 
                      className="flex space-x-4" 
                      value={simultaneousLines.toString()} 
                      onValueChange={(val) => setSimultaneousLines(parseInt(val))}
                      disabled={isDialerActive}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id="lines-1" />
                        <label htmlFor="lines-1">1 Line</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id="lines-2" />
                        <label htmlFor="lines-2">2 Lines</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="3" id="lines-3" />
                        <label htmlFor="lines-3">3 Lines</label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                
                <div className="flex items-center justify-center space-x-2">
                  <Button 
                    variant={isDialerActive ? "destructive" : "default"}
                    size="lg"
                    className="flex-1"
                    onClick={isDialerActive ? stopDialerSession : startDialerSession}
                  >
                    {isDialerActive ? (
                      <>
                        <Pause className="mr-2 h-5 w-5" />
                        Stop Dialing
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        Start Dialing
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={resetCallStatuses}
                    disabled={isDialerActive || Object.keys(callStatuses).length === 0}
                    title="Reset all call statuses"
                  >
                    Reset
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-slate-50 rounded-md flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-2 ${phoneSystemStatus === 'ready' ? 'bg-green-500' : phoneSystemStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm flex items-center">
                    {phoneSystemStatus === 'ready' 
                      ? 'Phone Ready' 
                      : phoneSystemStatus === 'error' 
                        ? <div className="flex items-center text-red-700">
                            <AlertCircle className="h-3 w-3 mr-1" /> Phone Error
                          </div>
                        : 'Initializing...'}
                  </span>
                </div>
                {statusMessage && (
                  <span className="text-xs text-orange-700">{statusMessage}</span>
                )}
                {activeLeadId ? (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    Active Call
                  </Badge>
                ) : isDialerActive ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    Dialer Active
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-3 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                {activeLeadId 
                  ? `Showing activity for ${leads.find(l => l.id === activeLeadId)?.firstName} ${leads.find(l => l.id === activeLeadId)?.lastName}`
                  : 'Select a lead to view activity'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {activeLeadId ? (
                <div className="space-y-3">
                  {activityLogs[activeLeadId]?.map(log => (
                    <div 
                      key={log.id} 
                      className={`flex ${['message_sent', 'call_attempt', 'disposition_change'].includes(log.type) ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 ${
                          ['message_sent', 'call_attempt', 'disposition_change'].includes(log.type)
                            ? 'bg-blue-100 text-blue-800'
                            : ['message_received', 'call_received'].includes(log.type)
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-50 text-yellow-800'
                        }`}
                      >
                        <div className="text-sm">{log.message}</div>
                        <div className="text-xs mt-1 opacity-70">{formatTimestamp(log.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                  {(!activityLogs[activeLeadId] || activityLogs[activeLeadId].length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      No activity recorded for this lead
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <PhoneCall className="h-12 w-12 mb-4 opacity-30" />
                  <p>Select a lead to view their activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="h-1/2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Leads ({filteredLeads.length})</h2>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Contacted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map(lead => (
                  <TableRow 
                    key={lead.id} 
                    className={`cursor-pointer ${activeLeadId === lead.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setActiveLeadId(lead.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <User className="h-4 w-4" />
                        </Avatar>
                        {lead.firstName} {lead.lastName}
                      </div>
                    </TableCell>
                    <TableCell>{lead.phone1}</TableCell>
                    <TableCell>
                      {getStatusBadge(callStatuses[lead.id]) || (
                        <Badge variant="outline" className="bg-gray-100">{lead.stage}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{lead.lastContacted || 'Never'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {callStatuses[lead.id] === "in-progress" ? (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); endCall(lead.id); }}
                          >
                            <PhoneOff className="h-4 w-4 mr-2" />
                            End
                          </Button>
                        ) : (
                          <Button 
                            variant={activeLeadId === lead.id ? "default" : "outline"} 
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); initiateCall(lead.id); }}
                            disabled={callStatuses[lead.id] === "ready" || 
                                     (isDialerActive && dialingMode === "power") || 
                                     (activeLeadId
