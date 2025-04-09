
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, BarChart } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PowerDialerCall, PowerDialerCallQueue, PowerDialerContact } from '@/types/powerDialer';

interface QueueCall extends PowerDialerCallQueue {
  calls?: PowerDialerCall & {
    contacts?: PowerDialerContact;
  };
}

interface Call extends PowerDialerCall {
  contacts?: PowerDialerContact;
}

interface PowerDialerQueueMonitorProps {
  agentId: string | null;
}

const PowerDialerQueueMonitor: React.FC<PowerDialerQueueMonitorProps> = ({ agentId }) => {
  const [queueCalls, setQueueCalls] = useState<QueueCall[]>([]);
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    queueLength: 0,
    activeCalls: 0,
    humanAnswers: 0,
    machineAnswers: 0,
  });

  useEffect(() => {
    fetchQueueData();
    fetchStats();

    // Subscribe to changes
    const queueSubscription = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'power_dialer_call_queue'
        },
        () => {
          fetchQueueData();
          fetchStats();
        }
      )
      .subscribe();

    const callsSubscription = supabase
      .channel('calls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'power_dialer_calls'
        },
        () => {
          fetchQueueData();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(queueSubscription);
      supabase.removeChannel(callsSubscription);
    };
  }, []);

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      
      // Get queued calls
      const { data: queueData, error: queueError } = await supabase
        .from('power_dialer_call_queue')
        .select('*, calls:call_id(id, contact_id, twilio_call_sid, status, contacts:contact_id(name, phone_number))')
        .order('priority', { ascending: false })
        .order('created_timestamp', { ascending: true });

      if (queueError) throw queueError;
      setQueueCalls(queueData as QueueCall[] || []);

      // Get active calls
      const { data: activeData, error: activeError } = await supabase
        .from('power_dialer_calls')
        .select('*, contacts:contact_id(name, phone_number)')
        .eq('status', 'in_progress')
        .order('start_timestamp', { ascending: false })
        .limit(10);

      if (activeError) throw activeError;
      setActiveCalls(activeData as Call[] || []);
    } catch (error) {
      console.error('Error fetching queue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get queue length
      const { count: queueLength } = await supabase
        .from('power_dialer_call_queue')
        .select('*', { count: 'exact', head: true });

      // Get active calls count
      const { count: activeCallsCount } = await supabase
        .from('power_dialer_calls')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      // Get human answers count for today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { count: humanAnswers } = await supabase
        .from('power_dialer_calls')
        .select('*', { count: 'exact', head: true })
        .eq('machine_detection_result', 'human')
        .gte('start_timestamp', todayStart.toISOString());

      // Get machine answers count for today
      const { count: machineAnswers } = await supabase
        .from('power_dialer_calls')
        .select('*', { count: 'exact', head: true })
        .eq('machine_detection_result', 'machine')
        .gte('start_timestamp', todayStart.toISOString());

      setStats({
        queueLength: queueLength || 0,
        activeCalls: activeCallsCount || 0,
        humanAnswers: humanAnswers || 0,
        machineAnswers: machineAnswers || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getWaitTime = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    const startTime = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const diffMinutes = Math.floor((now - startTime) / 60000);
    return `${diffMinutes} min`;
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center">
              <Phone className="w-4 h-4 mr-2 text-blue-500" />
              Active Calls
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-bold">{stats.activeCalls}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center">
              <Clock className="w-4 h-4 mr-2 text-yellow-500" />
              Call Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-bold">{stats.queueLength}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center">
              <BarChart className="w-4 h-4 mr-2 text-green-500" />
              Human Answers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-bold">{stats.humanAnswers}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center">
              <BarChart className="w-4 h-4 mr-2 text-red-500" />
              Voicemails
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-bold">{stats.machineAnswers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Calls */}
      <div className="border rounded-md p-4 bg-white shadow-sm mb-4">
        <h3 className="font-semibold mb-3">Active Calls</h3>
        <ScrollArea className="h-[150px]">
          {loading ? (
            <div className="text-center py-4">Loading active calls...</div>
          ) : activeCalls.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No active calls</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>{call.contacts?.name || 'Unknown'}</TableCell>
                    <TableCell>{call.contacts?.phone_number || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-100">
                        {call.machine_detection_result || 'Detecting...'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatTime(call.start_timestamp || '')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </div>

      {/* Call Queue */}
      <div className="border rounded-md p-4 bg-white shadow-sm">
        <h3 className="font-semibold mb-3">Call Queue</h3>
        <ScrollArea className="h-[200px]">
          {loading ? (
            <div className="text-center py-4">Loading queue data...</div>
          ) : queueCalls.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No calls in queue</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Waiting</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueCalls.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.calls?.contacts?.name || 'Unknown'}</TableCell>
                    <TableCell>{item.calls?.contacts?.phone_number || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={(item.priority || 1) > 1 ? 'default' : 'outline'}>
                        {(item.priority || 1) > 1 ? 'High' : 'Normal'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getWaitTime(item.created_timestamp || '')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </div>
    </>
  );
};

export default PowerDialerQueueMonitor;
