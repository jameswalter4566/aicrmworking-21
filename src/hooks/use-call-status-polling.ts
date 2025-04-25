
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CallStatusUpdate {
  callSid: string;
  status: string;
  timestamp: number;
  phoneNumber?: string;
  leadName?: string;
  company?: string;
  duration?: number;
  answeredBy?: string;
}

interface UseCallStatusPollingProps {
  sessionId: string;
  enabled?: boolean;
  interval?: number;
  onUpdate?: (updates: CallStatusUpdate[]) => void;
}

export function useCallStatusPolling({
  sessionId,
  enabled = true,
  interval = 1000, // Changed to poll every second
  onUpdate
}: UseCallStatusPollingProps) {
  const [updates, setUpdates] = useState<CallStatusUpdate[]>([]);
  const [lastTimestamp, setLastTimestamp] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);

  // Function to get updates from our database
  const fetchUpdates = useCallback(async () => {
    if (!sessionId || !enabled) return;
    
    try {
      console.log(`Fetching call status updates for session: ${sessionId}, since timestamp: ${lastTimestamp}`);
      setIsPolling(true);
      
      // Call get-call-updates function
      const { data: callUpdatesData, error: callUpdatesError } = await supabase.functions.invoke('get-call-updates', {
        body: { 
          sessionId, 
          lastTimestamp 
        }
      });

      if (callUpdatesError) {
        console.error(`Error fetching call updates: ${callUpdatesError.message}`);
        setError(`Error fetching call updates: ${callUpdatesError.message}`);
      } else {
        console.log(`[Poll #${Math.random().toString(36).substr(2, 5)}] Received update response:`, JSON.stringify(callUpdatesData));
        
        if (callUpdatesData?.updates?.length > 0) {
          const newUpdates = callUpdatesData.updates;
          console.log(`Found ${newUpdates.length} new updates`);
          
          // Find the latest timestamp to use for next poll
          const latestTimestamp = Math.max(
            ...newUpdates.map((update: any) => update.timestamp || 0),
            lastTimestamp
          );
          
          setLastTimestamp(latestTimestamp);
          setUpdates(prev => [...prev, ...newUpdates]);
          
          if (onUpdate) {
            onUpdate(newUpdates);
          }
        } else {
          console.log(`[Poll #${Math.random().toString(36).substr(2, 5)}] No new call updates found`);
        }
        
        if (callUpdatesData?.debug) {
          console.log(`[Poll #${Math.random().toString(36).substr(2, 5)}] Debug info:`, callUpdatesData.debug);
          setDiagnosticInfo(callUpdatesData.debug);
        }
      }
    } catch (err: any) {
      console.error(`Error in call status polling:`, err);
      setError(`Polling error: ${err.message}`);
    } finally {
      setIsPolling(false);
    }
  }, [sessionId, enabled, lastTimestamp, onUpdate]);

  // Function to get active call SIDs for direct Twilio API calls - ENHANCED FOR MORE AGGRESSIVE POLLING
  const fetchActiveCalls = useCallback(async () => {
    if (!sessionId || !enabled) return;
    
    try {
      // Get active calls for this session
      const { data: activeCalls, error: activeCallsError } = await supabase
        .from('predictive_dialer_calls')
        .select('twilio_call_sid, status')
        .eq('session_id', sessionId)
        .not('twilio_call_sid', 'is', null);
        
      if (activeCallsError) {
        console.error(`Error fetching active calls: ${activeCallsError.message}`);
        return;
      }
      
      console.log(`Found ${activeCalls?.length || 0} calls to check with Twilio API`);
      
      if (activeCalls && activeCalls.length > 0) {
        // For each call, fetch its status directly from Twilio API
        for (const call of activeCalls) {
          if (call.twilio_call_sid) {
            try {
              console.log(`Fetching status for call ${call.twilio_call_sid} from Twilio API`);
              const { data: twilioData, error: twilioError } = await supabase.functions.invoke('twilio-call-status', {
                body: { 
                  callSid: call.twilio_call_sid, 
                  sessionId 
                }
              });
              
              if (twilioError) {
                console.error(`Error fetching Twilio status for call ${call.twilio_call_sid}: ${twilioError.message}`);
              } else if (twilioData?.data) {
                console.log(`Received Twilio data for call ${call.twilio_call_sid}:`, twilioData.data);
                
                // Add to updates if we got new info
                const newUpdate = {
                  callSid: call.twilio_call_sid,
                  status: twilioData.data.status,
                  timestamp: Date.now(),
                  duration: twilioData.data.duration,
                  answeredBy: twilioData.data.answeredBy,
                  from: twilioData.data.from,
                  to: twilioData.data.to
                };
                
                setUpdates(prev => [...prev, newUpdate]);
                
                if (onUpdate) {
                  onUpdate([newUpdate]);
                }
              }
            } catch (err) {
              console.error(`Error fetching Twilio data for call ${call.twilio_call_sid}:`, err);
            }
          }
        }
      } else {
        console.log('No calls found to fetch from Twilio API');
      }
    } catch (err) {
      console.error('Error checking active calls:', err);
    }
  }, [sessionId, enabled, onUpdate]);
  
  // Set up polling intervals - more aggressive with 1 second polling
  useEffect(() => {
    if (!enabled || !sessionId) return;
    
    console.log(`Setting up call status polling for session ${sessionId} with 1 second intervals`);
    
    // Initial fetch
    fetchUpdates();
    fetchActiveCalls();
    
    // Set up polling intervals - polling both every second for maximum data capture
    const updateInterval = setInterval(fetchUpdates, interval);
    const directTwilioInterval = setInterval(fetchActiveCalls, interval);
    
    return () => {
      clearInterval(updateInterval);
      clearInterval(directTwilioInterval);
    };
  }, [sessionId, enabled, interval, fetchUpdates, fetchActiveCalls]);

  return {
    updates,
    isPolling,
    error,
    lastTimestamp,
    refreshNow: fetchUpdates,
    checkTwilioDirectly: fetchActiveCalls,
    diagnosticInfo
  };
}
