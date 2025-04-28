
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCallDisposition() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endCall = async (callSid: string, leadId?: string | number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('lead-connected', {
        body: {
          action: 'endCall',
          callSid,
          leadId,
          callData: {
            status: 'completed',
            timestamp: new Date().toISOString(),
            callState: 'disconnected'
          }
        }
      });

      if (error) throw error;

      toast.success('Call ended successfully');
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      console.error('[useCallDisposition] Error ending call:', err);
      toast.error('Failed to end call. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const setDisposition = async (leadId: string | number, disposition: string, callSid?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // First update the disposition
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          disposition,
          last_contacted: new Date().toISOString()
        })
        .eq('id', typeof leadId === 'string' ? parseInt(leadId) : leadId);

      if (updateError) throw updateError;

      // Log the activity
      await supabase.from('lead_activities').insert({
        lead_id: typeof leadId === 'string' ? parseInt(leadId) : leadId,
        type: 'disposition',
        description: disposition
      });

      // If callSid provided, end the call
      if (callSid) {
        await endCall(callSid, leadId);
      }

      toast.success(`Lead marked as ${disposition}`);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      console.error('[useCallDisposition] Error setting disposition:', err);
      toast.error('Failed to update disposition');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    endCall,
    setDisposition,
    isLoading,
    error
  };
}
