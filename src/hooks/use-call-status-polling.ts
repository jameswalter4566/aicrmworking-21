
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

  // Enhanced fetch for active calls directly from Twilio API
  const fetchActiveCalls = useCallback(async () => {
    if (!sessionId || !enabled) return;
    
    try {
      console.log(`[POLLING] Fetching active calls for session: ${sessionId}`);
      
      // Get active calls for this session
      const { data: activeCalls, error: activeCallsError } = await supabase
        .from('predictive_dialer_calls')
        .select('twilio_call_sid, status')
        .eq('session_id', sessionId)
        .not('twilio_call_sid', 'is', null);
        
      if (activeCallsError) {
        console.error(`[POLLING] Error fetching active calls: ${activeCallsError.message}`);
        return;
      }
      
      console.log(`[POLLING] Found ${activeCalls?.length || 0} calls to check with Twilio API`);
      
      if (activeCalls && activeCalls.length > 0) {
        for (const call of activeCalls) {
          if (call.twilio_call_sid) {
            try {
              console.log(`[POLLING] Fetching Twilio status for call ${call.twilio_call_sid}`);
              
              const { data: twilioData, error: twilioError } = await supabase.functions.invoke('twilio-call-status', {
                body: { 
                  callSid: call.twilio_call_sid, 
                  sessionId,
                  forceRefresh: true
                }
              });
              
              if (twilioError) {
                console.error(`[POLLING] Twilio status fetch error for ${call.twilio_call_sid}:`, twilioError);
              } else if (twilioData?.data) {
                console.log(`[POLLING] Received Twilio data for ${call.twilio_call_sid}:`, twilioData.data);
                
                const newUpdate = {
                  callSid: call.twilio_call_sid,
                  status: twilioData.data.status,
                  timestamp: Date.now(),
                  duration: twilioData.data.duration,
                  answeredBy: twilioData.data.answeredBy,
                  // Add other relevant fields from Twilio response
                };
                
                setUpdates(prev => [...prev, newUpdate]);
                
                if (onUpdate) {
                  onUpdate([newUpdate]);
                }
              }
            } catch (err) {
              console.error(`[POLLING] Error fetching Twilio data for ${call.twilio_call_sid}:`, err);
            }
          }
        }
      } else {
        console.log('[POLLING] No calls found to fetch from Twilio API');
      }
    } catch (err) {
      console.error('[POLLING] Comprehensive error checking active calls:', err);
    }
  }, [sessionId, enabled, onUpdate]);

  // Set up aggressive polling
  useEffect(() => {
    if (!enabled || !sessionId) return;
    
    console.log(`[POLLING] Setting up aggressive call status polling for session ${sessionId}`);
    
    // Initial fetch
    fetchActiveCalls();
    
    // Set up polling intervals
    const pollInterval = setInterval(fetchActiveCalls, interval);
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [sessionId, enabled, interval, fetchActiveCalls]);

  return {
    updates,
    isPolling: true, // Always true since we're constantly polling
    error,
    lastTimestamp,
    refreshNow: fetchActiveCalls,
    checkTwilioDirectly: fetchActiveCalls,
    diagnosticInfo: {
      sessionId,
      updateCount: updates.length,
      lastPolled: new Date().toISOString()
    }
  };
}
