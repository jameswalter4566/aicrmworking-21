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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Loader2, PhoneOff, User, Mic, MicOff, Volume2, VolumeX, Settings, CheckCircle, XCircle, Clock, AlignJustify, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Import TwilioScript to load the Twilio SDK
import TwilioScript from "@/components/TwilioScript";
import { twilioService } from "@/services/twilio";
import { useTwilio } from "@/hooks/use-twilio";
import { CallControls } from "@/components/CallControls";
import AudioDeviceSelector from "@/components/AudioDeviceSelector";

type Lead = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  notes?: string;
  avatar?: string;
};

const defaultLeads: Lead[] = [
  {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+12025551234",
    status: "Not Contacted",
    notes: "Interested in premium plan",
  },
  {
    id: 2,
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@example.com",
    phone: "+12025559876",
    status: "Contacted",
    notes: "Scheduled follow-up next week",
  },
  {
    id: 3,
    firstName: "Michael",
    lastName: "Johnson",
    email: "michael.j@example.com",
    phone: "+12025553456",
    status: "Not Interested",
  },
  {
    id: 4,
    firstName: "Emily",
    lastName: "Wilson",
    email: "emily.wilson@example.com",
    phone: "+12025557890",
    status: "Not Contacted",
  },
  {
    id: 5,
    firstName: "David",
    lastName: "Brown",
    email: "david.brown@example.com",
    phone: "+12025552345",
    status: "Contacted",
    notes: "Wants to hear about new features",
  },
  {
    id: 6,
    firstName: "Sarah",
    lastName: "Miller",
    email: "sarah.miller@example.com",
    phone: "+12025556789",
    status: "Interested",
    notes: "Looking for enterprise solutions",
  },
  {
    id: 7,
    firstName: "Robert",
    lastName: "Taylor",
    email: "robert.t@example.com",
    phone: "+12025554567",
    status: "Not Contacted",
  },
  {
    id: 8,
    firstName: "Jennifer",
    lastName: "Anderson",
    email: "jennifer.a@example.com",
    phone: "+12025558901",
    status: "Not Interested",
    notes: "Already using competitor product",
  },
  {
    id: 9,
    firstName: "William",
    lastName: "Jackson",
    email: "william.j@example.com",
    phone: "+12025550123",
    status: "Contacted",
  },
  {
    id: 10,
    firstName: "Olivia",
    lastName: "White",
    email: "olivia.w@example.com",
    phone: "+12025554321",
    status: "Interested",
    notes: "Requested pricing information",
  },
];

