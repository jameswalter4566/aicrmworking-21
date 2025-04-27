import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { useTwilio } from '@/hooks/use-twilio';
import { twilioService } from '@/services/twilio';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, PlayCircle, PauseCircle } from 'lucide-react';
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

const DialerSession = () => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [connectedLeadData, setConnectedLeadData] = useState<any>(null);
  const [isDialing, setIsDialing] = useState(false);
  const [isHangingUp, setIsHangingUp] = useState(false);

  const { user } = useAuth();
  const twilioState = useTwilio();
  const hasActiveCall = Object.keys(twilioState.activeCalls).length > 0;
  
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
    try {
      setIsHangingUp(true);
      const activeCallIds = Object.keys(twilioState.activeCalls);
      
      if (activeCallIds.length === 0) {
        setIsHangingUp(false);
        return;
      }
      
      console.log("Attempting to end calls:", activeCallIds);
      
      const firstActiveCall = Object.values(twilioState.activeCalls)[0];
      
      if (firstActiveCall) {
        try {
          const { data, error } = await supabase.functions.invoke('disposition-panel', {
            body: {
              action: 'hangup',
              callSid: firstActiveCall.callSid,
              leadId: firstActiveCall.leadId || currentLeadId,
              userId: user?.id
            }
          });
          
          if (error) {
            console.error("Error from disposition panel:", error);
            throw error;
          }
          
          console.log("Disposition panel response:", data);
          
          const result = await twilioService.hangupAllCalls();
          
          if (result || data?.success) {
            toast.success("Call ended", {
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
                console.error("Could not log call activity:", error);
              }
            }
            
            setConnectedLeadData(null);
            setIsDialing(false);
          } else {
            toast.error("Failed to end call", {
              description: "Please try again or reload the page"
            });
          }
        } catch (dispErr) {
          console.error("Error using disposition panel:", dispErr);
          const result = await twilioService.hangupAllCalls();
          if (result) {
            toast.success("Call ended (fallback method)", {
              description: "The call has been disconnected"
            });
            setConnectedLeadData(null);
            setIsDialing(false);
          } else {
            throw dispErr;
          }
        }
      }
    } catch (err) {
      console.error('Error ending call:', err);
      toast.error('Failed to end call');
    } finally {
      setIsHangingUp(false);
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
        console.error("Could not update lead disposition:", error);
      }
      
      try {
        await supabase.from('lead_activities').insert({
          lead_id: parseInt(currentLeadId),
          type: "disposition",
          description: disposition
        });
      } catch (error) {
        console.error("Could not log disposition activity:", error);
      }
      
      toast.success("Lead dispositioned", {
        description: `Lead marked as ${disposition}`
      });
      
      await handleEndCall();
      
      setCurrentLeadId(null);
      
      if (autoDialerConfig.enabled) {
        await callNextLead();
      }
    } catch (err) {
      console.error('Error updating disposition:', err);
      toast.error('Failed to update disposition');
    }
  };

  useEffect(() => {
    const firstActiveCall = Object.values(twilioState.activeCalls)[0]; 
    console.log('Active call status changed:', firstActiveCall?.status);
    console.log('Active call leadId:', firstActiveCall?.leadId);
    
    if (firstActiveCall?.status === 'in-progress' && firstActiveCall.leadId) {
      const fetchLeadData = async () => {
        try {
          console.log('Fetching lead data for:', firstActiveCall.leadId);
          
          const { data, error } = await supabase.functions.invoke('lead-connected', {
            body: { 
              leadId: firstActiveCall.leadId,
              callData: {
                callSid: firstActiveCall.callSid,
                status: firstActiveCall.status,
                timestamp: new Date().toISOString()
              }
            }
          });

          if (error) {
            console.error('Error from lead-connected:', error);
            throw error;
          }
          
          console.log('Response from lead-connected:', data);
          
          if (data?.lead) {
            console.log('Setting connected lead data from API response:', data.lead);
            setConnectedLeadData({
              id: data.lead.id,
              first_name: data.lead.first_name || 'Unknown',
              last_name: data.lead.last_name || 'Contact',
              phone1: data.lead.phone1 || firstActiveCall.phoneNumber || '---',
              phone2: data.lead.phone2 || '---',
              email: data.lead.email || '---',
              property_address: data.lead.property_address || '---', 
              mailing_address: data.lead.mailing_address || '---',
              disposition: data.lead.disposition || 'Not Contacted',
              tags: data.lead.tags || [],
              created_at: data.lead.created_at,
              updated_at: data.lead.updated_at
            });
          } else {
            console.log('No lead data in response, creating fallback data');
            const fallbackData = {
              first_name: 'Unknown',
              last_name: 'Contact',
              phone1: firstActiveCall.phoneNumber || '---',
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
          console.error('Error fetching lead data:', err);
          const errorFallbackData = {
            first_name: 'Error',
            last_name: 'Loading Lead',
            phone1: firstActiveCall.phoneNumber || '---',
            phone2: '---',
            email: '---',
            property_address: '---',
            mailing_address: '---',
            disposition: 'Not Contacted',
            tags: []
          };
          setConnectedLeadData(errorFallbackData);
          toast.error('Failed to load lead details');
          setIsDialing(false);
        }
      };

      fetchLeadData();
    } else if (!hasActiveCall && !isCallingNext) {
      setIsDialing(false);
    }
  }, [twilioState.activeCalls, hasActiveCall, isCallingNext]);

  useEffect(() => {
    const firstActiveCall = Object.values(twilioState.activeCalls)[0];
    
    const callStatus = firstActiveCall?.status;
    
    const completedStatuses = ['completed', 'failed', 'busy', 'no-answer', 'canceled'];
    const inProgressStatuses = ['connecting', 'in-progress'];
    
    if (completedStatuses.includes(callStatus || '')) {
      handleCallCompletion();
    } else if (callStatus === 'connecting') { // Fix: Changed 'ringing' to 'connecting'
      startNoAnswerTimeout();
    } else if (inProgressStatuses.includes(callStatus || '')) {
      clearTimeoutTimer();
    }
  }, [
    twilioState.activeCalls, 
    handleCallCompletion, 
    startNoAnswerTimeout, 
    clearTimeoutTimer
  ]);

  const toggleAutoDial = () => {
    setAutoDialerConfig({
      ...autoDialerConfig,
      enabled: !autoDialerConfig.enabled
    });
    
    toast(autoDialerConfig.enabled ? "Auto-dialer paused" : "Auto-dialer resumed", {
      description: autoDialerConfig.enabled 
        ? "You will need to manually call the next lead" 
        : "The system will automatically call the next lead after each call"
    });
  };

  const stopDialingSession = async () => {
    try {
      await handleEndCall();
      
      toast.success("Session stopped", {
        description: "The dialing session has been ended"
      });
      
      // Navigate back to the sessions list
      window.location.href = '/power-dialer';
    } catch (err) {
      console.error('Error stopping session:', err);
      toast.error('Failed to stop session');
    }
  };

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
                        <Badge className="mt-2" variant={Object.values(twilioState.activeCalls)[0]?.status === 'in-progress' ? "default" : "outline"}>
                          {Object.values(twilioState.activeCalls)[0]?.status === 'connecting' ? 'Ringing' : 
                           Object.values(twilioState.activeCalls)[0]?.status === 'in-progress' ? 'Connected' :
                           Object.values(twilioState.activeCalls)[0]?.status === 'completed' ? 'Ended' : 
                           Object.values(twilioState.activeCalls)[0]?.status}
                        </Badge>
                      </div>
                      
                      <Button 
                        variant="destructive"
                        onClick={handleEndCall}
                        disabled={!Object.values(twilioState.activeCalls)[0] || 
                                Object.values(twilioState.activeCalls)[0].status === 'completed' ||
                                isHangingUp}
                      >
                        <PhoneOff className="mr-2 h-4 w-4" />
                        {isHangingUp ? 'Hanging Up...' : 'End Call'}
                      </Button>
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
                    disabled={!hasActiveCall}
                  >
                    Contact
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('No Answer')}
                    disabled={!hasActiveCall}
                  >
                    No Answer
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('Voicemail')}
                    disabled={!hasActiveCall}
                  >
                    Left Voicemail
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('Interested')}
                    disabled={!hasActiveCall}
                  >
                    Interested
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('Not Interested')}
                    disabled={!hasActiveCall}
                  >
                    Not Interested
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('Call Back')}
                    disabled={!hasActiveCall}
                  >
                    Call Back
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('Wrong Number')}
                    disabled={!hasActiveCall}
                  >
                    Wrong Number
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    onClick={() => handleDisposition('DNC')}
                    disabled={!hasActiveCall}
                  >
                    Do Not Call
                  </Button>
                  
                  <div className="border-t border-gray-600 pt-3 mt-3 space-y-3">
                    <Button
                      variant={autoDialerConfig.enabled ? "outline" : "default"}
                      className="w-full justify-center items-center bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                      onClick={toggleAutoDial}
                    >
                      {autoDialerConfig.enabled ? (
                        <>
                          <PauseCircle className="mr-2 h-4 w-4" />
                          Pause Auto-Dialer
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Resume Auto-Dialer
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-center bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                      onClick={handleEndCall}
                      disabled={!hasActiveCall || isHangingUp}
                    >
                      <PhoneOff className="mr-2 h-4 w-4" />
                      {isHangingUp ? 'Hanging Up...' : 'Hang Up'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-center bg-red-800 hover:bg-red-700 text-white border-red-700"
                      onClick={stopDialingSession}
                    >
                      Stop Session
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-center bg-green-800 hover:bg-green-700 text-white border-green-700"
                      onClick={callNextLead}
                      disabled={isCallingNext || hasActiveCall}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      {isCallingNext ? 'Calling...' : 'Call Next Lead'}
                    </Button>
                  </div>
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
