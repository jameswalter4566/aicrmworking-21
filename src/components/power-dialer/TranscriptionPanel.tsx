
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';

interface TranscriptionPanelProps {
  leadId?: string | number;
  callSid?: string;
  isVisible?: boolean;
}

export const TranscriptionPanel = ({ leadId, callSid, isVisible = true }: TranscriptionPanelProps) => {
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Fetch initial transcriptions
  useEffect(() => {
    if (!leadId) return;
    
    const fetchTranscriptions = async () => {
      try {
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
          console.error('Error fetching transcriptions:', error);
          setError('Failed to load transcriptions');
          return;
        }
        
        if (data) {
          setTranscriptions(data);
        }
      } catch (err) {
        console.error('Exception fetching transcriptions:', err);
        setError('An error occurred while loading transcriptions');
      }
    };
    
    fetchTranscriptions();
  }, [leadId, callSid]);
  
  // Subscribe to real-time updates regardless of visibility
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
        console.log(`[TranscriptionPanel] Subscription status:`, status);
        setIsSubscribed(status === 'SUBSCRIBED');
      });
      
    // Also subscribe to lead-data channel for potential transcription updates there
    const leadDataChannel = supabase
      .channel(`lead-data-${leadId}`)
      .on('broadcast', { event: 'lead_data_update' }, (payload) => {
        if (payload.payload?.transcriptions?.length > 0) {
          console.log('[TranscriptionPanel] Received transcriptions via lead data channel:', payload.payload.transcriptions);
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
      .subscribe();
      
    return () => {
      console.log('[TranscriptionPanel] Cleaning up subscriptions');
      supabase.removeChannel(channel);
      supabase.removeChannel(leadDataChannel);
    };
  }, [leadId]);
  
  // Auto-scroll to bottom when new transcriptions come in
  useEffect(() => {
    if (scrollRef.current && transcriptions.length > 0 && isVisible) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions, isVisible]);
  
  // Always render the container, but conditionally render its content based on isVisible
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
        </CardTitle>
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
