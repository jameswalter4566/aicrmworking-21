
// This hook has been replaced by use-lead-realtime.ts
// It's kept here for reference but should be removed once the realtime implementation is confirmed working

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// DEPRECATED: Use useLeadRealtime instead
export function useLeadPolling(leadId: string | null) {
  console.warn('useLeadPolling is deprecated, please use useLeadRealtime instead');
  
  const [leadData, setLeadData] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setLeadData(null);
      return;
    }

    setIsPolling(true);
    
    // Poll every 100ms
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('lead-connected', {
          body: { 
            leadId,
            callData: {
              status: 'polling',
              timestamp: new Date().toISOString()
            }
          }
        });

        if (error) {
          console.error('Error polling lead data:', error);
          return;
        }

        if (data?.lead) {
          console.log('[useLeadPolling] Received lead data:', data.lead);
          setLeadData(data.lead);
        }
      } catch (err) {
        console.error('Error in lead polling:', err);
      }
    }, 100); // Poll every 100ms

    return () => {
      setIsPolling(false);
      clearInterval(interval);
    };
  }, [leadId]);

  return { leadData, isPolling };
}
