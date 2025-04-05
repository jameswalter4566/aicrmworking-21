
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
  audioActive?: boolean;
}

export const useTwilio = () => {
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCalls, setActiveCalls] = useState<Record<string, ActiveCall>>({});
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [audioTested, setAudioTested] = useState(false);
  const statusCheckIntervals = useRef<Record<string, number>>({});
  const audioCheckInterval = useRef<number | null>(null);

  // Initialize Twilio on component mount
  useEffect(() => {
    const initializeTwilio = async () => {
      setIsLoading(true);
      try {
        console.log("Initializing Twilio service...");
        // First, try to initialize the audio context
        const micAccess = await twilioService.initializeAudioContext();
        if (!micAccess) {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use the dialer. Check your browser settings and try again.",
            variant: "destructive",
          });
          return;
        }
        
        setMicrophoneActive(true);
        
        // Test audio output to ensure speakers are working
        const audioTest = await twilioService.testAudioOutput();
        setAudioTested(audioTest);
        
        if (!audioTest) {
          toast({
            title: "Audio Output Issue",
            description: "Unable to test your speakers. Please check your audio output settings.",
            variant: "default",
          });
        }

        // Then, initialize the Twilio device
        console.log("Initializing Twilio device...");
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

    // Set up audio monitoring interval
    audioCheckInterval.current = window.setInterval(() => {
      const isActive = twilioService.isMicrophoneActive();
      setMicrophoneActive(isActive);
    }, 3000);

    return () => {
      // Cleanup all intervals
      if (audioCheckInterval.current) {
        clearInterval(audioCheckInterval.current);
      }
      
      Object.values(statusCheckIntervals.current).forEach(intervalId => {
        clearInterval(intervalId);
      });
      
      twilioService.cleanup();
    };
  }, []);

  // Function to start monitoring call status with enhanced audio detection
  const monitorCallStatus = useCallback((leadId: string | number, callSid: string, usingBrowser: boolean = false) => {
    const leadIdStr = String(leadId);
    
    // Clear any existing interval for this lead
    if (statusCheckIntervals.current[leadIdStr]) {
      clearInterval(statusCheckIntervals.current[leadIdStr]);
    }
    
    // For browser-based calls, we use connection events but still poll for status
    console.log(`Setting up call monitoring for ${usingBrowser ? 'browser' : 'REST API'} call: ${callSid}`);
    
    // Set up a new interval to check call status
    const intervalId = window.setInterval(async () => {
      try {
        // Check for active audio for browser-based calls
        if (usingBrowser) {
          const isAudioActive = twilioService.isMicrophoneActive();
          
          // Update audio active status
          setActiveCalls(prev => {
            if (!prev[leadIdStr]) return prev;
            
            return {
              ...prev,
              [leadIdStr]: {
                ...prev[leadIdStr],
                audioActive: isAudioActive
              }
            };
          });
          
          // If we're using browser audio but there's been no audio for a while, warn the user
          if (!isAudioActive && activeCalls[leadIdStr]?.status === 'in-progress') {
            console.warn("Call is active but no audio detected - possible audio issues");
          }
        }
        
        // Always check status from the server to ensure consistency
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
            description: `Call is now in progress. You should hear audio${usingBrowser ? " through your browser" : ""}.`,
          });
          
          // For browser calls, remind about audio permissions if needed
          if (usingBrowser && !microphoneActive) {
            toast({
              title: "Audio Check",
              description: "Your microphone appears to be inactive. Check browser permissions.",
              variant: "default",
            });
          }
        }
      } catch (error) {
        console.error(`Error monitoring call ${callSid}:`, error);
      }
    }, 2000); // Check more frequently for better user experience
    
    statusCheckIntervals.current[leadIdStr] = intervalId;
  }, [activeCalls, microphoneActive]);

  const makeCall = useCallback(async (phoneNumber: string, leadId: string | number) => {
    if (!initialized) {
      toast({
        title: "Error",
        description: "Phone system not initialized. Please refresh and try again.",
        variant: "destructive",
      });
      return { success: false };
    }
    
    // Re-check microphone just before making call
    if (!twilioService.isMicrophoneActive()) {
      toast({
        title: "Microphone Check",
        description: "Checking microphone access before placing call...",
      });
      
      // Try to reinitialize audio
      await twilioService.initializeAudioContext();
      
      // Check again after initialization attempt
      if (!twilioService.isMicrophoneActive()) {
        toast({
          title: "Microphone Inactive",
          description: "Your microphone appears to be unavailable. Call will proceed but audio may not work.",
          variant: "default",
        });
      }
    }

    // Make the actual call
    console.log(`Placing call to ${phoneNumber}`);
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
          usingBrowser: result.usingBrowser,
          audioActive: microphoneActive
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
    audioTested,
    makeCall,
    endCall,
    endAllCalls,
    toggleMute,
    toggleSpeaker,
    testAudio: twilioService.testAudioOutput
  };
};
