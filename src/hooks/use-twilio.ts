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
  audioStreaming?: boolean;
}

export const useTwilio = () => {
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCalls, setActiveCalls] = useState<Record<string, ActiveCall>>({});
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [audioStreaming, setAudioStreaming] = useState(false);
  const [audioTested, setAudioTested] = useState(false);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentAudioDevice, setCurrentAudioDevice] = useState<string>('');
  const statusCheckIntervals = useRef<Record<string, number>>({});
  const audioCheckInterval = useRef<number | null>(null);

  const checkPermissions = useCallback(async () => {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permissionStatus.state !== 'granted') {
        toast({
          title: "Microphone Permission Required",
          description: "Please allow microphone access when prompted to make calls.",
          variant: "default",
        });
      }
    } catch (err) {
      console.log("Permission API not supported, skipping check");
    }
  }, []);

  useEffect(() => {
    const initializeTwilio = async () => {
      setIsLoading(true);
      try {
        console.log("Initializing Twilio service...");
        
        await checkPermissions();
        
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
        
        const devices = await twilioService.getAudioOutputDevices();
        setAudioOutputDevices(devices);
        
        const currentDevice = twilioService.getCurrentAudioDevice();
        setCurrentAudioDevice(currentDevice);
        
        const audioTest = await twilioService.testAudioOutput();
        setAudioTested(audioTest);
        
        if (!audioTest) {
          toast({
            title: "Audio Output Issue",
            description: "Unable to test your speakers. Please check your audio output settings.",
            variant: "default",
          });
        }

        console.log("Initializing Twilio device...");
        const deviceInitialized = await twilioService.initializeTwilioDevice();
        setInitialized(deviceInitialized);
        
        if (!deviceInitialized) {
          toast({
            title: "Phone System Warning",
            description: "Phone system initialized with limited features. Calls will still work but audio quality may be affected.",
            variant: "default",
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

    audioCheckInterval.current = window.setInterval(() => {
      const isActive = twilioService.isMicrophoneActive();
      setMicrophoneActive(isActive);
      
      const isStreaming = twilioService.isStreamingActive?.() || false;
      setAudioStreaming(isStreaming);
      
      if (Object.keys(activeCalls).length > 0) {
        setActiveCalls(prev => {
          const updated = {...prev};
          Object.keys(updated).forEach(leadId => {
            updated[leadId].audioStreaming = isStreaming;
            updated[leadId].audioActive = isActive;
          });
          return updated;
        });
      }
    }, 2000);

    return () => {
      if (audioCheckInterval.current) {
        clearInterval(audioCheckInterval.current);
      }
      
      Object.values(statusCheckIntervals.current).forEach(intervalId => {
        clearInterval(intervalId);
      });
      
      twilioService.cleanup();
    };
  }, [checkPermissions]);

  const monitorCallStatus = useCallback((leadId: string | number, callSid: string, usingBrowser: boolean = false) => {
    const leadIdStr = String(leadId);
    
    if (statusCheckIntervals.current[leadIdStr]) {
      clearInterval(statusCheckIntervals.current[leadIdStr]);
    }
    
    console.log(`Setting up call monitoring for ${usingBrowser ? 'browser' : 'REST API'} call: ${callSid}`);
    
    const intervalId = window.setInterval(async () => {
      try {
        if (usingBrowser) {
          const isAudioActive = twilioService.isMicrophoneActive();
          const isStreaming = twilioService.isStreamingActive?.() || false;
          
          setActiveCalls(prev => {
            if (!prev[leadIdStr]) return prev;
            
            return {
              ...prev,
              [leadIdStr]: {
                ...prev[leadIdStr],
                audioActive: isAudioActive,
                audioStreaming: isStreaming
              }
            };
          });
          
          if (!isAudioActive && activeCalls[leadIdStr]?.status === 'in-progress') {
            console.warn("Call is active but no audio detected - possible audio issues");
          }
          
          if (!isStreaming && activeCalls[leadIdStr]?.status === 'in-progress') {
            console.warn("Call is active but no audio streaming detected - possible streaming issues");
          }
        }
        
        const status = await twilioService.checkCallStatus(callSid);
        
        if (["completed", "busy", "no-answer", "failed", "canceled"].includes(status)) {
          clearInterval(statusCheckIntervals.current[leadIdStr]);
          delete statusCheckIntervals.current[leadIdStr];
          
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
          setActiveCalls(prev => ({
            ...prev,
            [leadIdStr]: {
              ...prev[leadIdStr],
              status: "in-progress"
            }
          }));
          
          toast({
            title: "Call Connected",
            description: `Call is now in progress. ${usingBrowser ? "Audio should be streaming through your browser." : ""}`,
          });
          
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
    }, 2000);
    
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
    
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permissionStatus.state !== 'granted') {
        toast({
          title: "Microphone Permission Required",
          description: "Please allow microphone access when prompted.",
          variant: "default", 
        });
      }
    } catch (err) {
      console.log("Permission API not supported, proceeding with call");
    }
    
    if (!twilioService.isMicrophoneActive()) {
      toast({
        title: "Microphone Check",
        description: "Checking microphone access before placing call...",
      });
      
      await twilioService.initializeAudioContext();
      
      if (!twilioService.isMicrophoneActive()) {
        toast({
          title: "Microphone Inactive",
          description: "Your microphone appears to be unavailable. Check your browser permissions.",
          variant: "destructive",
        });
        
        toast({
          title: "Enable Microphone",
          description: "Click the camera/microphone icon in your browser's address bar and allow access.",
          variant: "default",
          duration: 10000,
        });
        
        return { success: false, error: "Microphone access required" };
      }
    }

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
          audioActive: microphoneActive,
          audioStreaming: audioStreaming
        }
      }));
      
      toast({
        title: "Dialing",
        description: `Calling ${phoneNumber}... Audio will stream through your browser when connected.`,
      });
      
      monitorCallStatus(leadId, result.callSid, result.usingBrowser);
    } else {
      toast({
        title: "Call Failed",
        description: result.error || "Could not connect call.",
        variant: "destructive", 
      });
    }

    return result;
  }, [initialized, monitorCallStatus, microphoneActive, audioStreaming]);

  const endCall = useCallback(async (leadId: string | number) => {
    const leadIdStr = String(leadId);
    
    if (activeCalls[leadIdStr]) {
      if (statusCheckIntervals.current[leadIdStr]) {
        clearInterval(statusCheckIntervals.current[leadIdStr]);
        delete statusCheckIntervals.current[leadIdStr];
      }
      
      await twilioService.endCall();
      
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
    Object.values(statusCheckIntervals.current).forEach(intervalId => {
      clearInterval(intervalId);
    });
    statusCheckIntervals.current = {};
    
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

  const setAudioOutputDevice = useCallback(async (deviceId: string) => {
    const success = await twilioService.setAudioOutputDevice(deviceId);
    
    if (success) {
      setCurrentAudioDevice(deviceId);
      
      await twilioService.testAudioOutput(deviceId);
      
      toast({
        title: "Audio Device Changed",
        description: "Audio output device has been updated.",
      });
    } else {
      toast({
        title: "Audio Device Error",
        description: "Could not change the audio output device. This browser might not support this feature.",
        variant: "destructive",
      });
    }
    
    return success;
  }, []);

  const refreshAudioDevices = useCallback(async () => {
    try {
      const devices = await twilioService.getAudioOutputDevices();
      setAudioOutputDevices(devices);
      return devices;
    } catch (err) {
      console.error("Error refreshing audio devices:", err);
      return [];
    }
  }, []);

  return {
    initialized,
    isLoading,
    activeCalls,
    microphoneActive,
    audioStreaming,
    audioTested,
    audioOutputDevices,
    currentAudioDevice,
    makeCall,
    endCall,
    endAllCalls,
    toggleMute,
    toggleSpeaker,
    setAudioOutputDevice,
    refreshAudioDevices,
    testAudio: twilioService.testAudioOutput
  };
};
