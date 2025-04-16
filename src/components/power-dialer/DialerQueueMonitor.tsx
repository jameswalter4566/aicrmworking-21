import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from 'lucide-react';

interface DialerQueueMonitorProps {
  sessionId: string;
  onStatsUpdate?: (stats: any) => void;
}

const DialerQueueMonitor: React.FC<DialerQueueMonitorProps> = ({ 
  sessionId,
  onStatsUpdate 
}) => {
  const [queueStats, setQueueStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    const fetchStats = async () => {
      setIsLoading(true);
      const { data: stats, error } = await supabase
        .from('session_queue_stats')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (!error && stats) {
        setQueueStats(stats);
        onStatsUpdate?.(stats);
      }
      setIsLoading(false);
    };

    const channel = supabase
      .channel('session_queue_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_queue_stats',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.new) {
            setQueueStats(payload.new);
            onStatsUpdate?.(payload.new);
          } else if (payload.eventType === 'DELETE') {
            setQueueStats(null);
            onStatsUpdate?.(null);
          }
        }
      )
      .subscribe();

    fetchStats();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, onStatsUpdate]);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400 mb-2" />
        Loading queue status...
      </div>
    );
  }

  if (!queueStats) {
    return (
      <div className="text-center py-4">
        <Badge variant="secondary">
          Queue Status: Not Available
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Total Leads:
        </div>
        <Badge variant="outline">
          {queueStats.total_leads}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Queued:
        </div>
        <Badge className="bg-blue-100 text-blue-800">
          {queueStats.queued_count}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          In Progress:
        </div>
        <Badge className="bg-yellow-100 text-yellow-800">
          {queueStats.in_progress_count}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Completed:
        </div>
        <Badge className="bg-green-100 text-green-800">
          {queueStats.completed_count}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Failed:
        </div>
        <Badge className="bg-red-100 text-red-800">
          {queueStats.failed_count}
        </Badge>
      </div>
    </div>
  );
};

export default DialerQueueMonitor;
