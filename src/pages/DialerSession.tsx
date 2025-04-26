
import React, { useState, useEffect } from 'react';
import MainLayout from "@/components/layouts/MainLayout";
import { LeadDetailsPanel } from '@/components/power-dialer/LeadDetailsPanel';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, X, Pause, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";

const DialerSession = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<any>(null);
  const [queueStats, setQueueStats] = useState({
    queued: 0,
    inProgress: 0,
    completed: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [connectedLead, setConnectedLead] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchSessionDetails();
      
      // Poll for queue stats every 5 seconds
      const interval = setInterval(() => {
        fetchQueueStats();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [id]);

  const fetchSessionDetails = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-dialing-session', {
        body: { sessionId: id }
      });
      
      if (error) {
        console.error("Error fetching dialing session:", error);
        toast.error("Failed to load session details");
        return;
      }
      
      if (data) {
        setSession(data);
        setIsPaused(data.status === 'paused');
      }
      
      await fetchQueueStats();
    } catch (error) {
      console.error("Error fetching session details:", error);
      toast.error("Failed to load session details");
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchQueueStats = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('get-dialing-queue-stats', {
        body: { sessionId: id }
      });
      
      if (error) {
        console.error("Error fetching queue stats:", error);
        return;
      }
      
      if (data) {
        setQueueStats({
          queued: data.queuedCount || 0,
          inProgress: data.inProgressCount || 0,
          completed: data.completedCount || 0,
          total: data.totalCount || 0
        });
      }
    } catch (error) {
      console.error("Error fetching queue stats:", error);
    }
  };

  // Subscription to monitor for call status changes
  useEffect(() => {
    const subscription = supabase
      .channel('call-status-changes')
      .on('INSERT', { event: '*', schema: 'public', table: 'call_status_updates', filter: `session_id=eq.${id}` }, 
        (payload) => {
          console.log('Call status update:', payload);
          
          if (payload.new && payload.new.data) {
            const update = payload.new.data;
            
            // If there's a connected lead, update the UI
            if (update.lead) {
              setConnectedLead(update.lead);
              setCurrentCall({
                ...update,
                lead: update.lead,
                notes: update.notes || [],
                activities: update.activities || []
              });
              
              // Fetch the queue stats to reflect the latest changes
              fetchQueueStats();
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  const pauseOrResumeSession = async () => {
    if (!id) return;
    
    try {
      const action = isPaused ? 'resume' : 'pause';
      
      const { data, error } = await supabase.functions.invoke('update-dialing-session', {
        body: { 
          sessionId: id,
          action
        }
      });
      
      if (error) {
        console.error(`Error ${action}ing session:`, error);
        toast.error(`Failed to ${action} session`);
        return;
      }
      
      setIsPaused(!isPaused);
      toast.success(`Session ${isPaused ? 'resumed' : 'paused'} successfully`);
    } catch (error) {
      console.error(`Error ${isPaused ? 'resuming' : 'pausing'} session:`, error);
      toast.error(`Failed to ${isPaused ? 'resume' : 'pause'} session`);
    }
  };

  const endSession = async () => {
    if (!id) return;
    
    if (!window.confirm('Are you sure you want to end this dialing session? All progress will be saved, but the dialer will stop.')) {
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('update-dialing-session', {
        body: { 
          sessionId: id,
          action: 'end'
        }
      });
      
      if (error) {
        console.error("Error ending session:", error);
        toast.error("Failed to end session");
        return;
      }
      
      toast.success("Session ended successfully");
      navigate('/power-dialer');
    } catch (error) {
      console.error("Error ending session:", error);
      toast.error("Failed to end session");
    }
  };

  const getNextLead = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('get-next-lead', {
        body: { sessionId: id }
      });
      
      if (error) {
        console.error("Error getting next lead:", error);
        toast.error("Failed to get next lead");
        return;
      }
      
      if (data && data.lead) {
        // Trigger a call to this lead
        initiateCall(data.lead);
      } else {
        toast.info("No more leads in queue");
      }
    } catch (error) {
      console.error("Error getting next lead:", error);
      toast.error("Failed to get next lead");
    }
  };

  const initiateCall = async (lead: any) => {
    // This is a stub - in a real implementation, this would connect to your
    // calling system (like Twilio) to place the call
    toast.info(`Initiating call to ${lead.firstName} ${lead.lastName}`);
  };

  return (
    <MainLayout>
      <div className="container p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{session?.name || 'Dialing Session'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isPaused ? 'secondary' : 'default'}>
                {isPaused ? 'Paused' : 'Active'}
              </Badge>
              <span className="text-sm text-gray-500">
                {session?.created_at ? `Started ${new Date(session.created_at).toLocaleString()}` : ''}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={pauseOrResumeSession}
              disabled={isLoading}
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              )}
            </Button>
            
            <Button
              variant="destructive"
              onClick={endSession}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-1" />
              End Session
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Dialing Queue Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-blue-50 p-4 rounded-md">
                    <div className="text-2xl font-bold text-blue-600">{queueStats.queued}</div>
                    <div className="text-sm text-gray-600">Queued</div>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-md">
                    <div className="text-2xl font-bold text-yellow-600">{queueStats.inProgress}</div>
                    <div className="text-sm text-gray-600">In Progress</div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-md">
                    <div className="text-2xl font-bold text-green-600">{queueStats.completed}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="text-2xl font-bold">{queueStats.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex justify-center">
                  <Button 
                    variant="default"
                    onClick={getNextLead}
                    disabled={queueStats.queued === 0 || isPaused}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call Next Lead
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Current call section - would be enhanced with real call controls */}
            {currentCall && (
              <Card className="mb-6 border-primary/50">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="text-lg flex justify-between">
                    <div>Current Call</div>
                    <Badge>
                      {currentCall.status || 'Connected'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">
                        {currentCall?.lead?.firstName} {currentCall?.lead?.lastName}
                      </div>
                      <div className="text-sm text-gray-600">
                        {currentCall?.lead?.phone1}
                      </div>
                    </div>
                    
                    <div className="space-x-2">
                      <Button variant="outline" size="sm">
                        Mute
                      </Button>
                      <Button variant="destructive" size="sm">
                        End Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Add other relevant components for dialer experience */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Script</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="mb-2">Hello, this is [Your Name] from [Your Company].</p>
                  <p className="mb-2">I'm calling about [brief reason for call].</p>
                  <p className="mb-2">Do you have a few minutes to talk?</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="relative">
            <LeadDetailsPanel 
              leadId={connectedLead?.id} 
              isActive={true} 
              currentCall={currentCall}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default DialerSession;
