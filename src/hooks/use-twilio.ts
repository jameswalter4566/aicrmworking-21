
import { useState, useEffect } from 'react';
import { twilioService } from '@/services/twilio';
import { toast } from '@/components/ui/use-toast';

export const useTwilio = () => {
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCalls, setActiveCalls] = useState<Record<string, any>>({});

  useEffect(() => {
    const initializeTwilio = async () => {
      setIsLoading(true);
      try {
        const micAccess = await twilioService.initializeAudioContext();
        if (!micAccess) {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use the dialer.",
            variant: "destructive",
          });
          return;
        }

        const deviceInitialized = await twilioService.initializeTwilioDevice();
        setInitialized(deviceInitialized);
        
        if (!deviceInitialized) {
          toast({
            title: "Error",
            description: "Failed to initialize phone system.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error initializing Twilio:', error);
        toast({
          title: "Error",
          description: "Failed to set up phone system.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeTwilio();

    return () => {
      twilioService.cleanup();
    };
  }, []);

  const makeCall = async (phoneNumber: string, leadId: string | number) => {
    if (!initialized) {
      toast({
        title: "Error",
        description: "Phone system not initialized.",
        variant: "destructive",
      });
      return { success: false };
    }

    const result = await twilioService.makeCall(phoneNumber);
    
    if (result.success && result.callSid) {
      setActiveCalls(prev => ({
        ...prev,
        [String(leadId)]: { 
          callSid: result.callSid,
          phoneNumber,
          status: 'in-progress' 
        }
      }));
    }

    return result;
  };

  const endCall = async (leadId: string | number) => {
    const leadIdStr = String(leadId);
    if (activeCalls[leadIdStr]) {
      await twilioService.endCall();
      setActiveCalls(prev => {
        const newCalls = {...prev};
        delete newCalls[leadIdStr];
        return newCalls;
      });
      return true;
    }
    return false;
  };

  const endAllCalls = async () => {
    await twilioService.endCall();
    setActiveCalls({});
  };

  return {
    initialized,
    isLoading,
    activeCalls,
    makeCall,
    endCall,
    endAllCalls
  };
};