const PowerDialer = () => {
  const [leads, setLeads] = useState<Lead[]>(defaultLeads);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [isDialing, setIsDialing] = useState(false);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(-1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [callNotes, setCallNotes] = useState("");
  const [callStatus, setCallStatus] = useState("ready");
  const [callTime, setCallTime] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [dialQueue, setDialQueue] = useState<number[]>([]);
  
  // Audio controls
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  
  // Twilio integration
  const twilio = useTwilio();
  const [twilioDevice, setTwilioDevice] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [twilioReady, setTwilioReady] = useState(false);
  
  useEffect(() => {
    if (twilio && twilio.twilioDevice) {
      console.log("Twilio device available:", twilio.twilioDevice);
      setTwilioDevice(twilio.twilioDevice);
      setTwilioReady(true);
      
      // Set up event listeners
      twilio.twilioDevice.on("ready", () => console.log("Twilio device is ready"));
      
      // Clean up event listeners
      return () => {
        twilio.twilioDevice.removeAllListeners();
      };
    }
  }, [twilio]);
  
  const startTimer = () => {
    if (timer) clearInterval(timer);
    
    setCallTime(0);
    const newTimer = setInterval(() => {
      setCallTime(prev => prev + 1);
    }, 1000);
    
    setTimer(newTimer);
  };
  
  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const startDialSession = async () => {
    if (selectedLeads.length === 0) {
      toast({
        title: "No leads selected",
        description: "Please select at least one lead to start dialing.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Generate a Twilio token
      const token = await twilioService.generateToken();
      console.log("Got Twilio token:", token);
      
      // Initialize the dialing session
      setIsDialing(true);
      setDialQueue([...selectedLeads]);
      
      toast({
        title: "Dialing Session Started",
        description: `Ready to call ${selectedLeads.length} leads`,
      });
      
      // Start with the first lead in the queue
      if (selectedLeads.length > 0) {
        const nextLeadIndex = leads.findIndex(lead => lead.id === selectedLeads[0]);
        setCurrentLeadIndex(nextLeadIndex);
      }
      
    } catch (error) {
      console.error("Error starting dial session:", error);
      toast({
        title: "Error",
        description: "Failed to initialize dialing session. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const dialCurrentLead = async () => {
    if (!twilioReady || currentLeadIndex === -1 || !leads[currentLeadIndex]) {
      console.error("Cannot dial: Twilio not ready or no lead selected");
      return;
    }
    
    const lead = leads[currentLeadIndex];
    setCallStatus("dialing");
    setIsConnecting(true);
    
    try {
      console.log(`Dialing ${lead.firstName} ${lead.lastName} at ${lead.phone}`);
      
      // Make the call through Twilio
      if (twilioDevice) {
        const call = await twilioDevice.connect({
          params: {
            To: lead.phone
          }
        });
        
        setActiveCall(call);
        
        call.on('accept', () => {
          setCallStatus("connected");
          setIsConnecting(false);
          startTimer();
        });
        
        call.on('disconnect', () => {
          setCallStatus("completed");
          setIsConnecting(false);
          stopTimer();
          setActiveCall(null);
        });
        
        call.on('error', (error: any) => {
          console.error("Call error:", error);
          setCallStatus("failed");
          setIsConnecting(false);
          stopTimer();
          setActiveCall(null);
          
          toast({
            title: "Call Error",
            description: `Error: ${error.message || "Unknown error"}`,
            variant: "destructive",
          });
        });
      }
      
    } catch (error) {
      console.error("Error dialing:", error);
      setCallStatus("failed");
      setIsConnecting(false);
      
      toast({
        title: "Dialing Error",
        description: "Could not connect the call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCallComplete = (newStatus: string) => {
    // Update the lead status in our leads list
    if (currentLeadIndex !== -1 && leads[currentLeadIndex]) {
      const updatedLeads = [...leads];
      updatedLeads[currentLeadIndex] = {
        ...updatedLeads[currentLeadIndex],
        status: newStatus,
        notes: callNotes || updatedLeads[currentLeadIndex].notes,
      };
      setLeads(updatedLeads);
    }
    
    // Clear call notes for next call
    setCallNotes("");
    
    // Remove this lead from the dial queue
    if (currentLeadIndex !== -1 && leads[currentLeadIndex]) {
      const leadId = leads[currentLeadIndex].id;
      setDialQueue(prev => prev.filter(id => id !== leadId));
    }
    
    // Move to next lead in queue
    if (dialQueue.length > 1) {
      const nextLeadId = dialQueue[1]; // The current lead is at position 0
      const nextLeadIndex = leads.findIndex(lead => lead.id === nextLeadId);
      setCurrentLeadIndex(nextLeadIndex);
    } else {
      // No more leads to dial
      setCurrentLeadIndex(-1);
      setIsDialing(false);
      
      toast({
        title: "Dialing Completed",
        description: "You've completed calls to all selected leads.",
      });
    }
  };

  const handleEndCall = () => {
    if (activeCall) {
      activeCall.disconnect();
    }
    
    setCallStatus("ended");
    stopTimer();
    setActiveCall(null);
    setIsConnecting(false);
  };
  
  const handleMuteToggle = () => {
    if (activeCall) {
      if (isMuted) {
        activeCall.mute(false);
      } else {
        activeCall.mute(true);
      }
      setIsMuted(!isMuted);
    }
  };
  
  const handleSpeakerToggle = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Implementation would depend on how audio output is being handled
  };

  const endDialingSession = () => {
    // Disconnect any active call
    if (activeCall) {
      activeCall.disconnect();
    }
    
    // Reset state
    setIsDialing(false);
    setCurrentLeadIndex(-1);
    setCallStatus("ready");
    stopTimer();
    setActiveCall(null);
    setDialQueue([]);
    
    toast({
      title: "Session Ended",
      description: "Dialing session has been terminated",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Interested":
        return "bg-green-100 text-green-800";
      case "Not Interested":
        return "bg-red-100 text-red-800";
      case "Contacted":
        return "bg-blue-100 text-blue-800";
      case "Not Contacted":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const isAllSelected = leads.length > 0 && leads.every(lead => selectedLeads.includes(lead.id));

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Power Dialer</h1>
            <div>
              {!isDialing ? (
                <Button 
                  className="bg-crm-blue hover:bg-crm-blue/90 rounded-lg"
                  onClick={startDialSession}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Start Dialing Session
                </Button>
              ) : (
                <Button 
                  variant="destructive"
                  className="rounded-lg"
                  onClick={endDialingSession}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  End Session
                </Button>
              )}
            </div>
          </div>

          {isDialing && currentLeadIndex !== -1 && leads[currentLeadIndex] && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="col-span-1 md:col-span-2 shadow-sm">
                <CardHeader className="bg-crm-blue/5 border-b pb-3">
                  <CardTitle className="text-lg font-medium">
                    Current Call
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-crm-blue/10 text-crm-blue text-xl">
                        {leads[currentLeadIndex].firstName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {leads[currentLeadIndex].firstName} {leads[currentLeadIndex].lastName}
                      </h3>
                      <p className="text-gray-600">{leads[currentLeadIndex].email}</p>
                      <p className="text-gray-600 font-medium">{leads[currentLeadIndex].phone}</p>
                      <Badge className={getStatusColor(leads[currentLeadIndex].status)}>
                        {leads[currentLeadIndex].status}
                      </Badge>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {callStatus === "dialing" && (
                          <>
                            <span className="inline-block h-3 w-3 rounded-full bg-yellow-400 animate-pulse"></span>
                            <span className="text-sm font-medium">Dialing...</span>
                          </>
                        )}
                        {callStatus === "connected" && (
                          <>
                            <span className="inline-block h-3 w-3 rounded-full bg-green-500"></span>
                            <span className="text-sm font-medium">Connected</span>
                          </>
                        )}
                        {callStatus === "completed" && (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">Completed</span>
                          </>
                        )}
                        {callStatus === "failed" && (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium">Failed</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{formatTime(callTime)}</span>
                      </div>
                    </div>
                    {(callStatus === "dialing" || callStatus === "connecting") && (
                      <Progress value={40} className="h-1" />
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="notes">Call Notes</Label>
                      <Input
                        id="notes"
                        placeholder="Add your call notes here..."
                        className="h-32"
                        value={callNotes}
                        onChange={(e) => setCallNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-2 justify-between">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMuteToggle()}
                        >
                          {isMuted ? (
                            <>
                              <MicOff className="h-4 w-4 mr-2" />
                              Unmute
                            </>
                          ) : (
                            <>
                              <Mic className="h-4 w-4 mr-2" />
                              Mute
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSpeakerToggle()}
                        >
                          {isSpeakerOn ? (
                            <>
                              <Volume2 className="h-4 w-4 mr-2" />
                              Speaker On
                            </>
                          ) : (
                            <>
                              <VolumeX className="h-4 w-4 mr-2" />
                              Speaker Off
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsSettingsOpen(true)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Audio Settings
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={handleEndCall}
                          disabled={callStatus !== "connected" && callStatus !== "dialing"}
                        >
                          <PhoneOff className="h-4 w-4 mr-2" />
                          End Call
                        </Button>
                        {callStatus === "ready" && (
                          <Button
                            className="bg-green-500 hover:bg-green-600"
                            onClick={dialCurrentLead}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="bg-crm-blue/5 border-b pb-3">
                  <CardTitle className="text-lg font-medium">Queue</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Leads in Queue:</span>
                      <span className="font-medium">{dialQueue.length}</span>
                    </div>
                    
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {dialQueue.map((leadId) => {
                          const lead = leads.find(l => l.id === leadId);
                          if (!lead) return null;
                          
                          return (
                            <div 
                              key={lead.id} 
                              className={`p-2 border rounded-md flex items-center justify-between ${
                                currentLeadIndex !== -1 && leads[currentLeadIndex]?.id === lead.id
                                  ? "bg-crm-blue/10 border-crm-blue/20"
                                  : "bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-crm-blue/10 text-crm-blue">
                                    {lead.firstName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="text-sm">
                                  <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                                  <p className="text-gray-500">{lead.phone}</p>
                                </div>
                              </div>
                              {currentLeadIndex !== -1 && leads[currentLeadIndex]?.id === lead.id && (
                                <Badge className="bg-crm-blue text-white">Current</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    
                    <Tabs defaultValue="status">
                      <TabsList className="w-full">
                        <TabsTrigger value="status" className="flex-1">Status Updates</TabsTrigger>
                        <TabsTrigger value="notes" className="flex-1">After Call Notes</TabsTrigger>
                      </TabsList>
                      <TabsContent value="status">
                        <div className="mt-2 space-y-2">
                          <Button
                            variant="ghost"
                            className="w-full border justify-start bg-green-50 hover:bg-green-100 text-green-700"
                            onClick={() => handleCallComplete("Interested")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark as Interested
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full border justify-start bg-red-50 hover:bg-red-100 text-red-700"
                            onClick={() => handleCallComplete("Not Interested")}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Mark as Not Interested
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full border justify-start"
                            onClick={() => handleCallComplete("Call Back Later")}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Call Back Later
                          </Button>
                        </div>
                      </TabsContent>
                      <TabsContent value="notes">
                        <div className="mt-2 space-y-2">
                          <Button
                            variant="ghost"
                            className="w-full border justify-start"
                            onClick={() => {
                              setCallNotes("Left voicemail");
                            }}
                          >
                            Left voicemail
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full border justify-start"
                            onClick={() => {
                              setCallNotes("Requested more information via email");
                            }}
                          >
                            Requested info via email
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full border justify-start"
                            onClick={() => {
                              setCallNotes("Wants a callback next week");
                            }}
                          >
                            Callback next week
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {isDialing && (currentLeadIndex === -1 || !leads[currentLeadIndex]) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Dialing Session</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  {dialQueue.length > 0 ? (
                    <>
                      <div className="mb-4 text-center">
                        <p className="text-lg font-medium">Ready to dial next lead</p>
                        <p className="text-gray-500">{dialQueue.length} leads remaining in queue</p>
                      </div>
                      <Button 
                        className="bg-crm-blue hover:bg-crm-blue/90"
                        onClick={() => {
                          const nextLeadId = dialQueue[0];
                          const nextLeadIndex = leads.findIndex(lead => lead.id === nextLeadId);
                          setCurrentLeadIndex(nextLeadIndex);
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Dial Next Lead
                      </Button>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                      <p className="text-lg font-medium">All leads have been called</p>
                      <p className="text-gray-500 mb-4">Your dialing session is complete</p>
                      <Button 
                        variant="outline" 
                        onClick={endDialingSession}
                      >
                        End Session
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {!isDialing && (
            <Card className="shadow-sm mb-6">
              <CardHeader className="bg-crm-blue/5 border-b pb-3">
                <CardTitle className="text-lg font-medium">Start Dialing</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-crm-blue/10 flex items-center justify-center mb-4">
                    <Phone className="h-10 w-10 text-crm-blue" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    Select leads to start calling
                  </h3>
                  <p className="text-gray-500 max-w-md mb-6">
                    Use the Power Dialer to efficiently call through your lead list.
                    Select the leads you want to call below.
                  </p>
                  <Button 
                    className="bg-crm-blue hover:bg-crm-blue/90"
                    onClick={startDialSession}
                    disabled={selectedLeads.length === 0}
                  >
                    Start Dialing ({selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''})
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="border-t p-6 bg-white">
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Leads to Dial</h2>
            </div>
            <div className="text-sm text-gray-500">
              {selectedLeads.length > 0 ? 
                `${selectedLeads.length} leads selected` : 
                `${leads.length} leads available`
              }
            </div>
          </div>
          
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden max-h-[300px] overflow-y-auto">
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
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className={`
                      hover:bg-gray-50 
                      ${currentLeadIndex !== -1 && leads[currentLeadIndex]?.id === lead.id ? 'bg-blue-50' : ''}
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
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-crm-blue/10 text-crm-blue">
                          {lead.firstName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{lead.firstName} {lead.lastName}</span>
                    </TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {lead.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      
      <TwilioScript />
      
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Audio Settings</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <AudioDeviceSelector 
              onDeviceChange={() => {}}
              onRefreshDevices={() => {}}
              onTestAudio={() => {}}
              devices={[]}
              currentDeviceId=""
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSettingsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default PowerDialer;
