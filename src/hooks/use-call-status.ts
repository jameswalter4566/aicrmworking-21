
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
  
  // Helper function to fetch updates via polling
  const fetchUpdates = async () => {
    if (!sessionId) return;
    
    try {
      const response = await supabase.functions.invoke('get-call-updates', {
        body: { 
          sessionId,
          lastTimestamp: lastTimestampRef.current
        }
      });
      
      if (response.error) {
        console.error('Error fetching call updates:', response.error);
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
      
      if (response.data && response.data.updates && response.data.updates.length > 0) {
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
            
            // Update our status map
            newStatuses[statusData.callSid] = statusData;
            
            // Update our latest timestamp
            const updateTime = update.timestamp || statusData.timestamp;
            if (updateTime > lastTimestampRef.current) {
              lastTimestampRef.current = updateTime;
            }
          }
        });
        
        setCallStatuses(newStatuses);
      }
    } catch (error) {
      console.error('Failed to fetch call updates:', error);
      setPollingErrors(prev => prev + 1);
    }
  };
  
  useEffect(() => {
    if (!sessionId) return;
    
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
    };
  }, [sessionId]);
  
  return { callStatuses, isPolling };
}
