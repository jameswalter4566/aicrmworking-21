import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLeadRealtime(leadId: string | number | null, userId?: string | null) {
  const [leadData, setLeadData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leadFound, setLeadFound] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [lastError, setLastError] = useState<string | null>(null);
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const [isTranscriptionLoading, setIsTranscriptionLoading] = useState(false);

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
        setLeadData(data.lead);
        
        // Set transcriptions if they were returned
        if (data.transcriptions && Array.isArray(data.transcriptions)) {
          console.log('[useLeadRealtime] Setting initial transcriptions:', data.transcriptions.length);
          setTranscriptions(data.transcriptions);
        }
        
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
  }, [leadId, userId]);

  const fetchTranscriptions = useCallback(async (callSid?: string) => {
    if (!leadId) {
      console.log('[useLeadRealtime] No leadId provided, skipping transcription fetch');
      return [];
    }
    
    setIsTranscriptionLoading(true);
    
    try {
      console.log(`[useLeadRealtime] Explicitly fetching transcriptions for lead ID: ${leadId}, callSid: ${callSid || 'none'}`);
      
      const { data, error } = await supabase.functions.invoke('lead-connected', {
        body: { 
          leadId: String(leadId),
          userId,
          fetchTranscriptions: true,
          callData: {
            callSid,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('[useLeadRealtime] Error fetching transcriptions:', error);
        return [];
      }

      console.log('[useLeadRealtime] Response from transcription fetch:', data);
      
      if (data?.transcriptions) {
        console.log('[useLeadRealtime] Setting fetched transcriptions:', data.transcriptions.length);
        setTranscriptions(data.transcriptions);
        return data.transcriptions;
      }
      
      return [];
    } catch (err) {
      console.error('[useLeadRealtime] Error in transcription fetch:', err);
      return [];
    } finally {
      setIsTranscriptionLoading(false);
    }
  }, [leadId, userId]);

  useEffect(() => {
    if (!leadId) {
      console.log('[useLeadRealtime] No leadId provided, clearing data');
      setLeadData(null);
      setLeadFound(false);
      setTranscriptions([]);
      return;
    }

    console.log(`[useLeadRealtime] Setting up with leadId: ${leadId}, userId: ${userId || 'none'}`);

    fetchLeadData();
    
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
        }
        
        // Also process any transcriptions in the broadcast
        if (payload.payload?.transcriptions && Array.isArray(payload.payload.transcriptions)) {
          console.log('[useLeadRealtime] Received transcriptions via broadcast:', payload.payload.transcriptions.length);
          setTranscriptions(prev => {
            const newTranscriptions = [...prev];
            
            // Add any new transcriptions not already in the list
            payload.payload.transcriptions.forEach((transcription: any) => {
              if (!newTranscriptions.some(t => t.id === transcription.id)) {
                newTranscriptions.push(transcription);
              }
            });
            
            return newTranscriptions.sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
        }
      })
      .subscribe((status) => {
        console.log(`[useLeadRealtime] Subscription status for channel ${channelName}:`, status);
      });
    
    // Set up transcription-specific channel for real-time updates
    const transcriptionChannel = supabase
      .channel(`lead-transcription-${leadId}`)
      .on('broadcast', { event: 'transcription_update' }, (payload) => {
        if (payload.payload?.transcription) {
          console.log('[useLeadRealtime] Received transcription update:', payload.payload.transcription);
          setTranscriptions(prev => {
            // Check if we already have this transcription to avoid duplicates
            const exists = prev.some(t => t.id === payload.payload.transcription.id);
            if (!exists) {
              return [...prev, payload.payload.transcription].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
            }
            return prev;
          });
        }
      })
      .subscribe((status) => {
        console.log(`[useLeadRealtime] Transcription channel subscription status:`, status);
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

    // Listen for database changes to transcriptions table
    const transcriptionsDbChannel = supabase
      .channel(`lead-transcriptions-db-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_transcriptions',
          filter: `lead_id=eq.${leadId}`
        },
        (payload) => {
          console.log('[useLeadRealtime] New transcription from DB:', payload.new);
          if (payload.new) {
            setTranscriptions(prev => {
              const exists = prev.some(t => t.id === payload.new.id);
              if (!exists) {
                return [...prev, payload.new].sort(
                  (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
              }
              return prev;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`[useLeadRealtime] Transcriptions DB subscription status:`, status);
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
      
    // Set up polling for transcriptions if we have an active call
    let transcriptionPollingInterval: number | null = null;
    
    if (leadData?.activeCall?.callSid) {
      console.log(`[useLeadRealtime] Setting up transcription polling for callSid: ${leadData.activeCall.callSid}`);
      
      // Poll every 5 seconds
      transcriptionPollingInterval = window.setInterval(() => {
        fetchTranscriptions(leadData.activeCall.callSid);
      }, 5000);
    }

    return () => {
      console.log(`[useLeadRealtime] Cleaning up subscriptions for leadId: ${leadId}`);
      supabase.removeChannel(dataChannel);
      supabase.removeChannel(leadChannel);
      supabase.removeChannel(activitiesChannel);
      supabase.removeChannel(transcriptionChannel);
      supabase.removeChannel(transcriptionsDbChannel);
      
      if (transcriptionPollingInterval !== null) {
        clearInterval(transcriptionPollingInterval);
      }
    };
  }, [leadId, userId, fetchLeadData, getChannelName, fetchTranscriptions, leadData?.activeCall?.callSid]);

  const refresh = useCallback(async () => {
    setLastUpdateTime(new Date());
    return await fetchLeadData();
  }, [fetchLeadData]);

  const refreshTranscriptions = useCallback(async (callSid?: string) => {
    return await fetchTranscriptions(callSid);
  }, [fetchTranscriptions]);

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
    transcriptions,
    isTranscriptionLoading,
    refreshTranscriptions
  };
}
