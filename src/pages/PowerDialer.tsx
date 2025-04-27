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
import { useAuth } from '@/hooks/use-auth';
import { useLeadRealtime } from '@/hooks/use-lead-realtime';
import { LeadFoundIndicator } from '@/components/LeadFoundIndicator';

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
    console.log('[PowerDialer] connected lead data state:', connectedLeadData);
  }, [connectedLeadData]);

  useEffect(() => {
    if (window.Twilio && window.Twilio.Device) {
      console.log("Twilio device available:", window.Twilio.Device);
      setTwilioReady(true);
      
      return () => {};
    }
  }, [isScriptLoaded]);

  useEffect(() => {
    const activeCall = Object.values(twilioState.activeCalls)[0];
    console.log('[PowerDialer] Active call updated:', {
      callStatus: activeCall?.status,
      leadId: activeCall?.leadId,
      hasLeadData: !!connectedLeadData
    });
    
    if (activeCall?.leadId) {
      console.log('[PowerDialer] Setting connected lead data...');
      setConnectedLeadData(prevData => ({
        ...prevData,
        id: activeCall.leadId
      }));
    }
  }, [twilioState.activeCalls]);

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
        setConnectedLeadData(null);
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
      setConnectedLeadData(null);
      
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

  const handleCallNextLead = async () => {
    try {
      // End current call if any
      if (Object.keys(twilioState.activeCalls).length > 0) {
        await twilioState.endAllCalls();
        setCallInProgress(false);
        setConnectedLeadData(null);
      }
      
      const nextLead = filteredAndSortedLeads.find(lead => lead.status === "New");
      
      if (!nextLead) {
        toast("No More Leads", {
          description: "There are no more leads available to call."
        });
        return;
      }
      
      await handleCallLead(nextLead);
    } catch (error) {
      console.error('Error in handleCallNextLead:', error);
      toast.error("Failed to call next lead");
    }
  };

  const activeCall = Object.values(twilioState.activeCalls)[0];
  const activeLeadId = activeCall?.leadId || null;
  
  const { user } = useAuth(); // Get current user
  const { leadData: realtimeLeadData, isLoading: isLeadDataLoading, leadFound, refresh: refreshLeadData } = 
    useLeadRealtime(activeLeadId ? String(activeLeadId) : null, user?.id);

  useEffect(() => {
    if (realtimeLeadData) {
      setConnectedLeadData(realtimeLeadData);
    }
  }, [realtimeLeadData]);

  const refreshLatestLead = async () => {
    try {
      console.log('Manually fetching latest lead...');
      refreshLeadData();
      toast.success('Lead data refreshed');
    } catch (err) {
      console.error('Error in refreshLatestLead:', err);
      toast.error('Failed to refresh lead data');
    }
  };

  const fetchLeadData = async (leadId: string | number) => {
    try {
      console.log(`[PowerDialer] Fetching lead data for ID: ${leadId}`);
      setIsDialing(true);
      
      const { data, error } = await supabase.functions.invoke('lead-connected', {
        body: { 
          leadId: String(leadId),
          userId: user?.id,
          callData: {
            callSid: Object.values(twilioState.activeCalls)[0]?.callSid || null,
            status: Object.values(twilioState.activeCalls)[0]?.status || 'unknown',
            phoneNumber: Object.values(twilioState.activeCalls)[0]?.phoneNumber || null,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('[PowerDialer] Error from lead-connected:', error);
        throw error;
      }
      
      console.log('[PowerDialer] Response from lead-connected:', data);
      
      if (data?.lead) {
        console.log('[PowerDialer] Setting lead data from API response:', data.lead);
        setConnectedLeadData(data.lead);
      } else {
        console.log('[PowerDialer] No lead data in response, creating fallback data');
        const fallbackData = {
          first_name: 'Unknown',
          last_name: 'Contact',
          phone1: Object.values(twilioState.activeCalls)[0]?.phoneNumber || '---',
          phone2: '---',
          email: '---',
          property_address: '---',
          mailing_address: '---',
          disposition: 'Not Contacted',
          tags: []
        };
        setConnectedLeadData(fallbackData);
      }
      
      setIsDialing(false);
    } catch (err) {
      console.error('[PowerDialer] Error fetching lead data:', err);
      toast.error('Failed to load lead details');
      setIsDialing(false);
      
      const errorFallbackData = {
        first_name: 'Error',
        last_name: 'Loading Lead',
        phone1: Object.values(twilioState.activeCalls)[0]?.phoneNumber || '---',
        phone2: '---',
        email: '---',
        property_address: '---',
        mailing_address: '---',
        disposition: 'Not Contacted',
        tags: []
      };
      setConnectedLeadData(errorFallbackData);
    }
  };

  useEffect(() => {
    console.log('[PowerDialer] Active call status changed:', Object.values(twilioState.activeCalls)[0]?.status);
    console.log('[PowerDialer] Active call leadId:', Object.values(twilioState.activeCalls)[0]?.leadId);
    
    const activeCall = Object.values(twilioState.activeCalls)[0];
    if (activeCall?.leadId) {
      fetchLeadData(String(activeCall.leadId)); // Convert to string to ensure type safety
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
      leadDataKeys: connectedLeadData ? Object.keys(connectedLeadData) : [],
      leadDataValues: connectedLeadData ? {
        first_name: connectedLeadData.first_name,
        last_name: connectedLeadData.last_name,
        phone1: connectedLeadData.phone1
      } : null
    });
  }, [connectedLeadData, isDialing, hasActiveCall, twilioState.activeCalls]);

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('PowerDialer Debug Info:', {
        hasData: !!connectedLeadData,
        isDialing,
        hasActiveCall,
        callStatus: Object.values(twilioState.activeCalls)[0]?.status,
        leadData: connectedLeadData ? {
          id: connectedLeadData.id,
          first_name: connectedLeadData.first_name,
          last_name: connectedLeadData.last_name,
          phone1: connectedLeadData.phone1
        } : null
      });
    }
  }, [connectedLeadData, isDialing, hasActiveCall, twilioState.activeCalls]);

  return (
    <MainLayout>
      <LeadFoundIndicator isVisible={leadFound} />
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
                            setConnectedLeadData(null);
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
                onEndCall={async () => {
                  await twilioState.endAllCalls();
                  setConnectedLeadData(null);
                  handleCallNextLead(); // Automatically call next lead after disconnect
                }}
              />

              {Object.keys(twilioState.activeCalls).length > 0 && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between items-center">
                      Active Call
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          twilioState.endAllCalls();
                          setConnectedLeadData(null);
                        }}
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
                              onHangup={() => {
                                handleEndCall(leadId);
                                setConnectedLeadData(null);
                              }}
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
                onRefresh={refreshLatestLead}
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
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <SettingsTab />
          </TabsContent>
          
          <TabsContent value="scripts" className="space-y-4">
            <ScriptsTab />
          </TabsContent>
        </Tabs>
        
        {process.env.NODE_ENV === 'development' && connectedLeadData && (
          <div className="fixed bottom-5 right-5 bg-white p-4 rounded shadow-lg border border-green-500 z-50 max-w-md">
            <h3 className="font-bold flex justify-between">
              <span>Debug: Lead Data Present</span>
              <button onClick={() => console.log('Current lead data:', connectedLeadData)}>
                Log Data
              </button>
            </h3>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(connectedLeadData, null, 2)}
            </pre>
          </div>
        )}
        
        <TwilioAudioPlayer sound="/sounds/test-tone.mp3" />
      </div>
    </MainLayout>
  );
}

function SettingsTab() {
  return null;
}

function ScriptsTab() {
  return null;
}
