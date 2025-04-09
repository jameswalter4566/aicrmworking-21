
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { PredictiveDialerCall, PredictiveDialerQueueItem } from '@/types/predictiveDialer';
import { Phone, PhoneCall, PhoneOff, User, Clock, Info } from 'lucide-react';

interface PredictiveDialerQueueMonitorProps {
  twilioLoaded: boolean;
}

export const PredictiveDialerQueueMonitor: React.FC<PredictiveDialerQueueMonitorProps> = ({ twilioLoaded }) => {
  const [queuedCalls, setQueuedCalls] = useState<PredictiveDialerQueueItem[]>([]);
  const [activeCalls, setActiveCalls] = useState<PredictiveDialerCall[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchQueuedCalls();
    fetchActiveCalls();

    // Set up real-time subscription for call queue updates
    const queueChannel = supabase
      .channel('predictive-dialer-queue-updates')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'power_dialer_call_queue'
        }, 
        () => {
          fetchQueuedCalls();
        })
      .subscribe();

    // Set up real-time subscription for active calls updates
    const callsChannel = supabase
      .channel('predictive-dialer-calls-updates')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'power_dialer_calls'
        }, 
        () => {
          fetchActiveCalls();
        })
      .subscribe();

    // Clean up subscriptions
    return () => {
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(callsChannel);
    };
  }, []);

  const fetchQueuedCalls = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('power_dialer_call_queue')
        .select(`
          *,
          call:call_id (
            *,
            contact:contact_id (*)
          )
        `)
        .order('priority', { ascending: false })
        .order('created_timestamp', { ascending: true });

      if (error) throw error;
      setQueuedCalls(data || []);
    } catch (error) {
      console.error('Error fetching queued calls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('power_dialer_calls')
        .select(`
          *,
          contact:contact_id (*),
          agent:agent_id (*)
        `)
        .eq('status', 'in_progress');

      if (error) throw error;
      setActiveCalls(data || []);
    } catch (error) {
      console.error('Error fetching active calls:', error);
    }
  };

  const handleHangupCall = async (callId: string, twilioCallSid?: string) => {
    if (!twilioCallSid) {
      toast({
        title: "Error",
        description: "No Twilio Call SID found for this call",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(prev => ({ ...prev, [callId]: true }));

    try {
      // Call the edge function to end the call
      const { data, error } = await supabase.functions.invoke('power-dialer-end-call', {
        body: { callSid: twilioCallSid }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Call ended successfully"
      });

      // Refresh the calls lists
      fetchActiveCalls();
      fetchQueuedCalls();
    } catch (error) {
      console.error('Error hanging up call:', error);
      toast({
        title: "Error",
        description: "Failed to end call",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(prev => ({ ...prev, [callId]: false }));
    }
  };

  const handleRemoveFromQueue = async (queueItemId: string) => {
    setIsProcessing(prev => ({ ...prev, [queueItemId]: true }));

    try {
      const { error } = await supabase
        .from('power_dialer_call_queue')
        .delete()
        .eq('id', queueItemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Call removed from queue"
      });

      fetchQueuedCalls();
    } catch (error) {
      console.error('Error removing call from queue:', error);
      toast({
        title: "Error",
        description: "Failed to remove call from queue",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(prev => ({ ...prev, [queueItemId]: false }));
    }
  };

  const getCallStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge className="bg-green-500">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completed</Badge>;
      case 'queued':
        return <Badge className="bg-yellow-500">Queued</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {activeCalls.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No active calls at the moment
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Machine Detection</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell>
                        {call.contact?.name || 'Unknown Contact'}
                      </TableCell>
                      <TableCell>
                        {call.contact?.phone_number || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {call.machine_detection_result === 'human' ? (
                          <Badge className="bg-green-500">Human</Badge>
                        ) : call.machine_detection_result === 'machine' ? (
                          <Badge className="bg-orange-500">Machine</Badge>
                        ) : (
                          <Badge className="bg-gray-500">Unknown</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {call.agent?.name || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        {call.start_timestamp ? (
                          <span>
                            {Math.floor((Date.now() - new Date(call.start_timestamp).getTime()) / 1000)} sec
                          </span>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleHangupCall(call.id, call.twilio_call_sid)}
                          disabled={isProcessing[call.id] || !twilioLoaded}
                        >
                          <PhoneOff className="h-4 w-4 mr-1" />
                          {isProcessing[call.id] ? 'Hanging up...' : 'Hang Up'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading queue...</div>
          ) : queuedCalls.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No calls in the queue
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Wait Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queuedCalls.map((queueItem) => (
                    <TableRow key={queueItem.id}>
                      <TableCell>
                        {queueItem.call?.contact?.name || 'Unknown Contact'}
                      </TableCell>
                      <TableCell>
                        {queueItem.call?.contact?.phone_number || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={queueItem.priority > 1 ? "default" : "outline"} className={queueItem.priority > 1 ? "bg-red-500" : ""}>
                          {queueItem.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {queueItem.created_timestamp ? (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {Math.floor((Date.now() - new Date(queueItem.created_timestamp).getTime()) / 1000)} sec
                          </span>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {queueItem.call ? getCallStatusBadge(queueItem.call.status) : 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRemoveFromQueue(queueItem.id)}
                          disabled={isProcessing[queueItem.id]}
                        >
                          {isProcessing[queueItem.id] ? 'Removing...' : 'Remove'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
