
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhoneCall, PhoneOff, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface PowerDialerAgent {
  id: string;
  name: string;
  status: string;
  current_call_id: string | null;
}

const PowerDialerAgentStatus = () => {
  const { user } = useAuth();
  const [agent, setAgent] = useState<PowerDialerAgent | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  useEffect(() => {
    if (user) {
      registerOrGetAgent();
    }
  }, [user]);

  useEffect(() => {
    if (!agent) return;

    // Subscribe to changes to this agent
    const subscription = supabase
      .channel('agent-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'power_dialer_agents',
          filter: `id=eq.${agent.id}`
        },
        (payload) => {
          setAgent(payload.new as PowerDialerAgent);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [agent]);

  const registerOrGetAgent = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('power-dialer-agent-connect', {
        body: { userId: user.id, status: 'register' }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setAgent(response.data.agent);
    } catch (error) {
      console.error('Error registering agent:', error);
      toast({
        title: 'Agent Registration Error',
        description: `Failed to register as an agent: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAgentStatus = async (status: string) => {
    if (!agent) return;

    setStatusChanging(true);
    try {
      const response = await supabase.functions.invoke('power-dialer-agent-connect', {
        body: { agentId: agent.id, status }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setAgent(response.data.agent);
      toast({
        title: 'Status Updated',
        description: `Agent status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating agent status:', error);
      toast({
        title: 'Status Update Error',
        description: `Failed to update status: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setStatusChanging(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading agent status...</div>;
  }

  if (!agent) {
    return (
      <div className="text-center p-4">
        <p className="mb-3">You are not registered as a power dialer agent.</p>
        <Button onClick={registerOrGetAgent} disabled={loading}>
          Register as Agent
        </Button>
      </div>
    );
  }

  const statusColor = {
    available: 'bg-green-500',
    busy: 'bg-yellow-500',
    offline: 'bg-gray-500',
  }[agent.status] || 'bg-gray-500';

  return (
    <div className="border rounded-md p-4 mb-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5" />
          <span className="font-semibold">{agent.name}</span>
        </div>
        <Badge className={`${statusColor} text-white`}>
          {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <Button 
          variant={agent.status === 'available' ? 'default' : 'outline'} 
          onClick={() => updateAgentStatus('online')}
          disabled={statusChanging || agent.status === 'available'}
          className="flex items-center gap-1"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Available</span>
        </Button>
        
        <Button 
          variant={agent.status === 'offline' ? 'default' : 'outline'} 
          onClick={() => updateAgentStatus('offline')}
          disabled={statusChanging || agent.status === 'offline'}
          className="flex items-center gap-1"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Offline</span>
        </Button>
      </div>
    </div>
  );
};

export default PowerDialerAgentStatus;
