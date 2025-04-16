
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Phone, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';

interface QueueStats {
  queued_count: number;
  in_progress_count: number;
  completed_count: number;
  total_count: number;
}

interface DialerQueueMonitorProps {
  sessionId: string | null;
}

const DialerQueueMonitor: React.FC<DialerQueueMonitorProps> = ({ sessionId }) => {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQueueStats = async () => {
    if (!sessionId) return;
    
    try {
      const { data, error } = await supabase
        .from('session_queue_stats')
        .select('*')
        .eq('session_id', sessionId)
        .single();
      
      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error fetching queue stats:', error);
      toast.error('Failed to fetch queue statistics');
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchQueueStats();
      
      // Set up real-time subscription for queue updates
      const channel = supabase
        .channel('queue_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'dialing_session_leads',
            filter: `session_id=eq.${sessionId}`
          },
          () => {
            fetchQueueStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [sessionId]);

  if (!sessionId) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          Queue Status
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats?.queued_count || 0}
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Queued
            </div>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.in_progress_count || 0}
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-1">
              <Phone className="h-4 w-4" />
              In Progress
            </div>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats?.completed_count || 0}
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Completed
            </div>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {stats?.total_count || 0}
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Total
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DialerQueueMonitor;
