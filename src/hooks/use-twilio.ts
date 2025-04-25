import { useState, useEffect, useCallback, useRef } from 'react';
import { twilioService } from '@/services/twilio';
import { toast } from '@/components/ui/use-toast';

export interface ActiveCall {
  callSid: string;
  phoneNumber: string;
  status: 'connecting' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  leadId: string | number;
  isMuted?: boolean;
  speakerOn?: boolean;
  usingBrowser?: boolean;
  audioActive?: boolean;
  audioStreaming?: boolean;
  conferenceName?: string; // Added to track conference calls
}

interface AudioChunk {
  track: string;
  timestamp: number;
  payload: string;
  conferenceName?: string; // Added to support conference calls
}

// Type for the hook return value to ensure TypeScript knows what we're returning
export interface UseTwilioReturn {
  initialized: boolean;
  isLoading: boolean;
  activeCalls: Record<string, ActiveCall>;
  microphoneActive: boolean;
  audioStreaming: boolean;
  audioTested: boolean;
  audioOutputDevices: MediaDeviceInfo[];
  currentAudioDevice: string;
  makeCall: (phoneNumber: string, leadId: string | number) => Promise<any>;
  endCall: (leadId: string | number) => Promise<boolean>;
  endAllCalls: () => Promise<boolean>;
  toggleMute: (leadId: string | number, mute?: boolean) => boolean;
  toggleSpeaker: (leadId: string | number, speakerOn?: boolean) => boolean;
  setAudioOutputDevice: (deviceId: string) => Promise<boolean>;
  refreshAudioDevices: () => Promise<MediaDeviceInfo[]>;
  testAudio: (deviceId: string) => Promise<boolean>;
  joinConference?: (conferenceName: string) => boolean;
}

