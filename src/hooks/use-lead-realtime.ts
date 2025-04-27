import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useLeadRealtime(leadId: string | number | null, userId?: string | null) {
  const [leadData, setLeadData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leadFound, setLeadFound] = useState(false);

  // Initial fetch to get lead data
  const fetchLeadData = async () => {
    if (!leadId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lead-connected', {
        body: { 
          leadId: String(leadId),
          userId,
          callData: {
            status: 'initial_fetch',
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('Error fetching lead data:', error);
        return;
      }

      if (data?.lead) {
        console.log('[useLeadRealtime] Received lead data:', data.lead);
        setLeadData(data.lead);
        setLeadFound(true);
        setTimeout(() => setLeadFound(false), 3000);
      }
    } catch (err) {
      console.error('Error in lead realtime fetch:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Setup realtime subscription
  useEffect(() => {
    if (!leadId) {
      setLeadData(null);
      setLeadFound(false);
      return;
    }

    // Initial fetch
    fetchLeadData();
    
    // Setup realtime subscription to leads table changes
    const channel = supabase
      .channel(`lead-updates-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `id=eq.${leadId}`
        },
        (payload) => {
          console.log('[useLeadRealtime] Realtime update received:', payload);
          if (payload.new) {
            setLeadData(payload.new);
            setLeadFound(true);
            setTimeout(() => setLeadFound(false), 3000);
          }
        }
      )
      .subscribe();

    // Also subscribe to lead_activities for this lead
    const activitiesChannel = supabase
      .channel(`lead-activities-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_activities',
          filter: `lead_id=eq.${leadId}`
        },
        async (payload) => {
          console.log('[useLeadRealtime] New lead activity:', payload);
          await fetchLeadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [leadId, userId]);

  return { leadData, isLoading, leadFound, refresh: fetchLeadData };
}
