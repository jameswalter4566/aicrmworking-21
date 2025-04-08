import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { useTwilio } from "@/hooks/use-twilio";
import { twilioService } from "@/services/twilio";
import { GlobalAudioSettings } from "@/components/GlobalAudioSettings";
import { CallControls } from "@/components/CallControls";
import TwilioAudioPlayer from "@/components/TwilioAudioPlayer";
import AudioDeviceSelector from "@/components/AudioDeviceSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfoCircledIcon, Cross2Icon } from "@radix-ui/react-icons";
import { Phone, PhoneCall, Clock, RotateCw, Pause, PhoneOff, StopCircle } from "lucide-react";
import TwilioScript from "@/components/TwilioScript";
import { AudioDebugModal } from "@/components/AudioDebugModal";
import { AudioInitializer } from "@/components/AudioInitializer";
import { toast } from "@/components/ui/use-toast";

const SAMPLE_LEADS = [
  {
    id: "1",
    name: "John Smith",
    company: "Acme Inc",
    phone: "+18884659876",
    status: "New",
    priority: "High",
  },
  {
    id: "2",
    name: "James Walter",
    company: "Golden Pathway Financial",
    phone: "+17142449021", 
    status: "New",
    priority: "High",
  },
  {
    id: "3",
    name: "Michael Brown",
    company: "XYZ Solutions",
    phone: "+18007779999",
    status: "New",
    priority: "Low",
  },
  {
    id: "4",
    name: "Jennifer Davis",
    company: "Global Tech",
    phone: "+918320354644",
    status: "New",
    priority: "High",
  },
  {
    id: "5",
    name: "Robert Wilson",
    company: "InnoTech",
    phone: "+14155551234",
    status: "Contacted",
    priority: "Medium",
  },
  {
    id: "6",
    name: "Lisa Martinez",
    company: "ABC Consulting",
    phone: "+12125557890",
    status: "New",
    priority: "High",
  },
];

