
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
      
      // Let's look at active calls in the Twilio state if no callSid provided
      if (!callSid || callSid === '') {
        console.log('HANGUP HOOK - No callSid provided, attempting to find active call in Twilio state');
        
        // Try to get the callSid from the browser's localStorage where Twilio might store it
        try {
          const localStorageKeys = Object.keys(localStorage);
          const twilioKey = localStorageKeys.find(key => key.startsWith('twilio-'));
          
          if (twilioKey) {
            console.log('HANGUP HOOK - Found potential Twilio data in localStorage:', twilioKey);
            // Attempt to parse and extract any call information
            try {
              const twilioData = JSON.parse(localStorage.getItem(twilioKey) || '{}');
              console.log('HANGUP HOOK - Parsed Twilio data:', twilioData);
              
              // Look for potential call SID in the data
              if (twilioData && twilioData.calls) {
                const callIds = Object.keys(twilioData.calls);
                if (callIds.length > 0) {
                  const firstCallId = callIds[0];
                  const firstCall = twilioData.calls[firstCallId];
                  if (firstCall && firstCall.parameters && firstCall.parameters.CallSid) {
                    callSid = firstCall.parameters.CallSid;
                    console.log('HANGUP HOOK - Found call SID in localStorage:', callSid);
                  }
                }
              }
            } catch (parseError) {
              console.error('HANGUP HOOK - Error parsing Twilio data from localStorage:', parseError);
            }
          }
        } catch (localStorageError) {
          console.error('HANGUP HOOK - Error accessing localStorage:', localStorageError);
        }
      }
      
      const payload = { 
        callSid: callSid || '',  // Send empty string if still undefined
        userId,
        timestamp: new Date().toISOString()
      };
      
      console.log('HANGUP HOOK - Sending hangup request to hangup-call function with payload:', payload);

      // First trying the direct fetch approach with better error handling
      let isDirectFetchSuccessful = false;
      try {
        const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/hangup-call', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Function is now public (verify_jwt = false) so no auth token needed
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
