
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface CallLog {
  phoneNumber: string;
  timestamp: number;
  status: string;
  callSid?: string;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
  leadId?: string;
}

interface CallHistoryTrackerProps {
  sessionId?: string;
}

export function CallHistoryTracker({ sessionId = 'default-session' }: CallHistoryTrackerProps) {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchCallLogs();
    // Set up a refresh interval
    const interval = setInterval(fetchCallLogs, 15000);
    return () => clearInterval(interval);
  }, [sessionId, refreshKey]);

  const fetchCallLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('twilio-voice', {
        body: { action: 'getCallLogs', sessionId }
      });

      if (error) throw error;
      
      if (data?.logs) {
        setCallLogs(data.logs);
      }
    } catch (error) {
      console.error("Error fetching call logs:", error);
      toast({
        title: "Error Fetching Call Logs",
        description: error.message || "Could not retrieve call history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const clearCallLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('twilio-voice', {
        body: { action: 'clearCallLogs', sessionId }
      });

      if (error) throw error;
      
      toast({
        title: "Call Logs Cleared",
        description: "Call history has been cleared for this session"
      });
      
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error clearing call logs:", error);
      toast({
        title: "Error Clearing Call Logs",
        description: error.message || "Could not clear call history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'no-answer':
        return 'bg-orange-500';
      case 'initiated':
        return 'bg-blue-500';
      case 'in-progress':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Call History
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchCallLogs}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearCallLogs}
              disabled={loading}
            >
              Clear History
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Tracking call attempts and outcomes for this dialing session
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full">
          {callLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No call history available for this session
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callLogs.map((log, index) => (
                  <TableRow key={`${log.phoneNumber}-${log.timestamp}-${index}`}>
                    <TableCell>{log.phoneNumber}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {log.errorMessage ? (
                        <span className="text-red-500 text-xs">{log.errorCode}: {log.errorMessage}</span>
                      ) : log.duration ? (
                        <span>{log.duration}s</span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