export default function PowerDialer() {
  const [currentTab, setCurrentTab] = useState("dialer");
  const [leads, setLeads] = useState(SAMPLE_LEADS);
  const [sortBy, setSortBy] = useState("priority");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAudioDebugOpen, setIsAudioDebugOpen] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [twilioReady, setTwilioReady] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [callInProgress, setCallInProgress] = useState(false);
  const [dialingSessionActive, setDialingSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState<string>("00:00:00");
  const [selectedDisposition, setSelectedDisposition] = useState<string | null>(null);

  const twilioState = useTwilio();

  useEffect(() => {
    if (window.Twilio && window.Twilio.Device) {
      console.log("Twilio device available:", window.Twilio.Device);
      setTwilioReady(true);
      
      return () => {};
    }
  }, [isScriptLoaded]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (dialingSessionActive && sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - sessionStartTime.getTime();
        
        const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        
        setSessionDuration(`${hours}:${minutes}:${seconds}`);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dialingSessionActive, sessionStartTime]);

  const startDialingSession = () => {
    setDialingSessionActive(true);
    setSessionStartTime(new Date());
    toast({
      title: "Dialing Session Started",
      description: "You can now begin calling leads.",
    });
  };

  const stopDialingSession = () => {
    setDialingSessionActive(false);
    setSessionStartTime(null);
    setSessionDuration("00:00:00");
    toast({
      title: "Dialing Session Ended",
      description: "Your dialing session has been stopped.",
    });
    
    twilioState.endAllCalls();
    setCallInProgress(false);
  };

  const handleDisposition = (disposition: string) => {
    setSelectedDisposition(disposition);
    
    if (Object.keys(twilioState.activeCalls).length > 0) {
      const leadId = Object.keys(twilioState.activeCalls)[0];
      updateLeadStatus(leadId, disposition);
      
      toast({
        title: "Lead Dispositioned",
        description: `Lead has been marked as "${disposition}".`,
      });
    }
  };

  const filteredAndSortedLeads = React.useMemo(() => {
    return leads
      .filter((lead) =>
        filterStatus === "all" ? true : lead.status === filterStatus
      )
      .sort((a, b) => {
        if (sortBy === "priority") {
          const priorityWeight: Record<string, number> = {
            High: 3,
            Medium: 2,
            Low: 1,
          };
          return priorityWeight[b.priority] - priorityWeight[a.priority];
        } else if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        } else {
          return a.company.localeCompare(b.company);
        }
      });
  }, [leads, filterStatus, sortBy]);

  const handleCallLead = async (lead: any) => {
    if (!twilioState.initialized && !isScriptLoaded) {
      toast({
        title: "Phone System Not Ready",
        description: "Please wait for the phone system to initialize.",
        variant: "destructive",
      });
      return;
    }

    if (callInProgress) {
      toast({
        title: "Call Already in Progress",
        description: "Please end the current call before starting a new one.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const initialized = await twilioService.initializeTwilioDevice();
      console.log("Twilio initialization:", initialized ? "successful" : "failed");
      
      setIsDialing(true);
      setCallInProgress(true);
      
      const callResult = await twilioState.makeCall(lead.phone, lead.id);
      
      if (!callResult.success) {
        console.error("Call failed:", JSON.stringify(callResult));
        toast({
          title: "Call Failed",
          description: callResult.error || "Unable to place call.",
          variant: "destructive",
        });
        setCallInProgress(false);
      }
    } catch (error: any) {
      console.error("Error making call:", error);
      setTokenError(error.message);
      
      toast({
        title: "Call Error",
        description: error.message || "Error placing call.",
        variant: "destructive",
      });
      setCallInProgress(false);
    }
  };

  const updateLeadStatus = (leadId: string, newStatus: string) => {
    setLeads(leads.map(lead => 
      lead.id === leadId ? { ...lead, status: newStatus } : lead
    ));
  };

  const handleEndCall = async (leadId: string) => {
    await twilioState.endCall(leadId);
    updateLeadStatus(leadId, "Contacted");
    setCallInProgress(false);
  };

  const [isDialing, setIsDialing] = useState(false);

  const getDispositionStyle = (type: string) => {
    switch(type) {
      case "Contacted":
        return "bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200";
      case "Not Contacted":
        return "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200";
      case "Appointment Set":
        return "bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200";
      case "Submitted":
        return "bg-green-100 hover:bg-green-200 text-green-700 border-green-200";
      case "Dead":
        return "bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200";
      case "DNC":
        return "bg-red-100 hover:bg-red-200 text-red-700 border-red-200";
      default:
        return "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200";
    }
  };

  const DialerPreview = () => (
    <Card className="mb-4 relative overflow-hidden">
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <div>
          <CardTitle className="text-2xl font-bold tracking-tight">Power Dialer</CardTitle>
          <CardDescription>
            Make outbound calls to your leads in queue
          </CardDescription>
          
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant={twilioState.initialized ? "default" : "outline"}>
              {twilioState.initialized ? "System Ready" : "Initializing..."}
            </Badge>
            <Badge variant={twilioState.microphoneActive ? "default" : "destructive"}>
              {twilioState.microphoneActive ? "Microphone Active" : "Microphone Inactive"}
            </Badge>
            <Badge variant={twilioState.audioStreaming ? "default" : "outline"}>
              {twilioState.audioStreaming ? "Streaming Active" : "Streaming Inactive"}
            </Badge>
          </div>
          
          <Tabs
            defaultValue="dialer"
            value={currentTab}
            onValueChange={setCurrentTab}
            className="mt-4"
          >
            <TabsList>
              <TabsTrigger value="dialer" onClick={() => setCurrentTab("dialer")}>
                Dialer
              </TabsTrigger>
              <TabsTrigger value="settings" onClick={() => setCurrentTab("settings")}>
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {dialingSessionActive && (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{sessionDuration}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Session started at {sessionStartTime?.toLocaleTimeString()}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="min-h-[300px] flex">
        {currentTab === "dialer" ? (
          <div className="flex-1 flex items-center justify-center">
            {!dialingSessionActive ? (
              <Button 
                onClick={startDialingSession} 
                className="bg-crm-blue hover:bg-crm-blue/90 px-8 py-6 h-auto text-lg"
              >
                <PhoneCall className="mr-2 h-5 w-5" />
                Begin Dialing Session
              </Button>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {Object.keys(twilioState.activeCalls).length === 0 ? (
                  <div className="text-center text-muted-foreground">
                    <PhoneCall className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                    <p>No active calls</p>
                    <p className="text-sm">Select a lead from the queue below to start calling</p>
                  </div>
                ) : (
                  <Card className="w-full bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      {Object.entries(twilioState.activeCalls).map(([leadId, call]) => {
                        const lead = leads.find(l => l.id === leadId);
                        return (
                          <div key={leadId} className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium text-lg">{lead?.name}</h3>
                              <p className="text-muted-foreground">{call.phoneNumber}</p>
                              <Badge variant={call.status === 'in-progress' ? "default" : "outline"}>
                                {call.status === 'connecting' ? 'Ringing' : 
                                call.status === 'in-progress' ? 'Connected' :
                                call.status === 'completed' ? 'Ended' : 
                                call.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="space-y-4">
              <Alert variant={twilioState.microphoneActive ? "default" : "destructive"}>
                <InfoCircledIcon className="h-4 w-4" />
                <AlertTitle>Microphone Status</AlertTitle>
                <AlertDescription>
                  {twilioState.microphoneActive 
                    ? "Microphone is active and ready for calls."
                    : "Microphone access is not available. Check browser permissions."}
                </AlertDescription>
              </Alert>
              
              <AudioDeviceSelector 
                onDeviceChange={async (deviceId) => {
                  const success = await twilioState.setAudioOutputDevice(deviceId);
                  return success;
                }}
                onRefreshDevices={async () => {
                  return twilioState.refreshAudioDevices();
                }}
                onTestAudio={async (deviceId) => {
                  return twilioState.testAudio(deviceId);
                }}
                devices={twilioState.audioOutputDevices}
                currentDeviceId={twilioState.currentAudioDevice}
              />
              
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAudioDebugOpen(true)}
                >
                  Advanced Diagnostics
                </Button>
                
                <Button 
                  onClick={async () => {
                    const deviceId = twilioState.currentAudioDevice;
                    if (deviceId) {
                      const result = await twilioState.testAudio(deviceId);
                      if (result) {
                        toast({
                          title: "Audio Test",
                          description: "Audio playback successful. If you didn't hear anything, check your volume settings.",
                        });
                      } else {
                        toast({
                          title: "Audio Test Failed",
                          description: "Could not play audio test. Check your speakers and volume.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                >
                  Test Audio
                </Button>
              </div>
            </div>

            <GlobalAudioSettings />

            {!twilioState.initialized && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Initialize Phone System</CardTitle>
                  <CardDescription>
                    Set up the phone system for making and receiving calls
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <AudioInitializer />
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center">
                  System Controls
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const success = await twilioState.endAllCalls();
                        if (success) {
                          toast({
                            title: "System Reset",
                            description: "All active calls have been terminated. The system has been reset.",
                          });
                        }
                      }}
                    >
                      Reset All Calls
                    </Button>
                    
                    <Button
                      variant="default" 
                      size="sm"
                      onClick={async () => {
                        const initialized = await twilioService.initializeTwilioDevice();
                        if (initialized) {
                          toast({
                            title: "System Reinitialized",
                            description: "The phone system has been reinitialized with a new token.",
                          });
                        }
                      }}
                    >
                      Reinitialize System
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Reset your system and terminate all active calls if you encounter any issues
                </CardDescription>
              </CardHeader>
            </Card>
            
            <TabsContent value="scripts" className="mt-0 p-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Call Scripts</CardTitle>
                  <CardDescription>
                    Customizable scripts for different call scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="opening">Opening Script</Label>
                      <ScrollArea className="h-24 border rounded-md p-2 mt-1">
                        <div className="p-2">
                          Hello, my name is [Your Name] calling from [Company Name]. 
                          I'm reaching out today because we've been working with companies 
                          like yours to [brief value proposition]. Do you have a few minutes 
                          to chat about how we might be able to help your business?
                        </div>
                      </ScrollArea>
                    </div>

                    <div>
                      <Label htmlFor="objection">Objection Handling</Label>
                      <ScrollArea className="h-24 border rounded-md p-2 mt-1">
                        <div className="p-2">
                          I understand your concern about [objection]. Many of our current 
                          clients initially felt the same way. What they found, however, 
                          was that [counter to objection with specific benefit/result]. 
                          Would it make sense to at least explore if we could achieve 
                          similar results for your business?
                        </div>
                      </ScrollArea>
                    </div>

                    <div>
                      <Label htmlFor="closing">Closing Script</Label>
                      <ScrollArea className="h-24 border rounded-md p-2 mt-1">
                        <div className="p-2">
                          Based on what we've discussed, I think the next step would be to 
                          [specific action - demo, meeting with specialist, etc.]. We have 
                          availability on [propose specific times]. What works best for your schedule?
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline">Add New Script</Button>
                  <Button>Save Changes</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </div>
        )}
        
        {dialingSessionActive && (
          <div className="w-60 border-l pl-4 flex flex-col gap-2">
            <p className="font-medium text-sm mb-2">Disposition</p>
            
            <Button 
              variant="disposition" 
              className={`justify-start ${getDispositionStyle("Contacted")} ${selectedDisposition === "Contacted" ? "ring-2 ring-blue-400" : ""}`}
              onClick={() => handleDisposition("Contacted")}
            >
              Contacted
            </Button>
            
            <Button 
              variant="disposition" 
              className={`justify-start ${getDispositionStyle("Not Contacted")} ${selectedDisposition === "Not Contacted" ? "ring-2 ring-gray-400" : ""}`}
              onClick={() => handleDisposition("Not Contacted")}
            >
              Not Contacted
            </Button>
            
            <Button 
              variant="disposition" 
              className={`justify-start ${getDispositionStyle("Appointment Set")} ${selectedDisposition === "Appointment Set" ? "ring-2 ring-purple-400" : ""}`}
              onClick={() => handleDisposition("Appointment Set")}
            >
              Appointment Set
            </Button>
            
            <Button 
              variant="disposition" 
              className={`justify-start ${getDispositionStyle("Submitted")} ${selectedDisposition === "Submitted" ? "ring-2 ring-green-400" : ""}`}
              onClick={() => handleDisposition("Submitted")}
            >
              Submitted
            </Button>
            
            <Button 
              variant="disposition" 
              className={`justify-start ${getDispositionStyle("Dead")} ${selectedDisposition === "Dead" ? "ring-2 ring-orange-400" : ""}`}
              onClick={() => handleDisposition("Dead")}
            >
              Dead
            </Button>
            
            <Button 
              variant="disposition" 
              className={`justify-start ${getDispositionStyle("DNC")} ${selectedDisposition === "DNC" ? "ring-2 ring-red-400" : ""}`}
              onClick={() => handleDisposition("DNC")}
            >
              DNC
            </Button>
            
            <Separator className="my-2" />
            
            <Button 
              className="bg-gray-200 hover:bg-gray-300 text-gray-700"
              onClick={() => {
                toast({
                  title: "Redial",
                  description: "Redialing the last number...",
                });
              }}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Redial
            </Button>
            
            <Button 
              className="bg-yellow-200 hover:bg-yellow-300 text-yellow-700"
              onClick={() => {
                toast({
                  title: "Call Paused",
                  description: "Current call has been paused.",
                });
              }}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
            
            <Button 
              className="bg-orange-200 hover:bg-orange-300 text-orange-700"
              onClick={() => {
                if (Object.keys(twilioState.activeCalls).length > 0) {
                  const leadId = Object.keys(twilioState.activeCalls)[0];
                  handleEndCall(leadId);
                }
              }}
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Hang Up
            </Button>
            
            <Button 
              className="bg-red-500 hover:bg-red-600 text-white mt-4"
              onClick={stopDialingSession}
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Stop Session
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const DialerTab = () => (
    <div className="flex flex-col space-y-4">
      <DialerPreview />

      {!dialingSessionActive && Object.keys(twilioState.activeCalls).length > 0 && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex justify-between items-center">
              Active Call
              <Button
                variant="destructive"
                size="sm"
                onClick={() => 
                  twilioState.endAllCalls()
                }
              >
                End All Calls
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            {Object.entries(twilioState.activeCalls).map(([leadId, call]) => (
              <div key={leadId} className="mb-4">
                {leads.find(l => l.id === leadId) && (
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {leads.find(l => l.id === leadId)?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {call.phoneNumber}
                        </p>
                      </div>
                      <Badge variant={call.status === 'in-progress' ? "default" : "outline"}>
                        {call.status === 'connecting' ? 'Ringing' : 
                         call.status === 'in-progress' ? 'Connected' :
                         call.status === 'completed' ? 'Ended' : 
                         call.status}
                      </Badge>
                    </div>
                    
                    <CallControls
                      leadId={leadId}
                      phoneNumber={call.phoneNumber}
                      activeCall={call}
                      onCall={(phone, id) => {}}
                      onHangup={() => handleEndCall(leadId)}
                      onToggleMute={(id) => twilioState.toggleMute(id)}
                      onToggleSpeaker={(id) => twilioState.toggleSpeaker(id)}
                      audioOutputDevices={twilioState.audioOutputDevices}
                      currentAudioDevice={twilioState.currentAudioDevice}
                      onChangeAudioDevice={(deviceId) => twilioState.setAudioOutputDevice(deviceId)}
                      onRefreshDevices={() => twilioState.refreshAudioDevices()}
                      onTestAudio={(deviceId) => twilioState.testAudio(deviceId || '')}
                    />
                    
                    {!call.audioActive && call.status === 'in-progress' && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTitle>Audio Warning</AlertTitle>
                        <AlertDescription>
                          Microphone appears to be inactive. Check your browser permissions.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="h-full overflow-hidden flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Dialing Queue</CardTitle>
            <div className="flex space-x-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Attempted">Attempted</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>
            {filteredAndSortedLeads.length} leads ready to call
          </CardDescription>
        </CardHeader>
        <ScrollArea className="flex-1 h-[calc(100vh-450px)]">
          <CardContent>
            <div className="space-y-3">
              {filteredAndSortedLeads.map((lead) => (
                <Card key={lead.id} className="p-3 hover:bg-accent/50">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {lead.company}
                      </div>
                      <div className="text-sm">{lead.phone}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge
                        variant={
                          lead.status === "New"
                            ? "default"
                            : lead.status === "Attempted"
                            ? "secondary"
                            : "outline"
                        }
                        className="mb-2"
                      >
                        {lead.status}
                      </Badge>
                      <Badge
                        variant={
                          lead.priority === "High"
                            ? "destructive"
                            : lead.priority === "Medium"
                            ? "default"
                            : "outline"
                        }
                        className="mb-2"
                      >
                        {lead.priority}
                      </Badge>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleCallLead(lead)}
                        disabled={callInProgress || Object.keys(twilioState.activeCalls).length > 0}
                        className="w-16 h-8"
                      >
                        <Phone className="mr-1 h-3 w-3" /> Call
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );

  const SettingsTab = () => (
    <div className="space-y-4">
      <Alert variant={twilioState.microphoneActive ? "default" : "destructive"}>
        <InfoCircledIcon className="h-4 w-4" />
        <AlertTitle>Microphone Status</AlertTitle>
        <AlertDescription>
          {twilioState.microphoneActive 
            ? "Microphone is active and ready for calls."
            : "Microphone access is not available. Check browser permissions."}
        </AlertDescription>
      </Alert>
      
      <AudioDeviceSelector 
        onDeviceChange={async (deviceId) => {
          const success = await twilioState.setAudioOutputDevice(deviceId);
          return success;
        }}
        onRefreshDevices={async () => {
          return twilioState.refreshAudioDevices();
        }}
        onTestAudio={async (deviceId) => {
          return twilioState.testAudio(deviceId);
        }}
        devices={twilioState.audioOutputDevices}
        currentDeviceId={twilioState.currentAudioDevice}
      />
      
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setIsAudioDebugOpen(true)}
        >
          Advanced Diagnostics
        </Button>
        
        <Button 
          onClick={async () => {
            const deviceId = twilioState.currentAudioDevice;
            if (deviceId) {
              const result = await twilioState.testAudio(deviceId);
              if (result) {
                toast({
                  title: "Audio Test",
                  description: "Audio playback successful. If you didn't hear anything, check your volume settings.",
                });
              } else {
                toast({
                  title: "Audio Test Failed",
                  description: "Could not play audio test. Check your speakers and volume.",
                  variant: "destructive",
                });
              }
            }
          }}
        >
          Test Audio
        </Button>
      </div>

      <GlobalAudioSettings />

      {!twilioState.initialized && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Initialize Phone System</CardTitle>
            <CardDescription>
              Set up the phone system for making and receiving calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AudioInitializer />
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            System Controls
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const success = await twilioState.endAllCalls();
                  if (success) {
                    toast({
                      title: "
