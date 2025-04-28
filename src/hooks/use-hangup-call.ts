
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

export function useHangupCall() {
  const [isHangingUp, setIsHangingUp] = useState(false);
  const { user } = useAuth();

  const hangupCall = async (callSid?: string) => {
    setIsHangingUp(true);
    console.log(`HANGUP HOOK - Attempting to hang up call with SID: ${callSid || 'UNKNOWN'}`, { callSid });
    
    try {
      const userId = user?.id || 'anonymous';
      
      // Look for active calls in Twilio state if no callSid provided
      if (!callSid || callSid === '') {
        console.log('HANGUP HOOK - No callSid provided, attempting to find active call in localStorage');
        
        try {
          const localStorageKeys = Object.keys(localStorage);
          const twilioKey = localStorageKeys.find(key => key.startsWith('twilio-'));
          
          if (twilioKey) {
            const twilioData = JSON.parse(localStorage.getItem(twilioKey) || '{}');
            console.log('HANGUP HOOK - Found Twilio data:', twilioData);
            
            if (twilioData?.calls) {
              const callIds = Object.keys(twilioData.calls);
              if (callIds.length > 0) {
                const firstCallId = callIds[0];
                const firstCall = twilioData.calls[firstCallId];
                if (firstCall?.parameters?.CallSid) {
                  callSid = firstCall.parameters.CallSid;
                  console.log('HANGUP HOOK - Found call SID:', callSid);
                }
              }
            }
          }
        } catch (localStorageError) {
          console.error('HANGUP HOOK - Error accessing localStorage:', localStorageError);
        }
      }
      
      const payload = { 
        callSid: callSid || '',
        userId,
        timestamp: new Date().toISOString(),
        attemptType: 'direct-hangup'
      };
      
      console.log('HANGUP HOOK - Sending hangup request with payload:', payload);

      // First try direct fetch with better error handling
      let isDirectFetchSuccessful = false;
      try {
        const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/hangup-call', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
        }
      } catch (directFetchError) {
        console.error('HANGUP HOOK - Direct fetch error:', directFetchError);
      }
      
      // Only try invoke method if direct fetch failed
      if (!isDirectFetchSuccessful) {
        console.log('HANGUP HOOK - Direct fetch failed, trying supabase.functions.invoke');
        const { data, error } = await supabase.functions.invoke('hangup-call', {
          body: payload
        });

        if (error) throw error;

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to end call');
        }

        toast.success('Call ended via invoke');
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
