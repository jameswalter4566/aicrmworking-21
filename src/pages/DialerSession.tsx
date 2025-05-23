import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { useTwilio } from '@/hooks/use-twilio';
import { twilioService } from '@/services/twilio';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from 'lucide-react';
import { LeadDetailsPanel } from '@/components/power-dialer/LeadDetailsPanel';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import TwilioScript from '@/components/TwilioScript';
import { AudioInitializer } from '@/components/AudioInitializer';
import { ConnectedLeadPanel } from '@/components/power-dialer/ConnectedLeadPanel';
import { useLeadRealtime } from '@/hooks/use-lead-realtime';
import { useAuth } from '@/hooks/use-auth';
import { useAutoDialer } from '@/hooks/use-auto-dialer';
import { AutoDialerControls } from '@/components/power-dialer/AutoDialerControls';
import { HangupButton } from '@/components/power-dialer/HangupButton';

const DialerSession = () => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [connectedLeadData, setConnectedLeadData] = useState<any>(null);
  const [isDialing, setIsDialing] = useState(false);

  const { user } = useAuth();
  const twilioState = useTwilio();
  const hasActiveCall = Object.keys(twilioState.activeCalls).length > 0;
  
  const activeCall = Object.values(twilioState.activeCalls)[0];
  const activeCallSid = activeCall?.callSid;
  const activeLeadId = activeCall?.leadId || null;
  
  const {
    config: autoDialerConfig,
    setConfig: setAutoDialerConfig,
    remainingTimeout,
    startNoAnswerTimeout,
    handleCallCompletion,
    clearTimeoutTimer
  } = useAutoDialer(async () => {
    if (!sessionId) return;
    await callNextLead();
  });
  
  const { leadData: realtimeLeadData, isLoading: isLeadLoading, refresh: refreshLeadData } = 
    useLeadRealtime(currentLeadId, user?.id);
    
  useEffect(() => {
    console.log('Connected lead data updated:', connectedLeadData);
  }, [connectedLeadData]);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setSessionId(id);
      fetchSessionData(id);
    }
  }, []);

  const fetchSessionData = async (id: string) => {
    try {
      setIsLoadingSession(true);
      const { data, error } = await supabase.functions.invoke('get-dialing-session', {
        body: { sessionId: id }
      });

      if (error) throw error;
      
      setSessionData(data);
      console.log('Session data:', data);
    } catch (err) {
      console.error('Error fetching session data:', err);
      toast.error('Failed to load dialing session');
    } finally {
      setIsLoadingSession(false);
    }
  };

  const callNextLead = async () => {
    if (!sessionId) return;
    
    try {
      setIsCallingNext(true);
      setIsDialing(true);
      
      const { data, error } = await supabase.functions.invoke('get-next-lead', {
        body: { sessionId }
      });
      
      if (error) throw error;
      
      if (!data || !data.leadId) {
        toast("No more leads", {
          description: "There are no more leads to call in this session."
        });
        setIsDialing(false);
        return;
      }
      
      setCurrentLeadId(data.leadId);
      
      fetchLeadData(data.leadId);
      
      await twilioService.initializeTwilioDevice();
      
      const callResult = await twilioService.makeCall(data.phoneNumber, data.leadId);
      
      if (!callResult.success) {
        toast.error("Call failed", {
          description: callResult.error || "Unable to place call"
        });
        setIsDialing(false);
      } else {
        toast("Calling", {
          description: `Calling ${data.name || data.phoneNumber}...`
        });
      }
    } catch (err) {
      console.error('Error getting next lead:', err);
      toast.error('Failed to get next lead');
      setIsDialing(false);
    } finally {
      setIsCallingNext(false);
    }
  };

  const fetchLeadData = async (leadId: string) => {
    try {
      console.log('Directly fetching lead data for:', leadId);
      setIsDialing(true);
      
      setCurrentLeadId(leadId);
      
      refreshLeadData();
      
    } catch (err) {
      console.error('Error directly fetching lead data:', err);
      const errorFallbackData = {
        first_name: 'Error',
        last_name: 'Loading Lead',
        phone1: '---',
        email: '---',
        property_address: '---',
        mailing_address: '---',
        disposition: 'Not Contacted',
        tags: []
      };
      setConnectedLeadData(errorFallbackData);
    }
  };

  const handleEndCall = async () => {
    const activeCallIds = Object.keys(twilioState.activeCalls);
    
    if (activeCallIds.length === 0) return;
    
    try {
      await Promise.all(activeCallIds.map(id => twilioState.endCall(id)));
      
      toast("Call ended", {
        description: "The call has been disconnected"
      });
      
      if (currentLeadId) {
        try {
          await supabase.from('lead_activities').insert({
            lead_id: parseInt(currentLeadId),
            type: "call_completed",
            description: "Call ended by agent"
          });
        } catch (error) {
          console.log("Could not log call activity:", error);
        }
      }
      
      setConnectedLeadData(null);
      setIsDialing(false);
      
    } catch (err) {
      console.error('Error ending call:', err);
      toast.error('Failed to end call');
    }
  };

  const handleDisposition = async (disposition: string) => {
    if (!currentLeadId) return;
    
    try {
      try {
        await supabase.from('leads').update({ 
          disposition: disposition,
          last_contacted: new Date().toISOString()
        }).eq('id', parseInt(currentLeadId));
      } catch (error) {
        console.log("Could not update lead disposition:", error);
      }
      
      try {
        await supabase.from('lead_activities').insert({
          lead_id: parseInt(currentLeadId),
          type: "disposition",
          description: disposition
        });
      } catch (error) {
        console.log("Could not log disposition activity:", error);
      }
      
      toast("Lead dispositioned", {
        description: `Lead marked as ${disposition}`
      });
      
      await handleEndCall();
      
      setCurrentLeadId(null);
    } catch (err) {
      console.error('Error updating disposition:', err);
      toast.error('Failed to update disposition');
    }
  };

  useEffect(() => {
    const firstActiveCall = Object.values(twilioState.activeCalls)[0];
    const callStatus = firstActiveCall?.status;
    
    if (callStatus) {
      const completionStatuses = ['completed', 'failed', 'busy', 'no-answer', 'canceled'];
      const connectingStatuses = ['connecting', 'ringing'];
      
      if (completionStatuses.includes(callStatus)) {
        handleCallCompletion();
      } 
      else if (connectingStatuses.includes(callStatus)) {
        startNoAnswerTimeout();
      } 
      else if (callStatus === 'in-progress') {
        clearTimeoutTimer();
      }
    }
  }, [
    twilioState.activeCalls,
    handleCallCompletion,
    startNoAnswerTimeout,
    clearTimeoutTimer
  ]);

  return (
    <MainLayout>
      <TwilioScript
        onLoad={() => setIsScriptLoaded(true)}
        onError={(err) => console.error("TwilioScript error:", err)}
      />
      
      <AudioInitializer />
      
      <div className="container py-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dialer Session</h1>
            <p className="text-muted-foreground">
              Work through your leads one by one
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={twilioState.initialized ? "default" : "outline"}>
              {twilioState.initialized ? "System Ready" : "Initializing..."}
            </Badge>
            <Badge variant={twilioState.microphoneActive ? "default" : "destructive"}>
              {twilioState.microphoneActive ? "Microphone Active" : "Microphone Inactive"}
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between">
                  <span>Current Call</span>
                  {sessionData && (
                    <Badge variant="outline">
                      Session: {sessionData.name || sessionId?.substring(0, 8)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hasActiveCall ? (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {Object.values(twilioState.activeCalls)[0]?.phoneNumber || "Current Call"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {Object.values(twilioState.activeCalls)[0]?.phoneNumber}
                        </p>
                        <Badge className="mt-2" variant={
                          (Object.values(twilioState.activeCalls)[0]?.status === 'in-progress') 
                            ? "default" 
                            : "outline"
                        }>
                          {(() => {
                            const status = Object.values(twilioState.activeCalls)[0]?.status;
                            if (status === 'connecting') return 'Ringing';
                            if (status && ['ringing', 'connecting'].includes(status)) return 'Ringing';
                            if (status === 'in-progress') return 'Connected';
                            if (status === 'completed') return 'Ended';
                            return status;
                          })()}
                        </Badge>
                      </div>
                      
                      <HangupButton 
                        callSid={Object.values(twilioState.activeCalls)[0]?.callSid || undefined}
                        onSuccess={handleEndCall}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-8">
                      <p className="text-muted-foreground mb-4">No active call in progress</p>
                      <Button 
                        onClick={callNextLead} 
                        disabled={isCallingNext}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        {isCallingNext ? 'Calling...' : 'Call Next Lead'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <AutoDialerControls
              config={autoDialerConfig}
              onConfigChange={setAutoDialerConfig}
              remainingTimeout={remainingTimeout}
            />
            
            <ConnectedLeadPanel 
              leadData={connectedLeadData}
            />
            
            <LeadDetailsPanel 
              leadId={currentLeadId || undefined}
              isActive={hasActiveCall}
              callSid={activeCallSid}
            />
          </div>
          
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-white">Disposition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('Contact')}
                  >
                    Contact
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('No Answer')}
                  >
                    No Answer
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('Voicemail')}
                  >
                    Left Voicemail
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('Interested')}
                  >
                    Interested
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('Not Interested')}
                  >
                    Not Interested
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('Call Back')}
                  >
                    Call Back
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('Wrong Number')}
                  >
                    Wrong Number
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('DNC')}
                  >
                    Do Not Call
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {sessionData && (
              <Card className="mt-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Session Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Leads:</span>
                      <span className="font-medium">{sessionData.totalLeads || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Calls Made:</span>
                      <span className="font-medium">{sessionData.callsMade || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Contacts:</span>
                      <span className="font-medium">{sessionData.contacts || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Session Started:</span>
                      <span className="font-medium">
                        {sessionData.createdAt ? new Date(sessionData.createdAt).toLocaleTimeString() : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Contact Rate:</span>
                      <span className="font-medium">
                        {sessionData.callsMade > 0 
                          ? `${Math.round((sessionData.contacts / sessionData.callsMade) * 100)}%` 
                          : '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default DialerSession;
