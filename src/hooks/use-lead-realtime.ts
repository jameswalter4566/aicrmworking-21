
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLeadRealtime(leadId: string | number | null, userId?: string | null) {
  const [leadData, setLeadData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leadFound, setLeadFound] = useState(false);

  // Initial fetch to get lead data
  const fetchLeadData = async () => {
    if (!leadId) {
      console.log('[useLeadRealtime] No leadId provided, skipping fetch');
      return null;
    }
    
    setIsLoading(true);
    try {
      console.log(`[useLeadRealtime] Fetching data for lead ID: ${leadId}`);
      
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
        console.error('[useLeadRealtime] Error fetching lead data:', error);
        toast.error('Failed to fetch lead data');
        return null;
      }

      console.log('[useLeadRealtime] Response from lead-connected:', data);
      
      if (data?.lead) {
        console.log('[useLeadRealtime] Successfully retrieved lead data:', data.lead);
        setLeadData(data.lead);
        setLeadFound(true);
        toast.success('Lead data loaded successfully');
        
        // Reset the lead found indicator after 3 seconds
        setTimeout(() => setLeadFound(false), 3000);
        return data.lead;
      } else {
        console.warn('[useLeadRealtime] No lead data in response');
        toast.warning('No lead data found');
        return null;
      }
    } catch (err) {
      console.error('[useLeadRealtime] Error in lead realtime fetch:', err);
      toast.error('Error fetching lead data');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Setup realtime subscription
  useEffect(() => {
    if (!leadId) {
      console.log('[useLeadRealtime] No leadId provided, clearing data');
      setLeadData(null);
      setLeadFound(false);
      return;
    }

    console.log(`[useLeadRealtime] Setting up with leadId: ${leadId}, userId: ${userId || 'none'}`);

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
            console.log('[useLeadRealtime] Setting lead data from realtime update:', payload.new);
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
          const updatedLeadData = await fetchLeadData();
          if (updatedLeadData) {
            console.log('[useLeadRealtime] Updated lead data after activity:', updatedLeadData);
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`[useLeadRealtime] Cleaning up subscriptions for leadId: ${leadId}`);
      supabase.removeChannel(channel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [leadId, userId]);

  return { leadData, isLoading, leadFound, refresh: fetchLeadData };
}
