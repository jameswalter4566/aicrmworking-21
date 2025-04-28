
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

export function useHangupCall() {
  const [isHangingUp, setIsHangingUp] = useState(false);
  const { user } = useAuth();

  const hangupCall = async (callSid: string) => {
    if (!callSid) {
      toast.error('No call identified');
      return false;
    }

    setIsHangingUp(true);
    console.log(`Attempting to hang up call with SID: ${callSid}`);

    try {
      console.log('Sending hangup request to hangup-call function with payload:', {
        callSid,
        userId: user?.id
      });

      const { data, error } = await supabase.functions.invoke('hangup-call', {
        body: { 
          callSid,
          userId: user?.id
        }
      });

      console.log('Received response from hangup-call function:', { data, error });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to end call');
      }

      toast.success('Call ended successfully');
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to end call';
      console.error('Error hanging up call:', error);
      toast.error(error);
      return false;
    } finally {
      setIsHangingUp(false);
    }
  };

  return {
    hangupCall,
    isHangingUp
  };
}
