
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLeadRealtime(leadId: string | number | null, userId?: string | null) {
  const [leadData, setLeadData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leadFound, setLeadFound] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Create a channel name that's consistent for this lead ID
  const getChannelName = (id: string | number | null) => {
    return id ? `lead-data-${id}` : 'no-lead';
  };

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
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID() // Add unique request ID for tracking
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
        setLastUpdateTime(new Date());
        
        // Broadcast retrieved data to the lead's channel for other components to use
        await broadcastLeadData(data.lead);
        
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

  // Broadcast lead data to the channel
  const broadcastLeadData = async (data: any) => {
    if (!leadId) return;
    
    try {
      // Send data to the channel for this lead
      await supabase.channel(getChannelName(leadId)).send({
        type: 'broadcast',
        event: 'lead_data_update',
        payload: {
          lead: data,
          timestamp: new Date().toISOString(),
          source: 'useLeadRealtime'
        }
      });
      console.log('[useLeadRealtime] Broadcast lead data to channel:', getChannelName(leadId));
    } catch (err) {
      console.error('[useLeadRealtime] Error broadcasting lead data:', err);
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
    
    // Setup channel subscription for lead data updates
    const dataChannel = supabase
      .channel(getChannelName(leadId))
      .on('broadcast', { event: 'lead_data_update' }, (payload) => {
        console.log('[useLeadRealtime] Received broadcast data update:', payload);
        
        if (payload.payload?.lead) {
          console.log('[useLeadRealtime] Setting lead data from broadcast:', payload.payload.lead);
          setLeadData(payload.payload.lead);
          setLeadFound(true);
          setLastUpdateTime(new Date());
          setTimeout(() => setLeadFound(false), 3000);
        }
      })
      .subscribe();
    
    // Setup realtime subscription to leads table changes
    const leadChannel = supabase
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
            setLastUpdateTime(new Date());
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
      supabase.removeChannel(dataChannel);
      supabase.removeChannel(leadChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [leadId, userId]);

  // Force refetch when explicitly told to by the user
  const refresh = async () => {
    setLastUpdateTime(new Date());
    return await fetchLeadData();
  };

  return { leadData, isLoading, leadFound, refresh, lastUpdateTime };
}
