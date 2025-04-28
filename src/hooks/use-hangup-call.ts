
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

export function useHangupCall() {
  const [isHangingUp, setIsHangingUp] = useState(false);
  const { user } = useAuth();

  const hangupCall = async (callSid?: string) => {
    // Set hangup state immediately to show UI feedback
    setIsHangingUp(true);
    console.log(`HANGUP HOOK - Attempting to hang up call with SID: ${callSid || 'UNKNOWN'}`, { callSid });
    
    try {
      const userId = user?.id || 'anonymous';
      
      const payload = { 
        callSid: callSid || '',  // Send empty string if undefined
        userId
      };
      
      console.log('HANGUP HOOK - Sending hangup request to hangup-call function with payload:', payload);

      // Get current auth token using getSession()
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token || '';
      
      console.log('HANGUP HOOK - Direct fetch URL: https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/hangup-call');
      
      // First trying the direct fetch approach with better error handling
      let isDirectFetchSuccessful = false;
      try {
        const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/hangup-call', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Don't use auth token since the function is now public (verify_jwt = false)
          },
          body: JSON.stringify(payload)
        });
        
        console.log('HANGUP HOOK - Direct fetch response status:', response.status);
        
        if (response.ok) {
          const result = await response.text();
          console.log('HANGUP HOOK - Direct fetch response:', result);
          isDirectFetchSuccessful = true;
          
          toast.success('Call ended successfully');
          return true;
        } else {
          const errorText = await response.text();
          console.error(`HANGUP HOOK - Direct fetch failed with status ${response.status}:`, errorText);
          // Continue to fallback method
        }
      } catch (directFetchError) {
        console.error('HANGUP HOOK - Direct fetch error:', directFetchError);
        // Continue to fallback method
      }
      
      // Only try the invoke method if direct fetch failed
      if (!isDirectFetchSuccessful) {
        console.log('HANGUP HOOK - Direct fetch failed, trying supabase.functions.invoke as fallback');
        const { data, error } = await supabase.functions.invoke('hangup-call', {
          body: payload
        });

        console.log('HANGUP HOOK - Received response from hangup-call function via invoke:', { data, error });

        if (error) {
          throw error;
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to end call');
        }

        toast.success('Call ended successfully via invoke');
        return true;
      }
      
      return isDirectFetchSuccessful;
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
