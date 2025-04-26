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
    console.log('[PowerDialer] connectedLeadData state updated:', connectedLeadData);
  }, [connectedLeadData]);

  useEffect(() => {
    console.log('[PowerDialer] connectedLeadData updated:', connectedLeadData);
    
    if (connectedLeadData) {
      console.log('[PowerDialer] Lead details available:',
        'Name:', connectedLeadData.first_name, connectedLeadData.last_name,
        'Phone:', connectedLeadData.phone1,
        'Email:', connectedLeadData.email
      );
    } else {
      console.log('[PowerDialer] No lead data available yet');
    }
  }, [connectedLeadData]);

  useEffect(() => {
    if (window.Twilio && window.Twilio.Device) {
      console.log("Twilio device available:", window.Twilio.Device);
      setTwilioReady(true);
      return () => {};
    }
  }, [isScriptLoaded]);

  useEffect(() => {
    if (connectedLeadData) {
      console.log('[PowerDialer] Lead data received and set in state:', {
        raw: connectedLeadData,
        formatted: {
          name: `${connectedLeadData.first_name || ''} ${connectedLeadData.last_name || ''}`.trim(),
          phone: connectedLeadData.phone1,
          email: connectedLeadData.email
        }
      });
    }
  }, [connectedLeadData]);

  useEffect(() => {
    const activeCall = Object.values(twilioState.activeCalls)[0];
    console.log('[PowerDialer] Active call status changed:', activeCall?.status);
    console.log('[PowerDialer] Active call leadId:', activeCall?.leadId);
    
    if (activeCall?.status === 'in-progress' && activeCall.leadId) {
      const fetchLeadData = async () => {
        try {
          console.log('[PowerDialer] Fetching lead data for:', activeCall.leadId);
          setIsDialing(true);
          
          console.log('[PowerDialer] Making API request to lead-connected function with:', {
            leadId: activeCall.leadId,
            callData: {
              callSid: activeCall.callSid,
              status: activeCall.status,
              timestamp: new Date().toISOString()
            }
          });

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

          console.log('[PowerDialer] Raw response from lead-connected:', data);
          
          if (data?.lead) {
            console.log('[PowerDialer] Lead data found in response:', JSON.stringify(data.lead));
            
            const leadInfo = {
              first_name: data.lead.first_name || 'Unknown',
              last_name: data.lead.last_name || 'Contact',
              phone1: data.lead.phone1 || activeCall.phoneNumber || '---',
              email: data.lead.email || '---',
              property_address: data.lead.property_address || '---',
              mailing_address: data.lead.mailing_address || '---'
            };
            
            console.log('[PowerDialer] Setting connected lead data:', leadInfo);
            setConnectedLeadData(leadInfo);
            
            window.dispatchEvent(new CustomEvent('leadDataUpdated', { 
              detail: leadInfo 
            }));
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
          
          setIsDialing(false);
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

  return (
    <MainLayout>
      <TwilioScript
        onLoad={() => {
          console.log("[PowerDialer] Twilio script loaded");
          setIsScriptLoaded(true);
        }}
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
            <Badge variant={connectedLeadData ? "default" : "outline"}>
              {connectedLeadData ? "Lead Data Present" : "No Lead Data"}
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
        
        {connectedLeadData ? (
          <div className="fixed bottom-5 right-5 bg-white p-4 rounded shadow-lg border-2 border-green-600 z-50 max-w-md">
            <h3 className="font-bold flex justify-between items-center">
              <span>Debug: Lead Data Present</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => console.log('Current lead data:', connectedLeadData)}
                  className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                >
                  Log Data
                </button>
                <button 
                  onClick={() => {
                    const updatedData = {...connectedLeadData};
                    setConnectedLeadData(null);
                    setTimeout(() => setConnectedLeadData(updatedData), 50);
                    console.log("Force rerender triggered");
                  }}
                  className="bg-orange-500 text-white px-2 py-1 rounded text-xs"
                >
                  Force Rerender
                </button>
              </div>
            </h3>
            <pre className="text-xs overflow-auto max-h-40 bg-gray-100 p-2 mt-2">
              {JSON.stringify(connectedLeadData, null, 2)}
            </pre>
            <div className="mt-2 text-xs text-red-500">
              If data above is present but not showing in UI, check component props passing
            </div>
          </div>
        ) : (
          <div className="fixed bottom-5 right-5 bg-white p-4 rounded shadow-lg border border-red-300 z-50">
            <h3 className="font-bold text-red-500">Debug: No Lead Data in State</h3>
            <div className="text-xs mt-1">
              API request may have failed or state update issue
            </div>
          </div>
        )}
        
        <TwilioAudioPlayer sound="/sounds/test-tone.mp3" />
      </div>
    </MainLayout>
  );
}