export const useTwilio = (): UseTwilioReturn => {
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

  const webSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const activeStreamSidRef = useRef<string | null>(null);
  const activeConferenceNameRef = useRef<string | null>(null);

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

  const setupWebSocket = useCallback(() => {
    if (webSocketRef.current) {
      console.log("WebSocket already set up, not creating a new one");
      return;
    }
    
    console.log("Setting up WebSocket for bidirectional media streaming");
    
    try {
      const socket = new WebSocket('wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream');
      webSocketRef.current = socket;
      
      socket.onopen = () => {
        console.log("WebSocket connection opened for bidirectional media");
        socket.send(JSON.stringify({
          event: 'browser_connect',
          timestamp: Date.now()
        }));
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Only log non-audio events to avoid console spam
          if (data.event !== 'audio') {
            console.log("WebSocket received message type:", data.event);
          }
          
          if (data.event === 'streamStart') {
            activeStreamSidRef.current = data.streamSid;
            activeConferenceNameRef.current = data.conferenceName;
            setAudioStreaming(true);
            console.log(`Stream started with SID: ${data.streamSid}, Call SID: ${data.callSid}, Conference: ${data.conferenceName || 'N/A'}`);
            
            startCapturingMicrophone();
            
            toast({
              title: "Audio Stream Active",
              description: "Bidirectional audio stream established. Audio should now be flowing in both directions.",
            });

            if (currentAudioDevice) {
              setTimeout(() => {
                twilioService.setAudioOutputDevice(currentAudioDevice);
              }, 500);
            }
            
            // If this is part of an active call, update the call with conference info
            if (data.conferenceName) {
              setActiveCalls(prev => {
                const updated = {...prev};
                Object.keys(updated).forEach(leadId => {
                  updated[leadId].conferenceName = data.conferenceName;
                });
                return updated;
              });
            }
          }
          else if (data.event === 'streamStop') {
            activeStreamSidRef.current = null;
            activeConferenceNameRef.current = null;
            setAudioStreaming(false);
            console.log("Stream stopped");
            
            stopCapturingMicrophone();
          }
          else if (data.event === 'audio') {
            // Audio data received - handle silently
            if (data.conferenceName && !activeConferenceNameRef.current) {
              activeConferenceNameRef.current = data.conferenceName;
            }
          }
          else if (data.event === 'connected_ack' || data.event === 'connection_established') {
            console.log("WebSocket connection acknowledged by server");
          }
          else if (data.event === 'mark') {
            console.log("Mark event received:", data.name);
          }
          else if (data.event === 'dtmf') {
            console.log("DTMF received:", data.digit);
          }
          else if (data.event === 'conference_joined') {
            console.log("Joined conference:", data.conferenceName);
            activeConferenceNameRef.current = data.conferenceName;
            
            toast({
              title: "Conference Joined",
              description: `Successfully joined conference: ${data.conferenceName}`,
            });
          }
        } catch (err) {
          console.error("Error processing WebSocket message:", err);
        }
      };
      
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setAudioStreaming(false);
      };
      
      socket.onclose = () => {
        console.log("WebSocket connection closed");
        webSocketRef.current = null;
        setAudioStreaming(false);
        activeStreamSidRef.current = null;
        activeConferenceNameRef.current = null;
        
        stopCapturingMicrophone();
        
        // Attempt to reconnect after a short delay
        setTimeout(() => {
          if (Object.keys(activeCalls).length > 0) {
            console.log("Active calls exist, attempting to reconnect WebSocket...");
            setupWebSocket();
          }
        }, 1000);
      };
    } catch (err) {
      console.error("Failed to set up WebSocket:", err);
    }
  }, [currentAudioDevice]);

  const joinConference = useCallback((conferenceName: string) => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected, cannot join conference");
      return false;
    }
    
    try {
      webSocketRef.current.send(JSON.stringify({
        event: 'conference_join',
        conferenceName: conferenceName,
        timestamp: Date.now()
      }));
      
      activeConferenceNameRef.current = conferenceName;
      console.log(`Requested to join conference: ${conferenceName}`);
      
      // Start capturing microphone audio for the conference
      startCapturingMicrophone();
      
      return true;
    } catch (err) {
      console.error("Error joining conference:", err);
      return false;
    }
  }, []);

  const startCapturingMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia not supported in this browser");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        } 
      });
      
      console.log("Microphone access granted for bidirectional streaming");
      microphoneStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      audioProcessorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN && 
            (activeStreamSidRef.current || activeConferenceNameRef.current)) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          
          if (rms > 0.005) {  // Only send audio when there's sound above this threshold
            const buffer = new ArrayBuffer(inputData.length * 2);
            const view = new DataView(buffer);
            
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
            
            const base64Audio = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
            
            webSocketRef.current.send(JSON.stringify({
              event: 'browser_audio',
              streamSid: activeStreamSidRef.current,
              conferenceName: activeConferenceNameRef.current,
              payload: base64Audio
            }));
          }
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      console.log("Microphone audio capture started for bidirectional streaming");
      setMicrophoneActive(true);
      
    } catch (err) {
      console.error("Error accessing microphone for bidirectional streaming:", err);
      setMicrophoneActive(false);
      
      toast({
        title: "Microphone Error",
        description: "Could not access your microphone. Please check your browser permissions.",
        variant: "destructive",
      });
    }
  }, []);

  const stopCapturingMicrophone = useCallback(() => {
    if (audioProcessorRef.current && audioContextRef.current) {
      try {
        audioProcessorRef.current.disconnect();
        audioProcessorRef.current = null;
      } catch (err) {
        console.warn("Error disconnecting audio processor:", err);
      }
    }
    
    if (microphoneStreamRef.current) {
      try {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
        microphoneStreamRef.current = null;
      } catch (err) {
        console.warn("Error stopping microphone tracks:", err);
      }
    }
    
    console.log("Microphone audio capture stopped");
  }, []);

  const endCall = useCallback(async (leadId: string | number) => {
    const leadIdStr = String(leadId);
    
    if (activeCalls[leadIdStr]) {
      if (statusCheckIntervals.current[leadIdStr]) {
        clearInterval(statusCheckIntervals.current[leadIdStr]);
        delete statusCheckIntervals.current[leadIdStr];
      }
      
      await twilioService.endCall(leadIdStr);
      
      if (Object.keys(activeCalls).length <= 1) {
        stopCapturingMicrophone();
        activeStreamSidRef.current = null;
        activeConferenceNameRef.current = null;
      }
      
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
  }, [activeCalls, stopCapturingMicrophone]);

  const endAllCalls = useCallback(async () => {
    Object.values(statusCheckIntervals.current).forEach(intervalId => {
      clearInterval(intervalId);
    });
    statusCheckIntervals.current = {};
    
    await twilioService.hangupAllCalls();
    
    stopCapturingMicrophone();
    activeStreamSidRef.current = null;
    activeConferenceNameRef.current = null;
    
    setActiveCalls({});
    
    toast({
      title: "All Calls Ended",
      description: `All active calls have been disconnected.`,
    });
    
    return true;
  }, [stopCapturingMicrophone]);

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
        
        const audioTest = await twilioService.testAudioOutput(currentDevice);
        setAudioTested(audioTest);
        
        if (!audioTest) {
          toast({
            title: "Audio Output Issue",
            description: "Unable to test your speakers. Please check your audio output settings.",
            variant: "default",
          });
        } else {
          console.log("Audio test successful");
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
        
        setupWebSocket();
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
      
      const isStreaming = webSocketRef.current?.readyState === WebSocket.OPEN && 
                         (activeStreamSidRef.current !== null || activeConferenceNameRef.current !== null);
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
      
      if (webSocketRef.current) {
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
      
      stopCapturingMicrophone();
      
      twilioService.cleanup();
    };
  }, [checkPermissions, setupWebSocket, stopCapturingMicrophone]);

  const monitorCallStatus = useCallback((leadId: string | number, callSid: string, usingBrowser: boolean = true, conferenceName?: string) => {
    const leadIdStr = String(leadId);
    
    if (statusCheckIntervals.current[leadIdStr]) {
      clearInterval(statusCheckIntervals.current[leadIdStr]);
    }
    
    console.log(`Setting up call monitoring for ${usingBrowser ? 'browser' : 'REST API'} call: ${callSid}`);
    
    if (conferenceName) {
      activeConferenceNameRef.current = conferenceName;
    }
    
    const intervalId = window.setInterval(async () => {
      try {
        if (usingBrowser) {
          const isAudioActive = twilioService.isMicrophoneActive();
          const isStreaming = webSocketRef.current?.readyState === WebSocket.OPEN && 
                             (activeStreamSidRef.current !== null || activeConferenceNameRef.current !== null);
          
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
        
        const status = await twilioService.checkCallStatus(String(leadId));
        
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
          
          if (Object.keys(activeCalls).length <= 1) {
            stopCapturingMicrophone();
            activeStreamSidRef.current = null;
            activeConferenceNameRef.current = null;
          }
          
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
            description: `Call is now in progress. Audio should be streaming through your browser.`,
          });
          
          if (!microphoneActive) {
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
  }, [activeCalls, microphoneActive, stopCapturingMicrophone]);

  const makeCall = useCallback(async (phoneNumber: string, leadId: string | number) => {
    if (!initialized) {
      toast({
        title: "Error",
        description: "Phone system not initialized. Please refresh and try again.",
        variant: "destructive",
      });
      return { success: false };
    }
    
    if (Object.keys(activeCalls).length > 0) {
      console.log("Ending existing calls before making a new call");
      await endAllCalls();
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
    
    let formattedPhoneNumber = phoneNumber;
    if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
      formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
    }
    
    setupWebSocket();
    
    const result = await twilioService.makeCall(formattedPhoneNumber, String(leadId));
    
    if (result.success && (result.callSid || result.browserCallSid)) {
      const leadIdStr = String(leadId);
      
      const isConferenceCall = result.conferenceName && result.phoneCallSid && result.browserCallSid;
      const callSidToUse = result.callSid || result.browserCallSid || 'browser-call';
      
      setActiveCalls(prev => ({
        ...prev,
        [leadIdStr]: { 
          callSid: callSidToUse,
          phoneNumber: formattedPhoneNumber,
          status: 'connecting',
          leadId,
          isMuted: false,
          speakerOn: false,
          usingBrowser: true,
          audioActive: microphoneActive,
          audioStreaming: audioStreaming,
          conferenceName: result.conferenceName
        }
      }));
      
      toast({
        title: "Dialing",
        description: `Calling ${formattedPhoneNumber}... Audio will stream through your browser when connected.`,
      });
      
      if (isConferenceCall && result.conferenceName) {
        joinConference(result.conferenceName);
      }
      
      monitorCallStatus(leadId, callSidToUse, true, result.conferenceName);
    } else {
      toast({
        title: "Call Failed",
        description: result.error || "Could not connect call.",
        variant: "destructive", 
      });
    }

    return { success: true };
  }, [initialized, monitorCallStatus, microphoneActive, audioStreaming, setupWebSocket, joinConference, endAllCalls]);

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
    console.log(`Setting audio output device to: ${deviceId}`);
    
    const success = await twilioService.setAudioOutputDevice(deviceId);
    
    if (success) {
      setCurrentAudioDevice(deviceId);
      
      await twilioService.testAudioOutput(deviceId);
      
      toast({
        title: "Audio Device Changed",
        description: "Audio output device has been updated. You should hear audio through your selected device.",
      });
      
      try {
        localStorage.setItem('preferredAudioDevice', deviceId);
      } catch (err) {
        console.warn('Could not save audio device preference:', err);
      }
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
      console.log("Refreshing audio devices list");
      
      const devices = await twilioService.getAudioOutputDevices();
      setAudioOutputDevices(devices);
      
      const currentDeviceStillAvailable = devices.some(device => device.deviceId === currentAudioDevice);
      
      if (!currentDeviceStillAvailable && devices.length > 0) {
        const defaultDevice = devices.find(d => d.deviceId === 'default') || devices[0];
        await setAudioOutputDevice(defaultDevice.deviceId);
      }
      
      return devices;
    } catch (err) {
      console.error("Error refreshing audio devices:", err);
      toast({
        title: "Device Error",
        description: "Failed to refresh audio devices list.",
        variant: "destructive",
      });
      return [];
    }
  }, [currentAudioDevice, setAudioOutputDevice]);

  const testAudio = useCallback(async (deviceId: string): Promise<boolean> => {
    try {
      const result = await twilioService.testAudioOutput(deviceId);
      return result;
    } catch (err) {
      console.error("Audio test failed:", err);
      return false;
    }
  }, []);

  useEffect(() => {
    try {
      const savedDevice = localStorage.getItem('preferredAudioDevice');
      if (savedDevice && savedDevice !== currentAudioDevice) {
        console.log(`Found saved audio device preference: ${savedDevice}`);
        if (audioOutputDevices.length > 0) {
          const deviceExists = audioOutputDevices.some(device => device.deviceId === savedDevice);
          if (deviceExists) {
            setAudioOutputDevice(savedDevice);
          }
        }
      }
    } catch (err) {
      console.warn('Could not load audio device preference:', err);
    }
  }, [audioOutputDevices, currentAudioDevice, setAudioOutputDevice]);

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
    joinConference,
    testAudio
  };
};
