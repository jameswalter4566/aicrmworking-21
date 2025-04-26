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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfoCircledIcon, Cross2Icon } from "@radix-ui/react-icons";
import { Phone } from "lucide-react";
import TwilioScript from "@/components/TwilioScript";
import { AudioDebugModal } from "@/components/AudioDebugModal";
import { AudioInitializer } from "@/components/AudioInitializer";
import { toast } from "sonner";
import PreviewDialerWindow from "@/components/power-dialer/PreviewDialerWindow";
import { ConnectedLeadPanel } from "@/components/power-dialer/ConnectedLeadPanel";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";

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
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [isDialing, setIsDialing] = useState(false);
  const [connectedLeadData, setConnectedLeadData] = useState<any>(null);

  const twilioState = useTwilio();
  const hasActiveCall = Object.keys(twilioState.activeCalls).length > 0;

  useEffect(() => {
    console.log('[PowerDialer] connectedLeadData updated:', connectedLeadData);
  }, [connectedLeadData]);

  useEffect(() => {
    if (window.Twilio && window.Twilio.Device) {
      console.log("Twilio device available:", window.Twilio.Device);
      setTwilioReady(true);
      
      return () => {};
    }
  }, [isScriptLoaded]);

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
      toast("Phone System Not Ready", {
        description: "Please wait for the phone system to initialize."
      });
      return;
    }

    if (callInProgress) {
      toast("Call Already in Progress", {
        description: "Please end the current call before starting a new one."
      });
      return;
    }
    
    try {
      setIsDialing(true);
      setConnectedLeadData(null);
      
      const initialized = await twilioService.initializeTwilioDevice();
      console.log("Twilio initialization:", initialized ? "successful" : "failed");
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCallInProgress(true);
      
      const formattedPhone = lead.phone.replace(/\D/g, '');
      const callResult = await twilioService.makeCall(formattedPhone, lead.id);
      
      console.log("Call result:", callResult);
      
      if (!callResult.success) {
        console.error("Call failed:", JSON.stringify(callResult));
        toast("Call Failed", {
          description: callResult.error || "Unable to place call. Please check if the number is valid."
        });
        setCallInProgress(false);
        setIsDialing(false);
      } else {
        toast("Call Initiated", {
          description: `Calling ${lead.name}...`
        });
      }
    } catch (error: any) {
      console.error("Error making call:", error);
      setTokenError(error.message);
      setCallInProgress(false);
      setIsDialing(false);
      
      toast("Call Error", {
        description: error.message || "Error placing call."
      });
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
    setConnectedLeadData(null);
  };

  const handleDisposition = (type: string) => {
    if (!currentCall) return;
    
    toast("Call Dispositioned", {
      description: `Call marked as ${type}`
    });
    
    handleEndCall(currentCall.parameters.leadId);
  };

  useEffect(() => {
    const activeCall = Object.values(twilioState.activeCalls)[0];
    console.log('[PowerDialer] Active call status changed:', activeCall?.status);
    console.log('[PowerDialer] Active call leadId:', activeCall?.leadId);
    
    if (activeCall?.leadId) {
      const fetchLeadData = async () => {
        try {
          console.log('[PowerDialer] Fetching lead data for:', activeCall.leadId);
          setIsDialing(true);
          
          const { data, error } = await supabase.functions.invoke('lead-connected', {
            body: { 
              leadId: activeCall.leadId,
              callData: {
                callSid: activeCall.callSid,
                status: activeCall.status || 'unknown',
                timestamp: new Date().toISOString()
              }
            }
          });

          if (error) {
            console.error('[PowerDialer] Error from lead-connected:', error);
            throw error;
          }
          
          console.log('[PowerDialer] Full response from lead-connected:', data);
          
          if (data?.lead) {
            console.log('[PowerDialer] Setting connected lead data from response:', data.lead);
            
            const leadInfo = {
              first_name: data.lead.first_name || 'Unknown',
              last_name: data.lead.last_name || 'Contact',
              phone1: data.lead.phone1 || activeCall.phoneNumber || '---',
              email: data.lead.email || '---',
              property_address: data.lead.property_address || '---',
              mailing_address: data.lead.mailing_address || '---'
            };
            
            console.log('[PowerDialer] Forcing lead data for component:', leadInfo);
            setConnectedLeadData(leadInfo);
          } else {
            console.log('[PowerDialer] No lead data in response, creating fallback data');
            const fallbackData = {
              first_name: 'Unknown',
              last_name: 'Contact',
              phone1: activeCall.phoneNumber || '---',
              email: '---',
              property_address: '---',
              mailing_address: '---'
            };
            setConnectedLeadData(fallbackData);
          }
          
          setTimeout(() => {
            setIsDialing(false);
          }, 500);
        } catch (err) {
          console.error('[PowerDialer] Error fetching lead data:', err);
          const errorFallbackData = {
            first_name: 'Error',
            last_name: 'Loading Lead',
            phone1: activeCall.phoneNumber || '---',
            email: '---',
            property_address: '---',
            mailing_address: '---'
          };
          setConnectedLeadData(errorFallbackData);
          toast.error('Failed to load lead details');
          setIsDialing(false);
        }
      };

      fetchLeadData();
    }
  }, [twilioState.activeCalls]);

  useEffect(() => {
    const activeCall = Object.values(twilioState.activeCalls)[0];
    if (activeCall?.status === 'completed' || activeCall?.status === 'failed') {
      setIsDialing(false);
      setConnectedLeadData(null);
      console.log('[PowerDialer] Call completed/failed, cleared lead data and dialing state');
    }
  }, [twilioState.activeCalls]);

  useEffect(() => {
    console.log('Rendering PowerDialer with state:', {
      hasData: !!connectedLeadData,
      isDialing,
      hasActiveCall,
      callStatus: Object.values(twilioState.activeCalls)[0]?.status,
      leadDataKeys: connectedLeadData ? Object.keys(connectedLeadData) : []
    });
  }, [connectedLeadData, isDialing, hasActiveCall, twilioState.activeCalls]);

  const DialerTab = () => (
    <div className="flex flex-col space-y-4">
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
                    toast("System Reset", {
                      description: "All active calls have been terminated. The system has been reset."
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
                    toast("System Reinitialized", {
                      description: "The phone system has been reinitialized with a new token."
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

      <PreviewDialerWindow 
        currentCall={Object.values(twilioState.activeCalls)[0]}
        onDisposition={handleDisposition}
        onEndCall={() => Object.keys(twilioState.activeCalls).forEach(id => handleEndCall(id))}
      />

      {Object.keys(twilioState.activeCalls).length > 0 && (
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

      <ConnectedLeadPanel 
        leadData={connectedLeadData}
      />

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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audio Settings</CardTitle>
          <CardDescription>
            Configure your audio devices for calls
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                      toast("Audio Test", {
                        description: "Audio playback successful. If you didn't hear anything, check your volume settings."
                      });
                    } else {
                      toast("Audio Test Failed", {
                        description: "Could not play audio test. Check your speakers and volume."
                      });
                    }
                  }
                }}
              >
                Test Audio
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );

  const ScriptsTab = () => (
    <div className="space-y-4">
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
    </div>
  );

  return (
    <MainLayout>
      <TwilioScript
        onLoad={() => setIsScriptLoaded(true)}
        onError={(err) => console.error("TwilioScript error:", err)}
      />
      
      <AudioDebugModal />
      
      <div className="container py-4 px-4 md:px-6">
        <div className="flex flex-col space-y-2 mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Power Dialer</h1>
          <p className="text-muted-foreground">
            Make outbound calls to your leads in queue
          </p>

          {tokenError && (
            <Alert variant="destructive">
              <AlertTitle>Token Error</AlertTitle>
              <AlertDescription>{tokenError}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center space-x-2">
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
        </div>

        <Tabs
          defaultValue="dialer"
          value={currentTab}
          onValueChange={setCurrentTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="dialer" onClick={() => setCurrentTab("dialer")}>
              Dialer
            </TabsTrigger>
            <TabsTrigger value="settings" onClick={() => setCurrentTab("settings")}>
              Settings
            </TabsTrigger>
            <TabsTrigger value="scripts" onClick={() => setCurrentTab("scripts")}>
              Scripts
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dialer" className="space-y-4">
            <DialerTab />
          </TabsContent>
          <TabsContent value="settings" className="space-y-4">
            <SettingsTab />
          </TabsContent>
          <TabsContent value="scripts" className="space-y-4">
            <ScriptsTab />
          </TabsContent>
        </Tabs>
        
        <TwilioAudioPlayer sound="/sounds/test-tone.mp3" />
      </div>
    </MainLayout>
  );
}
