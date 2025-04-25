
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Phone, Clock, User } from 'lucide-react';
import { useCallStatusPolling } from '@/hooks/use-call-status-polling';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/utils/supabase-custom-client';

const DialerSession = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') || '';
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [callUpdates, setCallUpdates] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    queued: 0
  });

  // Fetch session info
  useEffect(() => {
    if (!sessionId) return;
    
    const fetchSessionInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('dialing_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        
        if (error) throw error;
        setSessionInfo(data);
      } catch (err: any) {
        console.error('Error fetching session info:', err);
        setError(`Failed to load session: ${err.message}`);
      }
    };
    
    fetchSessionInfo();
    
    // Set up an interval to refresh stats regularly
    const statsInterval = setInterval(fetchQueueStats, 5000);
    return () => clearInterval(statsInterval);
  }, [sessionId]);
  
  // Fetch call statistics
  const fetchQueueStats = async () => {
    if (!sessionId) return;
    
    try {
      console.log(`Fetching queue stats for session: ${sessionId}, attempt #1`);
      
      // Try to get stats from the view first
      const { data: statsData, error: statsError } = await supabase
        .from('session_queue_stats')
        .select('*')
        .eq('session_id', sessionId)
        .single();
        
      if (statsError || !statsData) {
        console.log('No stats in view, querying leads table directly');
        
        // Fallback to directly querying the leads table
        const { data: queuedCount } = await supabase
          .from('dialing_session_leads')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('status', 'queued');
          
        const { data: inProgressCount } = await supabase
          .from('dialing_session_leads')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('status', 'in_progress');
          
        const { data: completedCount } = await supabase
          .from('dialing_session_leads')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('status', 'completed');
          
        const totalCount = (queuedCount || 0) + (inProgressCount || 0) + (completedCount || 0);
        
        console.log(`Direct count - Queued: ${queuedCount}, In Progress: ${inProgressCount}, Completed: ${completedCount}, Total: ${totalCount}`);
        
        setStats({
          queued: queuedCount || 0,
          inProgress: inProgressCount || 0,
          completed: completedCount || 0,
          total: totalCount
        });
      } else {
        // Use stats from the view
        setStats({
          queued: statsData.queued_count || 0,
          inProgress: statsData.in_progress_count || 0,
          completed: statsData.completed_count || 0,
          total: statsData.total_count || 0
        });
        console.log(`Using stats from view - ${JSON.stringify(statsData)}`);
      }
    } catch (err) {
      console.error('Error fetching queue stats:', err);
    }
  };

  // Use our custom hook for call status polling
  const { 
    updates, 
    isPolling, 
    error: pollingError,
    lastTimestamp,
    refreshNow,
    checkTwilioDirectly,
    diagnosticInfo
  } = useCallStatusPolling({
    sessionId,
    enabled: !!sessionId,
    interval: 2000,
    onUpdate: (newUpdates) => {
      console.log(`Received ${newUpdates.length} new call updates`);
      setCallUpdates(prev => {
        // Combine updates, remove duplicates and sort by timestamp
        const combined = [...prev, ...newUpdates];
        const unique = Array.from(new Map(combined.map(item => [item.callSid, item])).values());
        return unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      });
    }
  });
  
  // Additional manual check function for debugging
  const checkCallsManually = async () => {
    if (!sessionId) return;
    
    try {
      // Refresh queue stats
      await fetchQueueStats();
      
      // Force call status refresh
      await refreshNow();
      
      // Force direct Twilio check
      await checkTwilioDirectly();
    } catch (err) {
      console.error('Error in manual check:', err);
    }
  };

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            {sessionInfo?.name || 'Dialing Session'}
          </h1>
          <div className="flex space-x-2">
            <Badge variant={sessionInfo?.status === 'active' ? "default" : "secondary"}>
              Status: {sessionInfo?.status || 'Unknown'}
            </Badge>
            <Badge variant="outline">
              Session ID: {sessionId.substring(0, 8)}...
            </Badge>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={checkCallsManually}
            disabled={isPolling}
          >
            Refresh Call Status
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{stats.queued}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Polling Status */}
      <div className="mb-6">
        <Alert variant={pollingError ? "destructive" : "default"}>
          <AlertTitle className="flex items-center">
            {isPolling ? (
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Polling for updates...
              </span>
            ) : (
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Last checked: {new Date().toLocaleTimeString()}
              </span>
            )}
          </AlertTitle>
          <AlertDescription>
            {pollingError ? (
              `Error: ${pollingError}`
            ) : (
              `Monitoring for call updates. Last timestamp: ${new Date(lastTimestamp).toLocaleTimeString()}`
            )}
          </AlertDescription>
        </Alert>
      </div>

      {/* Call Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Call Status Updates
            <Badge className="ml-2">{callUpdates.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {callUpdates.length === 0 ? (
            <div className="text-center p-6 text-gray-500">
              <Phone className="mx-auto h-12 w-12 opacity-20 mb-2" />
              <p>No call status updates received yet.</p>
              <p className="text-sm">Updates will appear here as calls are made and status changes occur.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {callUpdates.map((update, index) => (
                <div 
                  key={`${update.callSid}-${update.timestamp}-${index}`} 
                  className="p-3 border rounded-md"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {update.leadName || 'Unknown Contact'}
                        {update.phoneNumber && (
                          <span className="text-gray-500 ml-1">({update.phoneNumber})</span>
                        )}
                      </p>
                      <p className="text-sm">
                        Call SID: {update.callSid?.substring(0, 8)}...
                      </p>
                      <p className="text-xs text-gray-400">
                        {update.timestamp ? new Date(update.timestamp).toLocaleString() : 'Unknown time'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge 
                        variant={
                          update.status === 'in-progress' || update.status === 'in_progress' ? "default" :
                          update.status === 'completed' ? "secondary" :
                          update.status === 'busy' || update.status === 'failed' ? "destructive" :
                          "outline"
                        }
                      >
                        {update.status}
                      </Badge>
                      {update.duration && (
                        <span className="text-xs mt-1 text-gray-500">
                          Duration: {update.duration}s
                        </span>
                      )}
                      {update.answeredBy && (
                        <Badge variant="outline" className="mt-1">
                          {update.answeredBy}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnostic Info */}
      {diagnosticInfo && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Diagnostic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto p-2 bg-gray-50 rounded">
              {JSON.stringify(diagnosticInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DialerSession;
