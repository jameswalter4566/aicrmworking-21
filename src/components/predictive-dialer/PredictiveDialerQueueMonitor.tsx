
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Phone, UserCheck, Clock } from 'lucide-react';
import { predictiveDialer } from '@/utils/supabase-custom-client';
import { PredictiveDialerCall, PredictiveDialerQueueItem } from '@/types/predictive-dialer';
import { formatDistanceToNow } from 'date-fns';

interface QueueMonitorProps {
  onAssignCallToAgent?: (callId: string, agentId: string) => void;
  currentAgentId?: string;
}

export const PredictiveDialerQueueMonitor: React.FC<QueueMonitorProps> = ({ 
  onAssignCallToAgent, 
  currentAgentId 
}) => {
  const [queueItems, setQueueItems] = useState<PredictiveDialerQueueItem[]>([]);
  const [activeCalls, setActiveCalls] = useState<PredictiveDialerCall[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchQueueAndCalls();
    // Set up polling for queue and active calls
    const interval = setInterval(fetchQueueAndCalls, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueueAndCalls = async () => {
    try {
      // Fetch queue items with related calls
      const queueResults = await predictiveDialer.getCallQueue()
        .select(`
          *,
          call:call_id (
            *,
            contact:contact_id (*),
            agent:agent_id (*)
          )
        `);
      
      if (queueResults.error) throw queueResults.error;
      
      // Transform and set queue items
      const transformedQueue = queueResults.data.map(item => ({
        ...item,
        call: item.call as unknown as PredictiveDialerCall
      }));
      
      setQueueItems(transformedQueue as unknown as PredictiveDialerQueueItem[]);
      
      // Fetch active calls
      const callResults = await predictiveDialer.getCalls()
        .select(`
          *,
          contact:contact_id (*),
          agent:agent_id (*)
        `)
        .eq('status', 'in_progress');
      
      if (callResults.error) throw callResults.error;
      
      setActiveCalls(callResults.data as unknown as PredictiveDialerCall[]);
    } catch (error) {
      console.error("Error fetching queue or calls:", error);
    }
  };

  const takeCallFromQueue = async (queueItemId: string, callId: string) => {
    if (!currentAgentId) {
      toast({
        title: "Error",
        description: "You must be registered as an agent to take calls.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Assign the call to the current agent in the queue
      const { error: queueError } = await predictiveDialer.getCallQueue()
        .update({ assigned_to_agent_id: currentAgentId })
        .eq('id', queueItemId);
      
      if (queueError) throw queueError;
      
      // Update the call record
      const { error: callError } = await predictiveDialer.getCalls()
        .update({ agent_id: currentAgentId })
        .eq('id', callId);
      
      if (callError) throw callError;
      
      // Update agent status to busy
      const { error: agentError } = await predictiveDialer.getAgents()
        .update({ status: 'busy', current_call_id: callId })
        .eq('id', currentAgentId);
      
      if (agentError) throw agentError;
      
      // Signal to parent component for Twilio connection
      if (onAssignCallToAgent) {
        onAssignCallToAgent(callId, currentAgentId);
      }
      
      toast({
        title: "Call Assigned",
        description: "You are now connected to the caller.",
      });
      
      fetchQueueAndCalls();
    } catch (error) {
      console.error("Error taking call from queue:", error);
      toast({
        title: "Error",
        description: "Failed to take call from queue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex justify-between items-center">
          <div>Call Queue</div>
          <Badge className="bg-yellow-500">{queueItems.length} Waiting</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Queue Items */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              Calls Waiting in Queue
            </h3>
            
            {queueItems.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded text-center text-gray-500">
                No calls in the queue
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {queueItems.map((item) => {
                  const contact = item.call?.contact;
                  const waitTime = item.created_timestamp ? 
                    formatDistanceToNow(new Date(item.created_timestamp), { addSuffix: false }) : 
                    'Unknown';
                  
                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <div className="font-medium">{contact?.name || 'Unknown Contact'}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          Waiting for {waitTime}
                        </div>
                      </div>
                      {currentAgentId && (
                        <Button 
                          onClick={() => takeCallFromQueue(item.id, item.call_id)}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <Phone className="mr-1 h-4 w-4" />
                          Take Call
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Active Calls */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <UserCheck className="mr-1 h-4 w-4" />
              Active Calls ({activeCalls.length})
            </h3>
            
            {activeCalls.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded text-center text-gray-500">
                No active calls
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {activeCalls.map((call) => {
                  const contact = call.contact;
                  const agent = call.agent;
                  const callTime = call.start_timestamp ? 
                    formatDistanceToNow(new Date(call.start_timestamp), { addSuffix: false }) : 
                    'Unknown';
                  
                  return (
                    <div 
                      key={call.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <div className="font-medium">
                          {contact?.name || 'Unknown Contact'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {agent ? `Agent: ${agent.name}` : 'No agent assigned'}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          Active for {callTime}
                        </div>
                      </div>
                      <Badge className="bg-blue-500">In Progress</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictiveDialerQueueMonitor;
