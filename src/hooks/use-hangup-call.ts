
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
    console.log(`HANGUP HOOK - Attempting to hang up call with SID: ${callSid}`, { callSid });

    try {
      const userId = user?.id || 'anonymous';
      
      const payload = { 
        callSid,
        userId
      };
      
      console.log('HANGUP HOOK - Sending hangup request to hangup-call function with payload:', payload);

      // Direct fetch to the edge function for better debugging
      const url = 'https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/hangup-call';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.session()?.access_token || ''}`
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.text();
      console.log('HANGUP HOOK - Direct fetch response status:', response.status);
      console.log('HANGUP HOOK - Direct fetch response:', result);
      
      // Also try the supabase.functions.invoke method as backup
      console.log('HANGUP HOOK - Also trying supabase.functions.invoke as backup');
      const { data, error } = await supabase.functions.invoke('hangup-call', {
        body: payload
      });

      console.log('HANGUP HOOK - Received response from hangup-call function via invoke:', { data, error });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to end call');
      }

      toast.success('Call ended successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end call';
      console.error('HANGUP HOOK - Error hanging up call:', errorMessage);
      toast.error(errorMessage);
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
