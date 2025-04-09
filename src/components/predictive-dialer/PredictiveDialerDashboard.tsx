import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/hooks/use-toast";
import PredictiveDialerContactsList from './PredictiveDialerContactsList';
import PredictiveDialerAgentManager from './PredictiveDialerAgentManager';
import PredictiveDialerQueueMonitor from './PredictiveDialerQueueMonitor';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play, Pause, PhoneOutgoing, Phone, PhoneOff, Users, 
  BarChart, Clock, MessageSquare, Settings
} from 'lucide-react';
import { predictiveDialer } from '@/utils/supabase-custom-client';
import { PredictiveDialerAgent, PredictiveDialerContact, PredictiveDialerCall, PredictiveDialerStats } from '@/types/predictive-dialer';

export interface PredictiveDialerDashboardProps {}

export const PredictiveDialerDashboard: React.FC<PredictiveDialerDashboardProps> = () => {
  const [isDialerRunning, setIsDialerRunning] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<PredictiveDialerAgent | null>(null);
  const [dialeRatio, setDialerRatio] = useState(3); // Calls per available agent
  const [stats, setStats] = useState<PredictiveDialerStats>({
    totalCalls: 0,
    activeCalls: 0,
    callsInQueue: 0,
    availableAgents: 0,
    completedCalls: 0,
    humanAnswers: 0,
    machineAnswers: 0,
    averageWaitTime: 0
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCurrentAgent = useCallback(async () => {
    if (!user) return;
    
    try {
      const agents = await predictiveDialer.fetchAgents();
      const myAgent = agents.find(agent => agent.user_id === user.id);
      if (myAgent) {
        setCurrentAgent(myAgent);
      }
    } catch (error) {
      console.error("Error fetching agent status:", error);
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const { data: activeCalls, error: activeCallsError } = await predictiveDialer.getCalls()
        .select('*')
        .eq('status', 'in_progress');
        
      if (activeCallsError) throw activeCallsError;
      
      const { data: availableAgents, error: agentsError } = await predictiveDialer.getAgents()
        .select('*')
        .eq('status', 'available');
        
      if (agentsError) throw agentsError;
      
      const { data: queueItems, error: queueError } = await predictiveDialer.getCallQueue()
        .select('*');
        
      if (queueError) throw queueError;
      
      const { data: completedCalls, error: completedCallsError } = await predictiveDialer.getCalls()
        .select('*')
        .eq('status', 'completed');
        
      if (completedCallsError) throw completedCallsError;
      
      const { data: humanAnswers, error: humanAnswersError } = await predictiveDialer.getCalls()
        .select('*')
        .eq('machine_detection_result', 'human');
        
      if (humanAnswersError) throw humanAnswersError;
      
      const { data: machineAnswers, error: machineAnswersError } = await predictiveDialer.getCalls()
        .select('*')
        .eq('machine_detection_result', 'machine');
        
      if (machineAnswersError) throw machineAnswersError;
      
      let avgWaitTime = 0;
      if (queueItems && queueItems.length > 0) {
        const now = new Date();
        const totalWaitTime = queueItems.reduce((sum, item) => {
          if (!item.created_timestamp) return sum;
          const created = new Date(item.created_timestamp);
          return sum + (now.getTime() - created.getTime());
        }, 0);
        avgWaitTime = totalWaitTime / queueItems.length / 1000 / 60;
      }
      
      setStats({
        totalCalls: (activeCalls?.length || 0) + (completedCalls?.length || 0),
        activeCalls: activeCalls?.length || 0,
        callsInQueue: queueItems?.length || 0,
        availableAgents: availableAgents?.length || 0,
        completedCalls: completedCalls?.length || 0,
        humanAnswers: humanAnswers?.length || 0,
        machineAnswers: machineAnswers?.length || 0,
        averageWaitTime: parseFloat(avgWaitTime.toFixed(1))
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchCurrentAgent();
    fetchStats();
    
    const interval = setInterval(() => {
      fetchCurrentAgent();
      fetchStats();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchCurrentAgent]);

  const toggleDialer = async () => {
    setIsDialerRunning(!isDialerRunning);
    
    if (!isDialerRunning) {
      if (!currentAgent) {
        toast({
          title: "Agent Required",
          description: "You need to register as an agent to start the dialer.",
          variant: "destructive",
        });
        setIsDialerRunning(false);
        return;
      }
      
      if (currentAgent.status !== 'available') {
        try {
          const { error } = await predictiveDialer.getAgents()
            .update({ status: 'available' })
            .eq('id', currentAgent.id);
          
          if (error) throw error;
          
          setCurrentAgent({...currentAgent, status: 'available'});
        } catch (error) {
          console.error("Error updating agent status:", error);
          toast({
            title: "Error",
            description: "Failed to set agent status to available.",
            variant: "destructive",
          });
          setIsDialerRunning(false);
          return;
        }
      }
      
      try {
        const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/dialer-start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: currentAgent.id,
            maxConcurrentCalls: dialeRatio
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to start dialer');
        }
        
        toast({
          title: "Dialer Started",
          description: `Predictive dialer is now running with a ratio of ${dialeRatio}:1.`,
        });
      } catch (error) {
        console.error("Error starting dialer:", error);
        toast({
          title: "Error",
          description: "Failed to start the predictive dialer.",
          variant: "destructive",
        });
        setIsDialerRunning(false);
      }
    } else {
      try {
        const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/stop-predictive-dialer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: currentAgent?.id
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to stop dialer');
        }
        
        toast({
          title: "Dialer Stopped",
          description: "Predictive dialer has been stopped.",
        });
      } catch (error) {
        console.error("Error stopping dialer:", error);
        toast({
          title: "Error",
          description: "Failed to stop the predictive dialer.",
          variant: "destructive",
        });
        setIsDialerRunning(true);
      }
    }
  };

  const handleContactSelect = async (contact: PredictiveDialerContact) => {
    if (!currentAgent) {
      toast({
        title: "Agent Required",
        description: "You need to register as an agent to make calls.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentAgent.status === 'busy') {
      toast({
        title: "Agent Busy",
        description: "You are currently on another call.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error: agentError } = await predictiveDialer.getAgents()
        .update({ status: 'busy' })
        .eq('id', currentAgent.id);
      
      if (agentError) throw agentError;
      
      const newCall = {
        contact_id: contact.id,
        agent_id: currentAgent.id,
        status: 'in_progress',
        start_timestamp: new Date().toISOString()
      };
      
      const { data: callData, error: callError } = await predictiveDialer.getCalls().insert([newCall]).select();
      
      if (callError || !callData || callData.length === 0) throw new Error("Failed to create call record");
      
      const { error: updateError } = await predictiveDialer.getAgents()
        .update({ current_call_id: callData[0].id })
        .eq('id', currentAgent.id);
      
      if (updateError) throw updateError;
      
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/initiate-manual-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callId: callData[0].id,
          contactId: contact.id,
          agentId: currentAgent.id,
          phoneNumber: contact.phone_number
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate call");
      }
      
      setCurrentAgent({
        ...currentAgent,
        status: 'busy',
        current_call_id: callData[0].id
      });
      
      toast({
        title: "Call Initiated",
        description: `Calling ${contact.name}...`,
      });
    } catch (error) {
      console.error("Error initiating call:", error);
      
      try {
        await predictiveDialer.getAgents()
          .update({ status: 'available', current_call_id: null })
          .eq('id', currentAgent.id);
      } catch (resetError) {
        console.error("Failed to reset agent status:", resetError);
      }
      
      toast({
        title: "Call Failed",
        description: "Failed to initiate the call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAgentStatusChange = async (agentId: string, status: string) => {
    try {
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/dialer-agent-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-status',
          agentId,
          status
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update agent status');
      }
      
      if (agentId === currentAgent?.id) {
        setCurrentAgent({...currentAgent, status: status as PredictiveDialerAgent['status']});
        
        if (data.assignedCall) {
          toast({
            title: "Call Assigned",
            description: `You have been assigned a call from ${data.assignedCall.contact?.name || 'Unknown'}`,
          });
        }
      }
    } catch (error) {
      console.error("Error updating agent status:", error);
      toast({
        title: "Status Update Failed",
        description: "Failed to update agent status.",
        variant: "destructive",
      });
    }
  };

  const handleAssignCallToAgent = async (callId: string, agentId: string) => {
    if (agentId !== currentAgent?.id) {
      return;
    }
    
    try {
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/dialer-agent-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'connect-call',
          callId,
          agentId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect call');
      }
      
      setCurrentAgent({
        ...currentAgent,
        status: 'busy',
        current_call_id: callId
      });
      
      toast({
        title: "Call Connected",
        description: "You are now connected to the call.",
      });
    } catch (error) {
      console.error("Error connecting to call:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to the call.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Predictive Dialer</h1>
          <p className="text-gray-500">Automated outbound calling with machine detection</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={toggleDialer}
            className={isDialerRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            disabled={!currentAgent}
          >
            {isDialerRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Stop Dialer
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Dialer
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Calls</p>
              <p className="text-2xl font-bold">{stats.activeCalls}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Available Agents</p>
              <p className="text-2xl font-bold">{stats.availableAgents}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Calls in Queue</p>
              <p className="text-2xl font-bold">{stats.callsInQueue}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed Calls</p>
              <p className="text-2xl font-bold">{stats.completedCalls}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <PhoneOff className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <PredictiveDialerAgentManager 
            onAgentStatusChange={handleAgentStatusChange} 
          />
        </div>
        
        <div>
          <PredictiveDialerQueueMonitor 
            onAssignCallToAgent={handleAssignCallToAgent}
            currentAgentId={currentAgent?.id}
          />
        </div>
        
        <div>
          <PredictiveDialerContactsList onContactSelect={handleContactSelect} />
        </div>
      </div>
    </div>
  );
};

export default PredictiveDialerDashboard;
