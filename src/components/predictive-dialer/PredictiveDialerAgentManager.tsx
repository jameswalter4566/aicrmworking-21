
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, UserCheck, Clock } from 'lucide-react';
import { customSupabase as supabase } from '@/utils/supabase-custom-client';
import { PredictiveDialerAgent } from '@/types/predictive-dialer';
import { useToast } from '@/hooks/use-toast';

export interface PredictiveDialerAgentManagerProps {
  onAgentStatusChange?: (agentId: string, status: string) => void;
}

const PredictiveDialerAgentManager: React.FC<PredictiveDialerAgentManagerProps> = ({ onAgentStatusChange }) => {
  const [agents, setAgents] = useState<PredictiveDialerAgent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<PredictiveDialerAgent | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
    
    // Set up real-time subscription using Supabase channels
    const channel = supabase
      .channel('predictive-dialer-agents-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'predictive_dialer_agents' },
        () => {
          fetchAgents();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('predictive_dialer_agents')
        .select('*');
        
      if (error) throw error;
      
      setAgents(data as PredictiveDialerAgent[]);
      
      // Find current user's agent
      if (user) {
        const myAgent = data.find(agent => agent.user_id === user.id);
        setCurrentAgent(myAgent || null);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };
  
  const registerAsAgent = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to register as an agent.",
        variant: "destructive",
      });
      return;
    }
    
    setIsRegistering(true);
    
    try {
      // Use the dialer-agent-connect function to register
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/dialer-agent-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          userId: user.id,
          name: user.email || 'Agent'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register as agent');
      }
      
      setCurrentAgent(data.agent);
      
      toast({
        title: "Registration Successful",
        description: "You are now registered as an agent.",
      });
      
      // Refresh the agents list
      fetchAgents();
    } catch (error) {
      console.error('Error registering as agent:', error);
      toast({
        title: "Registration Failed",
        description: "Failed to register as an agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };
  
  const updateAgentStatus = async (newStatus: 'available' | 'busy' | 'offline') => {
    if (!currentAgent) return;
    
    try {
      // Call the edge function to update status
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/dialer-agent-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-status',
          agentId: currentAgent.id,
          status: newStatus
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }
      
      setCurrentAgent({...currentAgent, status: newStatus});
      
      if (onAgentStatusChange) {
        onAgentStatusChange(currentAgent.id, newStatus);
      }
      
      toast({
        title: "Status Updated",
        description: `Your status is now ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error updating agent status:', error);
      toast({
        title: "Status Update Failed",
        description: "Failed to update your status.",
        variant: "destructive",
      });
    }
  };
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-red-500';
      case 'offline':
      default:
        return 'bg-gray-500';
    }
  };
  
  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>Agent Management</CardTitle>
      </CardHeader>
      <CardContent>
        {!currentAgent ? (
          <div className="flex flex-col gap-4 items-center justify-center h-40">
            <p className="text-gray-500">You are not registered as an agent</p>
            <Button onClick={registerAsAgent} disabled={isRegistering}>
              {isRegistering ? 'Registering...' : 'Register as Agent'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Your Status:</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusBadgeColor(currentAgent.status)}>
                    {currentAgent.status.charAt(0).toUpperCase() + currentAgent.status.slice(1)}
                  </Badge>
                  {currentAgent.status === 'busy' && (
                    <span className="text-xs text-gray-500">
                      On call since {formatTimestamp(currentAgent.last_status_change)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={currentAgent.status === 'available' ? "default" : "outline"}
                  onClick={() => updateAgentStatus('available')}
                  disabled={currentAgent.status === 'available'}
                >
                  Available
                </Button>
                <Button 
                  size="sm" 
                  variant={currentAgent.status === 'offline' ? "default" : "outline"}
                  onClick={() => updateAgentStatus('offline')}
                  disabled={currentAgent.status === 'offline'}
                >
                  Offline
                </Button>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">All Agents</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {agents.map(agent => (
                  <div key={agent.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <UserCheck className={`h-4 w-4 ${
                        agent.status === 'available' ? 'text-green-500' : 
                        agent.status === 'busy' ? 'text-red-500' : 'text-gray-500'
                      }`} />
                      <span>{agent.name}</span>
                    </div>
                    <Badge className={getStatusBadgeColor(agent.status)}>
                      {agent.status}
                    </Badge>
                  </div>
                ))}
                
                {agents.length === 0 && (
                  <p className="text-center text-gray-500 p-4">No agents registered</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last updated: {new Date().toLocaleTimeString()}
              </span>
              <span>{agents.length} agent(s)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PredictiveDialerAgentManager;
