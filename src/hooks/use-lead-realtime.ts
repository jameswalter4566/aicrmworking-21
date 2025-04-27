
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useLeadRealtime(leadId: string | null, userId?: string | null) {
  const [leadData, setLeadData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initial fetch to get lead data
  const fetchLeadData = async () => {
    if (!leadId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lead-connected', {
        body: { 
          leadId,
          userId, // Include userId to track which user the data belongs to
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
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'leads',
          filter: `id=eq.${leadId}`
        },
        (payload) => {
          console.log('[useLeadRealtime] Realtime update received:', payload);
          if (payload.new) {
            setLeadData(payload.new);
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
          // Refresh lead data when new activity is recorded
          await fetchLeadData();
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [leadId, userId]);

  return { leadData, isLoading, refresh: fetchLeadData };
}
