
import { useState, useEffect, useRef } from 'react';
import { CallStatusUpdate, natsService } from '@/services/nats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export function useCallStatus(sessionId: string | null) {
  const [callStatuses, setCallStatuses] = useState<Record<string, CallStatusUpdate>>({});
  const [isPolling, setIsPolling] = useState(false);
  const [pollingErrors, setPollingErrors] = useState(0);
  const lastTimestampRef = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef<number>(0);
  
  // Helper function to fetch updates via polling
  const fetchUpdates = async () => {
    if (!sessionId) return;
    
    pollCountRef.current++;
    const currentPollCount = pollCountRef.current;
    
    try {
      console.log(`[Poll #${currentPollCount}] Fetching call updates for session: ${sessionId}, since timestamp: ${lastTimestampRef.current}`);
      
      const response = await supabase.functions.invoke('get-call-updates', {
        body: { 
          sessionId,
          lastTimestamp: lastTimestampRef.current
        }
      });
      
      if (response.error) {
        console.error(`[Poll #${currentPollCount}] Error fetching call updates:`, response.error);
        setPollingErrors(prev => prev + 1);
        
        // Only show the error toast if we've had 3+ consecutive errors
        if (pollingErrors >= 3) {
          toast({
            title: "Connection issues",
            description: "Having trouble getting call updates. Will keep trying.",
            variant: "destructive",
          });
          // Reset counter to avoid spamming
          setPollingErrors(0);
        }
        return;
      }
      
      // Reset error counter on success
      setPollingErrors(0);
      
      console.log(`[Poll #${currentPollCount}] Received update response:`, response.data);
      console.log(`[Poll #${currentPollCount}] Debug info:`, response.data?.debug);
      
      if (response.data && response.data.updates && response.data.updates.length > 0) {
        console.log(`[Poll #${currentPollCount}] Received ${response.data.updates.length} call updates`);
        
        // Process the updates
        const newStatuses = { ...callStatuses };
        
        response.data.updates.forEach((update: any) => {
          const statusData = update.data || update; // Handle both DB and memory store formats
          if (statusData && statusData.callSid) {
            // Extract any lead information from the status update
            if (statusData.leadInfo) {
              statusData.leadName = statusData.leadInfo.name;
              statusData.company = statusData.leadInfo.company;
            }
            
            console.log(`[Poll #${currentPollCount}] Processing status update for call ${statusData.callSid}: ${statusData.status}`);
            
            // Update our status map
            newStatuses[statusData.callSid] = statusData;
            
            // Update our latest timestamp
            const updateTime = update.timestamp ? new Date(update.timestamp).getTime() : statusData.timestamp;
            if (updateTime > lastTimestampRef.current) {
              lastTimestampRef.current = updateTime;
              console.log(`[Poll #${currentPollCount}] Updated last timestamp to ${lastTimestampRef.current}`);
            }
          }
        });
        
        setCallStatuses(newStatuses);
        
        // Show a toast for the latest status update
        if (response.data.updates.length > 0) {
          const latestUpdate = response.data.updates[0];
          const statusData = latestUpdate.data || latestUpdate;
          
          if (statusData.status !== 'unknown') {
            toast({
              title: `Call ${statusData.status}`,
              description: `${statusData.leadName || statusData.phoneNumber || 'Unknown caller'} - ${new Date().toLocaleTimeString()}`,
              variant: statusData.status === 'completed' || statusData.status === 'in-progress' ? 'default' : 'destructive',
            });
          }
        }
      } else {
        console.log(`[Poll #${currentPollCount}] No new call updates found`);
      }
    } catch (error) {
      console.error(`[Poll #${currentPollCount}] Failed to fetch call updates:`, error);
      setPollingErrors(prev => prev + 1);
    }
  };
  
  useEffect(() => {
    if (!sessionId) return;
    
    console.log(`Starting polling for session ID: ${sessionId}`);
    
    // Reset poll count
    pollCountRef.current = 0;
    
    // Reset timestamp to ensure we get recent updates
    lastTimestampRef.current = 0;
    
    // Start polling
    setIsPolling(true);
    
    // Initial fetch
    fetchUpdates();
    
    // Set up polling interval - longer interval if errors are occurring
    pollingIntervalRef.current = setInterval(fetchUpdates, pollingErrors > 5 ? 5000 : 2000);
    
    // Also try to use NATS if available (as a bonus real-time method)
    let natsUnsubscribe: (() => void) | undefined;
    
    try {
      natsUnsubscribe = natsService.subscribeToCallStatus(sessionId, (update) => {
        console.log('Received NATS update:', update);
        setCallStatuses(prev => ({
          ...prev,
          [update.callSid]: update
        }));
      });
    } catch (error) {
      console.warn('NATS subscription failed, falling back to polling only:', error);
    }
    
    return () => {
      // Clean up
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      if (natsUnsubscribe) {
        natsUnsubscribe();
      }
      
      setIsPolling(false);
      console.log(`Stopped polling for session ID: ${sessionId}`);
    };
  }, [sessionId]);
  
  // Add an effect to show a toast when we've been polling for a while without updates
  useEffect(() => {
    if (!isPolling || Object.keys(callStatuses).length > 0) return;
    
    const showNoUpdatesToast = setTimeout(() => {
      if (Object.keys(callStatuses).length === 0) {
        toast({
          title: "No call updates yet",
          description: "We're monitoring for call activity, but haven't received any updates yet.",
          variant: "default",
        });
      }
    }, 10000); // Show after 10 seconds of polling with no updates
    
    return () => clearTimeout(showNoUpdatesToast);
  }, [isPolling, callStatuses]);
  
  return { callStatuses, isPolling };
}
