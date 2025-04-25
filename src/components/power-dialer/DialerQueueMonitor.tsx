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
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [noLeadsError, setNoLeadsError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const fetchQueueStats = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    try {
      console.log(`Fetching queue stats for session: ${sessionId}, attempt #${attemptCount + 1}`);
      
      // Query session_queue_stats view first
      const { data, error } = await supabase
        .from('session_queue_stats')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        // Only throw for errors other than "no rows returned"
        throw error;
      }
      
      // If we got data, use it
      if (data) {
        console.log("Queue stats from view:", data);
        setStats(data);
        if (data.total_count === 0) {
          setNoLeadsError("No leads found in the queue");
        } else if (data.queued_count === 0 && data.total_count > 0) {
          // If we have leads but none are queued, that's unusual
          console.log("Warning: Found leads but none are queued");
        } else {
          setNoLeadsError(null);
        }
      } else {
        // Fallback to counting directly from dialing_session_leads
        console.log("No stats in view, querying leads table directly");
        const { data: leadsData, error: leadsError } = await supabase
          .from('dialing_session_leads')
          .select('status, lead_id, notes')
          .eq('session_id', sessionId);
          
        if (leadsError) throw leadsError;
        
        if (!leadsData || leadsData.length === 0) {
          console.log("No leads found for session:", sessionId);
          
          // If this is fewer than 3 attempts, we might just need to wait for DB to update
          if (attemptCount < 3) {
            setAttemptCount(prev => prev + 1);
            setNoLeadsError("Loading leads, please wait...");
            return;
          }
          
          setNoLeadsError("No leads found in this dialing session");
          setStats({
            queued_count: 0,
            in_progress_count: 0,
            completed_count: 0,
            total_count: 0
          });
          return;
        }
        
        // Count the leads by status
        const queued = leadsData?.filter(lead => lead.status === 'queued').length || 0;
        const inProgress = leadsData?.filter(lead => lead.status === 'in_progress').length || 0;
        const completed = leadsData?.filter(lead => lead.status === 'completed').length || 0;
        
        console.log(`Direct count - Queued: ${queued}, In Progress: ${inProgress}, Completed: ${completed}, Total: ${leadsData.length}`);
        
        setStats({
          queued_count: queued,
          in_progress_count: inProgress,
          completed_count: completed,
          total_count: (leadsData?.length || 0)
        });
      }
    } catch (error) {
      console.error('Error fetching queue stats:', error);
      setNoLeadsError("Error loading queue data");
    } finally {
      setIsLoading(false);
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
          (payload) => {
            console.log("Real-time update received:", payload);
            fetchQueueStats();
          }
        )
        .subscribe();

      // Poll for updates every 5 seconds as a fallback
      const intervalId = setInterval(fetchQueueStats, 5000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(intervalId);
      };
    }
  }, [sessionId]);

  // Extra effect to handle initial loading delays
  useEffect(() => {
    if (sessionId && attemptCount > 0 && attemptCount < 3) {
      const timer = setTimeout(() => {
        fetchQueueStats();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [sessionId, attemptCount]);

  if (!sessionId) return null;

  const handleRefresh = () => {
    setAttemptCount(0);
    fetchQueueStats();
    toast.info("Refreshing queue data...");
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          Queue Status
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {noLeadsError && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
            {noLeadsError}
          </div>
        )}
        
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
