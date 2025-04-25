
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
  interval = 1000, // Poll every second
  onUpdate
}: UseCallStatusPollingProps) {
  const [updates, setUpdates] = useState<CallStatusUpdate[]>([]);
  const [lastTimestamp, setLastTimestamp] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);

  // Function to fetch updates from our database via edge function
  const fetchDatabaseUpdates = useCallback(async () => {
    if (!sessionId || !enabled) return [];
    
    try {
      console.log(`[DB POLLING] Fetching status updates for session: ${sessionId}, timestamp: ${lastTimestamp}`);
      
      const { data, error } = await supabase.functions.invoke('get-call-updates', {
        body: { 
          sessionId,
          lastTimestamp,
          enableMocking: false // Set to true if you want to generate mock data for testing
        }
      });
      
      if (error) {
        console.error(`[DB POLLING] Error fetching updates from edge function:`, error);
        return [];
      }
      
      console.log(`[DB POLLING] Received ${data?.updates?.length || 0} updates from edge function:`, data);
      
      // Update diagnostic info for debugging
      setDiagnosticInfo(prev => ({
        ...prev,
        edgeFunctionResponse: data,
        lastPolled: new Date().toISOString()
      }));
      
      if (data?.updates && data.updates.length > 0) {
        // Extract the highest timestamp for next polling cycle
        const maxTimestamp = Math.max(...data.updates.map(update => update.timestamp || 0));
        if (maxTimestamp > lastTimestamp) {
          setLastTimestamp(maxTimestamp);
        }
        
        // Process and format the updates
        return data.updates.map((update: any) => {
          const callData = update.data || {};
          return {
            callSid: callData.callSid || update.call_sid,
            status: callData.status || update.status,
            timestamp: update.timestamp || Date.now(),
            phoneNumber: callData.phoneNumber || callData.from,
            leadName: callData.leadName,
            company: callData.company,
            duration: callData.duration,
            answeredBy: callData.answeredBy
          };
        });
      }
      
      return [];
    } catch (err) {
      console.error(`[DB POLLING] Comprehensive error checking DB updates:`, err);
      setError(`Database polling error: ${err.message}`);
      return [];
    }
  }, [sessionId, enabled, lastTimestamp]);

  // Enhanced fetch for active calls directly from Twilio API
  const fetchActiveCalls = useCallback(async () => {
    if (!sessionId || !enabled) return [];
    
    try {
      console.log(`[TWILIO POLLING] Fetching active calls for session: ${sessionId}`);
      
      // Get active calls for this session
      const { data: activeCalls, error: activeCallsError } = await supabase
        .from('predictive_dialer_calls')
        .select('twilio_call_sid, status')
        .eq('session_id', sessionId)
        .not('twilio_call_sid', 'is', null);
        
      if (activeCallsError) {
        console.error(`[TWILIO POLLING] Error fetching active calls: ${activeCallsError.message}`);
        return [];
      }
      
      console.log(`[TWILIO POLLING] Found ${activeCalls?.length || 0} calls to check with Twilio API`);
      
      const callUpdates: CallStatusUpdate[] = [];
      
      if (activeCalls && activeCalls.length > 0) {
        for (const call of activeCalls) {
          if (call.twilio_call_sid) {
            try {
              console.log(`[TWILIO POLLING] Fetching Twilio status for call ${call.twilio_call_sid}`);
              
              const { data: twilioData, error: twilioError } = await supabase.functions.invoke('twilio-call-status', {
                body: { 
                  callSid: call.twilio_call_sid, 
                  sessionId,
                  forceRefresh: true
                }
              });
              
              if (twilioError) {
                console.error(`[TWILIO POLLING] Twilio status fetch error for ${call.twilio_call_sid}:`, twilioError);
              } else if (twilioData?.data) {
                console.log(`[TWILIO POLLING] Received Twilio data for ${call.twilio_call_sid}:`, twilioData.data);
                
                callUpdates.push({
                  callSid: call.twilio_call_sid,
                  status: twilioData.data.status,
                  timestamp: Date.now(),
                  duration: twilioData.data.duration,
                  answeredBy: twilioData.data.answeredBy,
                  phoneNumber: twilioData.data.from || twilioData.data.to,
                });
                
                // Update diagnostic info
                setDiagnosticInfo(prev => ({
                  ...prev,
                  twilioCallData: {
                    ...(prev?.twilioCallData || {}),
                    [call.twilio_call_sid]: twilioData.data
                  }
                }));
              }
            } catch (err) {
              console.error(`[TWILIO POLLING] Error fetching Twilio data for ${call.twilio_call_sid}:`, err);
            }
          }
        }
      } else {
        console.log('[TWILIO POLLING] No calls found to fetch from Twilio API');
      }
      
      return callUpdates;
    } catch (err) {
      console.error('[TWILIO POLLING] Comprehensive error checking active calls:', err);
      setError(`Twilio polling error: ${err.message}`);
      return [];
    }
  }, [sessionId, enabled]);

  // Comprehensive polling function that combines both methods
  const pollForUpdates = useCallback(async () => {
    if (!enabled || !sessionId) return;
    
    try {
      setIsPolling(true);
      setPollCount(prev => prev + 1);
      
      console.log(`[POLLING] Starting poll cycle #${pollCount + 1} for session ${sessionId}`);
      
      // Fetch updates from both sources concurrently
      const [dbUpdates, twilioUpdates] = await Promise.all([
        fetchDatabaseUpdates(),
        fetchActiveCalls()
      ]);
      
      // Combine all updates
      const allUpdates = [...dbUpdates, ...twilioUpdates];
      console.log(`[POLLING] Received total of ${allUpdates.length} updates (${dbUpdates.length} from DB, ${twilioUpdates.length} from Twilio)`);
      
      // If we have updates, process them
      if (allUpdates.length > 0) {
        setUpdates(prev => {
          // Combine updates, remove duplicates and sort by timestamp
          const combined = [...prev, ...allUpdates];
          const unique = Array.from(new Map(combined.map(item => [item.callSid + "-" + item.status, item])).values());
          return unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });
        
        // Call the onUpdate handler if provided
        if (onUpdate) {
          onUpdate(allUpdates);
        }
      }
      
      // Update diagnostic info
      setDiagnosticInfo(prev => ({
        ...prev,
        lastCompletePoll: new Date().toISOString(),
        sessionId,
        updateCount: updates.length,
        lastPollResults: {
          dbUpdateCount: dbUpdates.length,
          twilioUpdateCount: twilioUpdates.length,
          totalUpdateCount: allUpdates.length
        },
        pollCount: pollCount + 1
      }));
      
    } catch (err) {
      console.error('[POLLING] Error during polling cycle:', err);
      setError(`Polling error: ${err.message}`);
    } finally {
      setIsPolling(false);
    }
  }, [sessionId, enabled, pollCount, fetchDatabaseUpdates, fetchActiveCalls, updates.length, onUpdate]);

  // Set up aggressive polling
  useEffect(() => {
    if (!enabled || !sessionId) return;
    
    console.log(`[POLLING] Setting up aggressive call status polling for session ${sessionId}`);
    
    // Initial fetch
    pollForUpdates();
    
    // Set up polling interval
    const pollInterval = setInterval(pollForUpdates, interval);
    
    return () => {
      clearInterval(pollInterval);
      console.log('[POLLING] Polling stopped and interval cleared');
    };
  }, [sessionId, enabled, interval, pollForUpdates]);

  // Force an immediate refresh
  const refreshNow = useCallback(async () => {
    console.log('[POLLING] Manual refresh requested');
    return pollForUpdates();
  }, [pollForUpdates]);

  // Check Twilio directly for all calls
  const checkTwilioDirectly = fetchActiveCalls;

  return {
    updates,
    isPolling,
    error,
    lastTimestamp,
    refreshNow,
    checkTwilioDirectly,
    diagnosticInfo: {
      sessionId,
      updateCount: updates.length,
      lastPolled: new Date().toISOString(),
      pollCount,
      ...diagnosticInfo
    }
  };
}
