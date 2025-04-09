
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { PredictiveDialerAgent, DialerStatus } from '@/types/predictiveDialer';
import { toast } from '@/components/ui/use-toast';
import { Phone, PhoneOff, User, Users, List, CheckCircle, XCircle, Voicemail } from 'lucide-react';

interface PredictiveDialerDashboardProps {
  twilioLoaded: boolean;
}

export const PredictiveDialerDashboard: React.FC<PredictiveDialerDashboardProps> = ({ twilioLoaded }) => {
  const { user } = useAuth();
  const [isDialerRunning, setIsDialerRunning] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<PredictiveDialerAgent | null>(null);
  const [dialerStatus, setDialerStatus] = useState<DialerStatus>({
    isRunning: false,
    activeCallsCount: 0,
    availableAgentsCount: 0,
    queuedCallsCount: 0,
    totalCallsPlaced: 0,
    humanDetectedCount: 0,
    voicemailDetectedCount: 0,
    failedCallsCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    
    // Load the current agent
    const loadAgent = async () => {
      try {
        const { data: existingAgent, error } = await supabase
          .from('power_dialer_agents')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching agent:', error);
          return;
        }

        if (existingAgent) {
          setCurrentAgent(existingAgent);
        } else {
          // Create a new agent for this user
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();

          const agentName = profile ? 
            `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 
            'Agent';

          const { data: newAgent, error: createError } = await supabase
            .from('power_dialer_agents')
            .insert([{ 
              user_id: user.id, 
              name: agentName || 'New Agent', 
              status: 'offline'
            }])
            .select()
            .single();

          if (createError) {
            console.error('Error creating agent:', createError);
            return;
          }

          setCurrentAgent(newAgent);
        }
      } catch (err) {
        console.error('Error in agent setup:', err);
      }
    };

    loadAgent();

    // Set up real-time subscription for dialer status updates
    const dialerStatusChannel = supabase
      .channel('predictive-dialer-status')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'power_dialer_calls'
        }, 
        () => {
          fetchDialerStatus();
        })
      .subscribe();

    // Initial fetch of dialer status
    fetchDialerStatus();

    return () => {
      supabase.removeChannel(dialerStatusChannel);
    };
  }, [user?.id]);

  const fetchDialerStatus = async () => {
    try {
      // Get active calls count
      const { data: activeCalls, error: activeCallsError } = await supabase
        .from('power_dialer_calls')
        .select('id')
        .eq('status', 'in_progress');
        
      if (activeCallsError) throw activeCallsError;

      // Get available agents count
      const { data: availableAgents, error: availableAgentsError } = await supabase
        .from('power_dialer_agents')
        .select('id')
        .eq('status', 'available');
        
      if (availableAgentsError) throw availableAgentsError;

      // Get queued calls count
      const { data: queuedCalls, error: queuedCallsError } = await supabase
        .from('power_dialer_call_queue')
        .select('id');
        
      if (queuedCallsError) throw queuedCallsError;

      // Get total calls statistics
      const { data: totalCalls, error: totalCallsError } = await supabase
        .from('power_dialer_calls')
        .select('id');
        
      if (totalCallsError) throw totalCallsError;

      // Get human detected count
      const { data: humanCalls, error: humanCallsError } = await supabase
        .from('power_dialer_calls')
        .select('id')
        .eq('machine_detection_result', 'human');
        
      if (humanCallsError) throw humanCallsError;

      // Get voicemail detected count
      const { data: voicemailCalls, error: voicemailCallsError } = await supabase
        .from('power_dialer_calls')
        .select('id')
        .eq('machine_detection_result', 'machine');
        
      if (voicemailCallsError) throw voicemailCallsError;

      // Get failed calls count
      const { data: failedCalls, error: failedCallsError } = await supabase
        .from('power_dialer_calls')
        .select('id')
        .eq('status', 'failed');
        
      if (failedCallsError) throw failedCallsError;

      setDialerStatus({
        isRunning: activeCalls && activeCalls.length > 0,
        activeCallsCount: activeCalls ? activeCalls.length : 0,
        availableAgentsCount: availableAgents ? availableAgents.length : 0,
        queuedCallsCount: queuedCalls ? queuedCalls.length : 0,
        totalCallsPlaced: totalCalls ? totalCalls.length : 0,
        humanDetectedCount: humanCalls ? humanCalls.length : 0,
        voicemailDetectedCount: voicemailCalls ? voicemailCalls.length : 0,
        failedCallsCount: failedCalls ? failedCalls.length : 0
      });

    } catch (error) {
      console.error('Error fetching dialer status:', error);
    }
  };

  const startDialer = async () => {
    if (!currentAgent) {
      toast({
        title: "Error",
        description: "Agent profile not found. Please refresh and try again.",
        variant: "destructive"
      });
      return;
    }

    if (!twilioLoaded) {
      toast({
        title: "Error",
        description: "Twilio SDK not loaded. Please wait and try again.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update agent status to available
      await supabase
        .from('power_dialer_agents')
        .update({ 
          status: 'available',
          last_status_change: new Date().toISOString()
        })
        .eq('id', currentAgent.id);

      // Call the edge function to start the dialer
      const { data, error } = await supabase.functions.invoke('power-dialer-start', {
        body: { agentId: currentAgent.id, maxConcurrentCalls: 3 }
      });

      if (error) {
        throw new Error(error.message || 'Failed to start dialer');
      }

      setIsDialerRunning(true);
      toast({
        title: "Dialer Started",
        description: "Predictive dialer has been activated successfully."
      });

    } catch (error: any) {
      console.error('Error starting dialer:', error);
      toast({
        title: "Failed to Start Dialer",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopDialer = async () => {
    if (!currentAgent) return;
    
    setIsLoading(true);

    try {
      // Update agent status to offline
      await supabase
        .from('power_dialer_agents')
        .update({ 
          status: 'offline',
          last_status_change: new Date().toISOString()
        })
        .eq('id', currentAgent.id);

      // Call the edge function to stop the dialer
      const { data, error } = await supabase.functions.invoke('power-dialer-stop', {
        body: { agentId: currentAgent.id }
      });

      if (error) {
        throw new Error(error.message || 'Failed to stop dialer');
      }

      setIsDialerRunning(false);
      toast({
        title: "Dialer Stopped",
        description: "Predictive dialer has been deactivated."
      });

    } catch (error: any) {
      console.error('Error stopping dialer:', error);
      toast({
        title: "Failed to Stop Dialer",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!twilioLoaded && (
        <Alert className="bg-yellow-50 border-yellow-200 mb-4">
          <AlertTitle>Twilio SDK Loading</AlertTitle>
          <AlertDescription>
            Please wait while the Twilio SDK loads. This is required for the dialer to function.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Button
          size="lg"
          variant={isDialerRunning ? "secondary" : "default"}
          onClick={isDialerRunning ? stopDialer : startDialer}
          disabled={isLoading || !twilioLoaded}
          className="h-16 min-w-[180px]"
        >
          {isLoading ? (
            "Processing..."
          ) : isDialerRunning ? (
            <>
              <PhoneOff className="mr-2" /> Stop Dialer
            </>
          ) : (
            <>
              <Phone className="mr-2" /> Start Dialer
            </>
          )}
        </Button>

        <div className="flex-1 bg-slate-50 rounded-lg p-4 flex flex-col justify-center">
          <div className="text-sm text-slate-600">Agent Status</div>
          <div className="flex items-center mt-1">
            <div className={`h-3 w-3 rounded-full mr-2 ${
              currentAgent?.status === 'available' ? 'bg-green-500' :
              currentAgent?.status === 'busy' ? 'bg-orange-500' :
              'bg-slate-300'
            }`}></div>
            <div className="font-semibold">
              {currentAgent?.name || 'Agent'} - {currentAgent?.status || 'unknown'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Phone className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{dialerStatus.activeCallsCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <User className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{dialerStatus.availableAgentsCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Calls in Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <List className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{dialerStatus.queuedCallsCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Calls Placed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Phone className="h-5 w-5 text-slate-500" />
              <span className="text-2xl font-bold">{dialerStatus.totalCallsPlaced}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">Dialer Statistics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Human Answers</span>
              <span className="bg-green-100 text-green-800 text-xs font-semibold py-1 px-2 rounded">
                {dialerStatus.humanDetectedCount}
              </span>
            </div>
            <Progress 
              value={dialerStatus.totalCallsPlaced > 0 
                ? (dialerStatus.humanDetectedCount / dialerStatus.totalCallsPlaced) * 100 
                : 0} 
              className="h-2 bg-green-100" 
            />
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Voicemails</span>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold py-1 px-2 rounded">
                {dialerStatus.voicemailDetectedCount}
              </span>
            </div>
            <Progress 
              value={dialerStatus.totalCallsPlaced > 0 
                ? (dialerStatus.voicemailDetectedCount / dialerStatus.totalCallsPlaced) * 100 
                : 0} 
              className="h-2 bg-blue-100" 
            />
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Failed Calls</span>
              <span className="bg-red-100 text-red-800 text-xs font-semibold py-1 px-2 rounded">
                {dialerStatus.failedCallsCount}
              </span>
            </div>
            <Progress 
              value={dialerStatus.totalCallsPlaced > 0 
                ? (dialerStatus.failedCallsCount / dialerStatus.totalCallsPlaced) * 100 
                : 0}
              className="h-2 bg-red-100" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
