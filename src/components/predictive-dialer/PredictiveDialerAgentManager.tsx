
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, UserCheck, UserMinus, UserPlus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { predictiveDialer } from '@/utils/supabase-custom-client';
import { PredictiveDialerAgent } from '@/types/predictive-dialer';

interface AgentManagerProps {
  onAgentStatusChange?: (agentId: string, status: string) => void;
}

export const PredictiveDialerAgentManager: React.FC<AgentManagerProps> = ({ onAgentStatusChange }) => {
  const [agents, setAgents] = useState<PredictiveDialerAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const agents = await predictiveDialer.fetchAgents();
      setAgents(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast({
        title: "Error",
        description: "Failed to fetch agents. Please try again.",
        variant: "destructive",
      });
    }
  };

  const registerAsAgent = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Check if user is already registered as an agent
      const myAgent = agents.find(a => a.user_id === user.id);
      
      if (myAgent) {
        toast({
          title: "Already registered",
          description: "You are already registered as an agent.",
        });
      } else {
        // Register as a new agent
        const newAgent: Partial<PredictiveDialerAgent> = {
          user_id: user.id,
          name: user.email || 'Agent',
          status: 'offline',
        };
        
        const { data, error } = await predictiveDialer.getAgents().insert([newAgent]);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "You are now registered as an agent.",
        });
        
        fetchAgents();
      }
    } catch (error) {
      console.error("Error registering agent:", error);
      toast({
        title: "Error",
        description: "Failed to register as an agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateAgentStatus = async (agentId: string, status: string) => {
    setIsLoading(true);
    try {
      const { error } = await predictiveDialer.getAgents()
        .update({ status })
        .eq('id', agentId);

      if (error) throw error;

      // Update local state
      setAgents(agents.map(agent => 
        agent.id === agentId ? { ...agent, status: status as PredictiveDialerAgent['status'] } : agent
      ));

      if (onAgentStatusChange) {
        onAgentStatusChange(agentId, status);
      }

      toast({
        title: "Status Updated",
        description: `Agent status changed to ${status}.`,
      });
    } catch (error) {
      console.error("Error updating agent status:", error);
      toast({
        title: "Error",
        description: "Failed to update agent status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'available': return 'bg-green-500 hover:bg-green-600';
      case 'busy': return 'bg-red-500 hover:bg-red-600';
      case 'offline': return 'bg-gray-500 hover:bg-gray-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getCurrentUserAgent = () => {
    if (!user) return null;
    return agents.find(agent => agent.user_id === user.id);
  };

  const myAgent = getCurrentUserAgent();

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex justify-between items-center">
          <div>Agent Management</div>
          {myAgent && (
            <Badge className={getStatusColor(myAgent.status)}>
              {myAgent.status.toUpperCase()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!myAgent ? (
          <Button 
            onClick={registerAsAgent} 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Register as Agent
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                className={`bg-green-600 hover:bg-green-700 ${myAgent.status === 'available' ? 'ring-2 ring-green-300' : ''}`}
                onClick={() => updateAgentStatus(myAgent.id, 'available')}
                disabled={isLoading || myAgent.status === 'available'}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Available
              </Button>
              <Button 
                className={`bg-gray-500 hover:bg-gray-600 ${myAgent.status === 'offline' ? 'ring-2 ring-gray-300' : ''}`}
                onClick={() => updateAgentStatus(myAgent.id, 'offline')}
                disabled={isLoading || myAgent.status === 'offline'}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Offline
              </Button>
            </div>
            
            {myAgent.status === 'busy' && (
              <div className="p-3 bg-red-100 border border-red-300 rounded text-center">
                <p className="text-red-800 text-sm">You are currently on a call</p>
                <p className="text-xs text-red-600 mt-1">Status will automatically update when the call ends</p>
              </div>
            )}

            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">All Agents ({agents.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {agents.map((agent) => (
                  <div 
                    key={agent.id} 
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        agent.status === 'available' ? 'bg-green-500' :
                        agent.status === 'busy' ? 'bg-red-500' : 'bg-gray-500'
                      }`}></div>
                      <div className="text-sm">{agent.name}</div>
                    </div>
                    <Badge className={getStatusColor(agent.status)}>{agent.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PredictiveDialerAgentManager;
