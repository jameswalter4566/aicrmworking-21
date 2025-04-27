
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLeadRealtime(leadId: string | number | null, userId?: string | null) {
  const [leadData, setLeadData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leadFound, setLeadFound] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [lastError, setLastError] = useState<string | null>(null);

  // Create a channel name that's consistent for this lead ID
  const getChannelName = useCallback((id: string | number | null) => {
    return id ? `lead-data-${id}` : 'no-lead';
  }, []);

  // Initial fetch to get lead data
  const fetchLeadData = useCallback(async () => {
    if (!leadId) {
      console.log('[useLeadRealtime] No leadId provided, skipping fetch');
      return null;
    }
    
    setIsLoading(true);
    setLastError(null);
    
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
        setLastError(error.message);
        toast.error('Failed to fetch lead data');
        return null;
      }

      console.log('[useLeadRealtime] Response from lead-connected:', data);
      
      if (data?.lead) {
        console.log('[useLeadRealtime] Successfully retrieved lead data:', data.lead);
        setLeadData(data.lead);
        setLeadFound(true);
        setLastUpdateTime(new Date());
        
        // Reset the lead found indicator after 3 seconds
        setTimeout(() => setLeadFound(false), 3000);
        return data.lead;
      } else {
        console.warn('[useLeadRealtime] No lead data in response');
        setLastError('No lead data found in response');
        toast.warning('No lead data found');
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[useLeadRealtime] Error in lead realtime fetch:', err);
      setLastError(errorMsg);
      toast.error('Error fetching lead data');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [leadId, userId]);

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
    const channelName = getChannelName(leadId);
    console.log(`[useLeadRealtime] Setting up broadcast listener on channel: ${channelName}`);

    const dataChannel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'lead_data_update' }, (payload) => {
        console.log('[useLeadRealtime] Received broadcast data update:', payload);
        
        if (payload.payload?.lead) {
          console.log('[useLeadRealtime] Setting lead data from broadcast:', payload.payload.lead);
          setLeadData(payload.payload.lead);
          setLeadFound(true);
          setLastUpdateTime(new Date());
          setTimeout(() => setLeadFound(false), 3000);
        } else {
          console.warn('[useLeadRealtime] Broadcast received but no lead data in payload');
        }
      })
      .subscribe((status) => {
        console.log(`[useLeadRealtime] Subscription status for channel ${channelName}:`, status);
      });
    
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
            setTimeout(() => setLocalLeadFound(false), 3000);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[useLeadRealtime] Lead table subscription status:`, status);
      });

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
      .subscribe((status) => {
        console.log(`[useLeadRealtime] Activities subscription status:`, status);
      });

    return () => {
      console.log(`[useLeadRealtime] Cleaning up subscriptions for leadId: ${leadId}`);
      supabase.removeChannel(dataChannel);
      supabase.removeChannel(leadChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [leadId, userId, fetchLeadData, getChannelName]);

  // Force refetch when explicitly told to by the user
  const refresh = useCallback(async () => {
    setLastUpdateTime(new Date());
    return await fetchLeadData();
  }, [fetchLeadData]);

  // Manually send a broadcast to the channel - useful for debugging
  const broadcastData = useCallback(async (data: any) => {
    if (!leadId) return;
    
    try {
      const channelName = getChannelName(leadId);
      console.log(`[useLeadRealtime] Manually broadcasting to channel: ${channelName}`, data);
      
      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'lead_data_update',
        payload: {
          lead: data,
          timestamp: new Date().toISOString(),
          source: 'manual_broadcast'
        }
      });
      
      console.log('[useLeadRealtime] Manual broadcast sent');
    } catch (err) {
      console.error('[useLeadRealtime] Error sending manual broadcast:', err);
    }
  }, [leadId, getChannelName]);

  return { 
    leadData, 
    isLoading, 
    leadFound, 
    refresh, 
    lastUpdateTime, 
    lastError,
    broadcastData // Exposing broadcast function for debugging
  };
}
