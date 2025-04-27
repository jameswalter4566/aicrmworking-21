import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLeadRealtime(leadId: string | number | null, userId?: string | null) {
  const [leadData, setLeadData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leadFound, setLeadFound] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [lastError, setLastError] = useState<string | null>(null);

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
            requestId: crypto.randomUUID()
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
        
        setTimeout(() => setLeadFound(false), 3000);
        return data.lead;
      } else {
        console.warn('[useLeadRealtime] No lead data in response');
        setLastError('No lead data found in response');
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[useLeadRealtime] Error in lead realtime fetch:', err);
      setLastError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [leadId, userId]);

  useEffect(() => {
    if (!leadId) {
      console.log('[useLeadRealtime] No leadId provided, clearing data');
      setLeadData(null);
      setLeadFound(false);
      return;
    }

    console.log(`[useLeadRealtime] Setting up with leadId: ${leadId}, userId: ${userId || 'none'}`);

    fetchLeadData();
    
    const channelName = getChannelName(leadId);
    console.log(`[useLeadRealtime] Setting up broadcast listener on channel: ${channelName}`);

    const broadcastChannel = supabase
      .channel(channelName)
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
      .subscribe((status) => {
        console.log(`[useLeadRealtime] Broadcast subscription status for channel ${channelName}:`, status);
      });

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
          console.log('[useLeadRealtime] Database update received:', payload);
          if (payload.new) {
            fetchLeadData();
          }
        }
      )
      .subscribe((status) => {
        console.log(`[useLeadRealtime] Database subscription status:`, status);
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
        async () => {
          await fetchLeadData();
        }
      )
      .subscribe((status) => {
        console.log(`[useLeadRealtime] Activities subscription status:`, status);
      });

    return () => {
      console.log(`[useLeadRealtime] Cleaning up subscriptions for leadId: ${leadId}`);
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(leadChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [leadId, userId, fetchLeadData, getChannelName]);

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
    broadcastData
  };
}
