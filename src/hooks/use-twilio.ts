
import { useState, useEffect, useCallback, useRef } from 'react';
import { twilioService } from '@/services/twilio';
import { toast } from '@/components/ui/use-toast';

export interface ActiveCall {
  callSid: string;
  phoneNumber: string;
  status: 'connecting' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  leadId: string | number;
  isMuted?: boolean;
  speakerOn?: boolean;
  usingBrowser?: boolean;
}

export const useTwilio = () => {
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCalls, setActiveCalls] = useState<Record<string, ActiveCall>>({});
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const statusCheckIntervals = useRef<Record<string, number>>({});

  // Initialize Twilio on component mount
  useEffect(() => {
    const initializeTwilio = async () => {
      setIsLoading(true);
      try {
        // First, try to initialize the audio context
        const micAccess = await twilioService.initializeAudioContext();
        if (!micAccess) {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use the dialer.",
            variant: "destructive",
          });
          return;
        }
        
        setMicrophoneActive(true);

        // Then, initialize the Twilio device
        const deviceInitialized = await twilioService.initializeTwilioDevice();
        setInitialized(deviceInitialized);
        
        if (!deviceInitialized) {
          toast({
            title: "Error",
            description: "Failed to initialize phone system. Please check the console for details.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Phone system initialized successfully. Audio inputs and outputs are ready.",
          });
        }
      } catch (error) {
        console.error('Error initializing Twilio:', error);
        toast({
          title: "Error",
          description: "Failed to set up phone system. Please check console for details.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeTwilio();

    return () => {
      // Cleanup all status check intervals
      Object.values(statusCheckIntervals.current).forEach(intervalId => {
        clearInterval(intervalId);
      });
      
      twilioService.cleanup();
    };
  }, []);

  // Periodically check if microphone is active
  useEffect(() => {
    const checkMicInterval = setInterval(() => {
      setMicrophoneActive(twilioService.isMicrophoneActive());
    }, 5000);
    
    return () => clearInterval(checkMicInterval);
  }, []);

  // Function to start monitoring call status
  const monitorCallStatus = useCallback((leadId: string | number, callSid: string, usingBrowser: boolean = false) => {
    const leadIdStr = String(leadId);
    
    // Clear any existing interval for this lead
    if (statusCheckIntervals.current[leadIdStr]) {
      clearInterval(statusCheckIntervals.current[leadIdStr]);
    }
    
    // For browser-based calls, we'll get events directly from the device
    if (usingBrowser) {
      console.log("Using browser events for call monitoring");
      return;
    }
    
    // Set up a new interval to check call status every 3 seconds
    const intervalId = window.setInterval(async () => {
      try {
        const status = await twilioService.checkCallStatus(callSid);
        
        if (["completed", "busy", "no-answer", "failed", "canceled"].includes(status)) {
          // Call has ended, clear the interval
          clearInterval(statusCheckIntervals.current[leadIdStr]);
          delete statusCheckIntervals.current[leadIdStr];
          
          // Update the call status
          setActiveCalls(prev => {
            if (!prev[leadIdStr]) return prev;
            
            return {
              ...prev,
              [leadIdStr]: {
                ...prev[leadIdStr],
                status: status as ActiveCall['status']
              }
            };
          });
          
          // Show toast based on the status
          switch(status) {
            case "completed":
              toast({
                title: "Call Completed",
                description: `Call has ended normally.`,
              });
              break;
            case "busy":
              toast({
                title: "Line Busy",
                description: `The phone line was busy.`,
                variant: "destructive",
              });
              break;
            case "no-answer":
              toast({
                title: "No Answer",
                description: `The call was not answered.`,
                variant: "destructive",
              });
              break;
            default:
              toast({
                title: "Call Failed",
                description: `Call ended with status: ${status}`,
                variant: "destructive",
              });
          }
        } else if (status === "in-progress" && activeCalls[leadIdStr]?.status !== "in-progress") {
          // Update to in-progress if it wasn't already
          setActiveCalls(prev => ({
            ...prev,
            [leadIdStr]: {
              ...prev[leadIdStr],
              status: "in-progress"
            }
          }));
          
          toast({
            title: "Call Connected",
            description: `Call is now in progress. You should hear audio.`,
          });
        }
      } catch (error) {
        console.error(`Error monitoring call ${callSid}:`, error);
      }
    }, 3000);
    
    statusCheckIntervals.current[leadIdStr] = intervalId;
  }, [activeCalls]);

  const makeCall = useCallback(async (phoneNumber: string, leadId: string | number) => {
    if (!initialized) {
      toast({
        title: "Error",
        description: "Phone system not initialized. Please refresh and try again.",
        variant: "destructive",
      });
      return { success: false };
    }
    
    if (!microphoneActive) {
      toast({
        title: "Microphone Inactive",
        description: "Your microphone appears to be unavailable. Please check permissions.",
        variant: "destructive",
      });
      
      // Try to reinitialize audio
      await twilioService.initializeAudioContext();
      
      if (!twilioService.isMicrophoneActive()) {
        return { success: false, error: "Microphone unavailable" };
      }
    }

    const result = await twilioService.makeCall(phoneNumber);
    
    if (result.success && result.callSid) {
      const leadIdStr = String(leadId);
      
      setActiveCalls(prev => ({
        ...prev,
        [leadIdStr]: { 
          callSid: result.callSid!,
          phoneNumber,
          status: 'connecting',
          leadId,
          isMuted: false,
          speakerOn: false,
          usingBrowser: result.usingBrowser
        }
      }));
      
      toast({
        title: "Dialing",
        description: `Calling ${phoneNumber}...${result.usingBrowser ? ' (using browser audio)' : ''}`,
      });
      
      // Start monitoring the call status
      monitorCallStatus(leadId, result.callSid, result.usingBrowser);
    } else {
      toast({
        title: "Call Failed",
        description: result.error || "Could not connect call.",
        variant: "destructive", 
      });
    }

    return result;
  }, [initialized, monitorCallStatus, microphoneActive]);

  const endCall = useCallback(async (leadId: string | number) => {
    const leadIdStr = String(leadId);
    
    if (activeCalls[leadIdStr]) {
      // Stop monitoring this call
      if (statusCheckIntervals.current[leadIdStr]) {
        clearInterval(statusCheckIntervals.current[leadIdStr]);
        delete statusCheckIntervals.current[leadIdStr];
      }
      
      // End the call
      await twilioService.endCall();
      
      // Remove from active calls
      setActiveCalls(prev => {
        const newCalls = {...prev};
        delete newCalls[leadIdStr];
        return newCalls;
      });
      
      toast({
        title: "Call Ended",
        description: `Call has been disconnected.`,
      });
      
      return true;
    }
    
    return false;
  }, [activeCalls]);

  const endAllCalls = useCallback(async () => {
    // Stop all monitoring
    Object.values(statusCheckIntervals.current).forEach(intervalId => {
      clearInterval(intervalId);
    });
    statusCheckIntervals.current = {};
    
    // End all calls
    await twilioService.endCall();
    setActiveCalls({});
    
    toast({
      title: "All Calls Ended",
      description: `All active calls have been disconnected.`,
    });
  }, []);
  
  const toggleMute = useCallback((leadId: string | number, mute?: boolean) => {
    const leadIdStr = String(leadId);
    
    if (!activeCalls[leadIdStr]) {
      return false;
    }
    
    // If mute is not provided, toggle the current state
    const shouldMute = mute !== undefined ? mute : !activeCalls[leadIdStr].isMuted;
    
    const success = twilioService.toggleMute(shouldMute);
    
    if (success) {
      setActiveCalls(prev => ({
        ...prev,
        [leadIdStr]: {
          ...prev[leadIdStr],
          isMuted: shouldMute
        }
      }));
      
      toast({
        title: shouldMute ? "Muted" : "Unmuted",
        description: shouldMute ? "Your microphone is now muted." : "Your microphone is now unmuted.",
      });
    }
    
    return success;
  }, [activeCalls]);
  
  const toggleSpeaker = useCallback((leadId: string | number, speakerOn?: boolean) => {
    const leadIdStr = String(leadId);
    
    if (!activeCalls[leadIdStr]) {
      return false;
    }
    
    // If speakerOn is not provided, toggle the current state
    const shouldUseSpeaker = speakerOn !== undefined ? speakerOn : !activeCalls[leadIdStr].speakerOn;
    
    const success = twilioService.toggleSpeaker(shouldUseSpeaker);
    
    if (success) {
      setActiveCalls(prev => ({
        ...prev,
        [leadIdStr]: {
          ...prev[leadIdStr],
          speakerOn: shouldUseSpeaker
        }
      }));
      
      toast({
        title: shouldUseSpeaker ? "Speaker On" : "Speaker Off",
        description: shouldUseSpeaker ? "Audio output set to speaker." : "Audio output set to earpiece.",
      });
    }
    
    return success;
  }, [activeCalls]);

  return {
    initialized,
    isLoading,
    activeCalls,
    microphoneActive,
    makeCall,
    endCall,
    endAllCalls,
    toggleMute,
    toggleSpeaker,
  };
};
