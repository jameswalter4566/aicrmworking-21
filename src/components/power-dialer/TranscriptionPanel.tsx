import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, AlertCircle, RefreshCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface TranscriptionPanelProps {
  leadId?: string | number;
  callSid?: string;
  isVisible?: boolean;
  transcriptions?: any[];
  onRefresh?: () => Promise<any>;
  isLoading?: boolean;
}

export const TranscriptionPanel = ({ 
  leadId, 
  callSid,
  isVisible = true,
  transcriptions: externalTranscriptions,
  onRefresh,
  isLoading: externalLoading
}: TranscriptionPanelProps) => {
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (externalTranscriptions) {
      console.log('[TranscriptionPanel] Received external transcriptions:', externalTranscriptions.length);
      setTranscriptions(externalTranscriptions);
    }
  }, [externalTranscriptions]);
  
  useEffect(() => {
    if (!leadId || externalTranscriptions) return;
    
    const fetchTranscriptions = async () => {
      try {
        setIsLoading(true);
        
        try {
          console.log(`[TranscriptionPanel] Fetching transcriptions via lead-connected function for lead ${leadId}`);
          const { data, error } = await supabase.functions.invoke('lead-connected', {
            body: { 
              leadId: String(leadId),
              fetchTranscriptions: true,
              callData: { callSid }
            }
          });
          
          if (!error && data?.transcriptions?.length > 0) {
            console.log(`[TranscriptionPanel] Received ${data.transcriptions.length} transcriptions from lead-connected function`);
            setTranscriptions(data.transcriptions);
            setError(null);
            return;
          }
        } catch (err) {
          console.warn('[TranscriptionPanel] Failed to fetch from lead-connected:', err);
        }
        
        let query = supabase
          .from('call_transcriptions')
          .select('*')
          .eq('lead_id', String(leadId)) // Convert leadId to string
          .order('timestamp', { ascending: true });
          
        if (callSid) {
          query = query.eq('call_sid', callSid);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('[TranscriptionPanel] Error fetching transcriptions:', error);
          setError('Failed to load transcriptions');
          return;
        }
        
        if (data) {
          console.log(`[TranscriptionPanel] Loaded ${data.length} initial transcriptions for lead ${leadId}`);
          setTranscriptions(data);
        }
      } catch (err) {
        console.error('[TranscriptionPanel] Exception fetching transcriptions:', err);
        setError('An error occurred while loading transcriptions');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTranscriptions();
  }, [leadId, callSid, externalTranscriptions]);
  
  useEffect(() => {
    if (!leadId) return;
    
    const channelName = `lead-transcription-${leadId}`;
    console.log(`[TranscriptionPanel] Setting up transcription listener on channel: ${channelName}`);
    
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'transcription_update' }, (payload) => {
        console.log('[TranscriptionPanel] Received transcription update:', payload);
        
        if (payload.payload?.transcription) {
          setTranscriptions(prev => {
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
        console.log(`[TranscriptionPanel] Subscription status:`, status);
        setIsSubscribed(status === 'SUBSCRIBED');
      });
      
    const leadDataChannel = supabase
      .channel(`lead-data-${leadId}`)
      .on('broadcast', { event: 'lead_data_update' }, (payload) => {
        if (payload.payload?.transcriptions?.length > 0) {
          console.log('[TranscriptionPanel] Received transcriptions via lead data channel:', payload.payload.transcriptions);
          setTranscriptions(prev => {
            const newTranscriptions = [...prev];
            
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
      .subscribe();
      
    const dbChannel = supabase
      .channel(`transcription-db-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_transcriptions',
          filter: `lead_id=eq.${leadId}`
        },
        (payload) => {
          console.log('[TranscriptionPanel] New transcription from DB:', payload.new);
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
      .subscribe();
      
    return () => {
      console.log('[TranscriptionPanel] Cleaning up subscriptions');
      supabase.removeChannel(channel);
      supabase.removeChannel(leadDataChannel);
      supabase.removeChannel(dbChannel);
    };
  }, [leadId]);
  
  useEffect(() => {
    if (!leadId || !callSid || !isVisible || externalTranscriptions) {
      if (pollingIntervalRef.current) {
        console.log('[TranscriptionPanel] Stopping polling');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsPolling(false);
      }
      return;
    }
    
    console.log('[TranscriptionPanel] Starting polling for transcriptions');
    
    const startPolling = () => {
      pollingIntervalRef.current = window.setInterval(async () => {
        try {
          console.log('[TranscriptionPanel] Polling for new transcriptions...');
          setIsPolling(true);
          
          const { data, error } = await supabase.functions.invoke('lead-connected', {
            body: { 
              leadId: String(leadId),
              fetchTranscriptions: true,
              callData: { callSid }
            }
          });
          
          if (error) {
            console.warn('[TranscriptionPanel] Polling error:', error);
            return;
          }
          
          if (data?.transcriptions?.length > 0) {
            console.log(`[TranscriptionPanel] Poll received ${data.transcriptions.length} transcriptions`);
            
            setTranscriptions(prev => {
              const newTranscriptions = [...prev];
              
              data.transcriptions.forEach((transcription: any) => {
                if (!newTranscriptions.some(t => t.id === transcription.id)) {
                  newTranscriptions.push(transcription);
                }
              });
              
              return newTranscriptions.sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
            });
          } else {
            console.log('[TranscriptionPanel] Poll found no new transcriptions');
          }
        } finally {
          setIsPolling(false);
        }
      }, 5000);
    };
    
    startPolling();
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [leadId, callSid, isVisible, externalTranscriptions]);
  
  useEffect(() => {
    if (scrollRef.current && transcriptions.length > 0 && isVisible) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions, isVisible]);
  
  const handleManualRefresh = async () => {
    if (!leadId || !isVisible) return;
    
    try {
      setIsLoading(true);
      
      if (onRefresh) {
        await onRefresh();
      } else {
        const { data, error } = await supabase.functions.invoke('lead-connected', {
          body: { 
            leadId: String(leadId),
            fetchTranscriptions: true,
            callData: { callSid }
          }
        });
        
        if (error) {
          console.error('[TranscriptionPanel] Refresh error:', error);
          return;
        }
        
        if (data?.transcriptions?.length > 0) {
          setTranscriptions(data.transcriptions);
        }
      }
    } catch (err) {
      console.error('[TranscriptionPanel] Error during manual refresh:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className={`mt-4 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-50'}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Call Transcription
          {isSubscribed && (
            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
              Live
            </Badge>
          )}
          {isPolling && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
              Polling
            </Badge>
          )}
        </CardTitle>
        
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleManualRefresh} 
          disabled={(isLoading || externalLoading)}
        >
          <RefreshCcw className={`h-4 w-4 mr-1 ${(isLoading || externalLoading) ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {!isVisible ? (
          <div className="text-center text-gray-500 py-4">
            Transcription panel hidden. Toggle switch to view.
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-500 p-4">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : (isLoading || externalLoading) ? (
          <div className="text-center text-gray-500 py-4">
            Loading transcriptions...
          </div>
        ) : transcriptions.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No transcription available yet
          </div>
        ) : (
          <ScrollArea className="h-[200px] pr-4" ref={scrollRef}>
            <div className="space-y-3">
              {transcriptions.map((transcript) => (
                <div key={transcript.id} className="p-2 rounded-lg bg-gray-50">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{transcript.speaker || 'Speaker'}</span>
                    <span>{new Date(transcript.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className={`text-sm ${!transcript.is_final ? 'italic text-gray-600' : ''}`}>
                    {transcript.segment_text}
                    {!transcript.is_final && (
                      <span className="text-xs ml-2 text-gray-400">(processing...)</span>
                    )}
                  </p>
                  {transcript.confidence && (
                    <div className="mt-1 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${transcript.confidence > 0.8 ? 'bg-green-500' : transcript.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${transcript.confidence * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
