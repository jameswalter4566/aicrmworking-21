
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLeadRealtime(leadId: string | number | null, userId?: string | null) {
  const [leadData, setLeadData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leadFound, setLeadFound] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [lastError, setLastError] = useState<string | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  const getChannelName = useCallback((id: string | number | null) => {
    return id ? `lead-data-${id}` : 'no-lead';
  }, []);

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
        
        // Check if the data is fallback data
        const isFallbackData = data.lead.id === 999999 || 
                              (data.lead.first_name === "FALLBACK" && 
                               data.lead.last_name === "DATA");
        
        if (isFallbackData) {
          console.warn('[useLeadRealtime] Received fallback data from server');
          setLastError('Received fallback data from server');
          
          // If the leadId is numeric, try using it directly for the channel subscription
          if (typeof leadId === 'number' || /^\d+$/.test(String(leadId))) {
            // Ensure we're subscribed to the direct leadId channel as well
            setupChannelSubscription(leadId);
          }
          
          // Don't set the fallback data unless it's our only option
          if (!leadData) {
            setLeadData(data.lead);
          }
          return null;
        }
        
        setLeadData(data.lead);
        setLeadFound(true);
        setLastUpdateTime(new Date());
        
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
  }, [leadId, userId, leadData]);

  const setupChannelSubscription = useCallback((id: string | number) => {
    const channelName = getChannelName(id);
    console.log(`[useLeadRealtime] Setting up broadcast listener on channel: ${channelName}`);
    
    // Clean up any existing subscription first
    try {
      const existing = supabase.getChannels().find(ch => ch.state === 'joined' && ch.topic === channelName);
      if (existing) {
        console.log(`[useLeadRealtime] Removing existing channel subscription: ${channelName}`);
        supabase.removeChannel(existing);
      }
    } catch (e) {
      console.error('[useLeadRealtime] Error removing existing channel:', e);
    }
    
    // Set up new subscription
    const dataChannel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'lead_data_update' }, (payload) => {
        console.log('[useLeadRealtime] Received broadcast data update:', payload);
        
        if (payload.payload?.lead) {
          // Check if the data is fallback data
          const leadInfo = payload.payload.lead;
          const isFallbackData = leadInfo.id === 999999 || 
                                (leadInfo.first_name === "FALLBACK" && 
                                 leadInfo.last_name === "DATA");
          
          if (isFallbackData) {
            console.warn('[useLeadRealtime] Received fallback data from broadcast');
            // Don't update with fallback data if we already have real data
            if (!leadData || leadData.id === 999999) {
              console.log('[useLeadRealtime] Setting fallback data (no better data available)');
              setLeadData(leadInfo);
            }
          } else {
            console.log('[useLeadRealtime] Setting lead data from broadcast:', leadInfo);
            setLeadData(leadInfo);
            setLeadFound(true);
            setLastUpdateTime(new Date());
            setTimeout(() => setLeadFound(false), 3000);
          }
        } else {
          console.warn('[useLeadRealtime] Broadcast received but no lead data in payload');
        }
      })
      .subscribe((status) => {
        console.log(`[useLeadRealtime] Subscription status for channel ${channelName}:`, status);
        setSubscriptionActive(status === 'SUBSCRIBED');
      });
      
    return dataChannel;
  }, [getChannelName, leadData]);

  useEffect(() => {
    if (!leadId) {
      console.log('[useLeadRealtime] No leadId provided, clearing data');
      setLeadData(null);
      setLeadFound(false);
      return;
    }

    console.log(`[useLeadRealtime] Setting up with leadId: ${leadId}, userId: ${userId || 'none'}`);

    // Initial data fetch
    fetchLeadData();
    
    // Set up broadcast channel for this specific lead ID
    const dataChannel = setupChannelSubscription(leadId);
    
    // Additional channel subscription for numeric ID if we have a UUID
    let secondaryChannel;
    if (typeof leadId === 'string' && leadId.includes('-')) {
      // This might be a UUID - check if there's an originalLeadId to subscribe to as well
      console.log('[useLeadRealtime] UUID detected, checking for numeric original lead ID');
      // We'll get the numeric ID from the data after the initial fetch
      // Or we could make an additional call to check if there's an originalLeadId...
    }

    // Set up database realtime subscription for lead changes
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
      .subscribe((status) => {
        console.log(`[useLeadRealtime] Lead table subscription status:`, status);
      });

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
      if (secondaryChannel) supabase.removeChannel(secondaryChannel);
      supabase.removeChannel(leadChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [leadId, userId, fetchLeadData, setupChannelSubscription, getChannelName]);

  const refresh = useCallback(async () => {
    setLastUpdateTime(new Date());
    return await fetchLeadData();
  }, [fetchLeadData]);

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
    broadcastData,
    subscriptionActive
  };
}
