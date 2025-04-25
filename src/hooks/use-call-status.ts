import { useState, useEffect, useRef } from 'react';
import { natsService } from '@/services/nats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { CallStatus, CallStatusUpdate } from '@/types/dialer';

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
      console.log(`Fetching call updates for session: ${sessionId}, since timestamp: ${lastTimestampRef.current}`);
      
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
      
      console.log('Received update response:', response.data);
      
      if (response.data?.updates?.length > 0) {
        console.log(`Received ${response.data.updates.length} call updates:`, response.data.updates);
        
        const newStatuses = { ...callStatuses };
        
        response.data.updates.forEach((update: any) => {
          const statusData = update.data || update;
          if (statusData?.callSid) {
            // Extract lead information
            if (statusData.leadInfo) {
              statusData.leadName = statusData.leadInfo.name;
              statusData.company = statusData.leadInfo.company;
            }
            
            // Make sure error information is included
            if (statusData.errorCode || statusData.ErrorCode) {
              statusData.errorCode = statusData.errorCode || statusData.ErrorCode;
            }
            if (statusData.errorMessage || statusData.ErrorMessage) {
              statusData.errorMessage = statusData.errorMessage || statusData.ErrorMessage;
            }
            
            newStatuses[statusData.callSid] = {
              ...statusData,
              status: statusData.status as CallStatus,
              errorCode: statusData.errorCode,
              errorMessage: statusData.errorMessage
            };
            
            // Update timestamp tracking
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
    
    console.log(`Starting polling for session ID: ${sessionId}`);
    
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
        console.log('Received NATS call status update:', update);
        setCallStatuses(prev => ({
          ...prev,
          [update.callSid]: {
            ...update,
            status: update.status as CallStatus,
            errorCode: update.errorCode,
            errorMessage: update.errorMessage
          }
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
  
  // Create a mock update if one is explicitly requested (for testing only)
  const createMockUpdate = () => {
    if (!sessionId) return;
    
    const mockUpdate: CallStatusUpdate = {
      callSid: `mock-call-${Date.now()}`,
      status: 'ringing',
      timestamp: Date.now(),
      phoneNumber: '+18158625164',
      leadName: 'Mock Test Lead',
      company: 'Test Company',
      errorCode: undefined,
      errorMessage: undefined
    };
    
    setCallStatuses(prev => ({
      ...prev,
      [mockUpdate.callSid]: mockUpdate
    }));
    
    console.log('Added mock call status for testing:', mockUpdate);
  };
  
  return { callStatuses, isPolling, createMockUpdate };
}
