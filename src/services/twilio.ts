import { toast } from "@/components/ui/use-toast";

export interface TwilioCallResult {
  success: boolean;
  callSid?: string;
  browserCallSid?: string;
  phoneCallSid?: string;
  conferenceName?: string;
  message?: string;
  error?: string;
  leadId?: string | number;
}

interface TwilioService {
  initializeTwilioDevice: () => Promise<boolean>;
  initializeAudioContext: () => Promise<boolean>;
  isMicrophoneActive: () => boolean;
  getAudioOutputDevices: () => Promise<MediaDeviceInfo[]>;
  getCurrentAudioDevice: () => string;
  setAudioOutputDevice: (deviceId: string) => Promise<boolean>;
  testAudioOutput: (deviceId?: string) => Promise<boolean>;
  makeCall: (phoneNumber: string, leadId: string) => Promise<TwilioCallResult>;
  endCall: (leadId?: string) => Promise<boolean>;
  checkCallStatus: (leadId: string) => Promise<string>;
  toggleMute: (mute: boolean) => boolean;
  toggleSpeaker: (speakerOn: boolean) => boolean;
  cleanup: () => void;
}

const createTwilioService = (): TwilioService => {
  let device: any = null; // Using any to avoid TypeScript errors
  let audioContext: AudioContext | null = null;
  let preferredAudioDevice: string | null = null;

  const initializeAudioContext = async (): Promise<boolean> => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error("Error initializing audio context or accessing microphone:", error);
      return false;
    }
  };

  const isMicrophoneActive = (): boolean => {
    if (!audioContext) return false;
    return audioContext.state === 'running';
  };

  const initializeTwilioDevice = async (): Promise<boolean> => {
    try {
      // Using Supabase Edge Function URL directly instead of relative path
      // This avoids getting HTML error pages when the relative path is misinterpreted
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch Twilio token: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.error("Response body:", text.substring(0, 500) + (text.length > 500 ? '...' : ''));
        return false;
      }

      const data = await response.json();

      if (!data.token) {
        console.error("Failed to retrieve Twilio token:", data.error);
        return false;
      }

      if (window.Twilio && window.Twilio.Device) {
        // Store Device instance without type checking
        device = new window.Twilio.Device(data.token, {
          // Set Opus as our preferred codec. Opus generally performs better, even
          // at low bitrates, than other codecs.
          codecPreferences: ["opus", "pcmu"],
          // Max call signaling timeout for reconnection
          maxCallSignalingTimeoutMs: 30000,
          // Add logs for debugging
          logLevel: 'debug'
        });

        device.on("error", (error: any) => {
          console.error("Twilio Device Error:", error);
          toast({
            title: "Twilio Device Error",
            description: `An error occurred with the phone system: ${error.message || error}`,
            variant: "destructive",
          });
        });

        device.on("disconnect", (call: any) => {
          console.log(`Call disconnected: ${call.sid || 'unknown'}`);
        });

        device.on("incoming", (call: any) => {
          console.log(`Incoming call from: ${call.from || 'unknown'}`);
          call.reject();
        });

        try {
          await device.register();
          console.log("Twilio device registered successfully.");
          return true;
        } catch (registerError) {
          console.error("Error registering Twilio device:", registerError);
          return false;
        }
      } else {
        console.error("Twilio.Device is not supported in this browser.");
        return false;
      }
    } catch (error) {
      console.error("Error initializing Twilio device:", error);
      return false;
    }
  };

  const getAudioOutputDevices = async (): Promise<MediaDeviceInfo[]> => {
    try {
      await initializeAudioContext();
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audiooutput');
    } catch (error) {
      console.error("Error getting audio output devices:", error);
      return [];
    }
  };

  const getCurrentAudioDevice = (): string => {
    return preferredAudioDevice || 'default';
  };

  const setAudioOutputDevice = async (deviceId: string): Promise<boolean> => {
    try {
      if (device && device.audio) { // Check for device.audio existence
        await device.audio.speakerDevices.set(deviceId);
        preferredAudioDevice = deviceId;
        console.log(`Set audio output device to: ${deviceId}`);
        return true;
      } else {
        console.warn("Twilio device not initialized or audio not available.");
        return false;
      }
    } catch (error) {
      console.error("Error setting audio output device:", error);
      return false;
    }
  };

  const testAudioOutput = async (deviceId?: string): Promise<boolean> => {
    try {
      if (!device || !device.audio) { // Check for device and device.audio
        console.warn("Twilio device not initialized or audio not available, cannot test audio.");
        return false;
      }

      const testDevice = deviceId || preferredAudioDevice || 'default';
      console.log(`Testing audio output device: ${testDevice}`);

      await device.audio.speakerDevices.test(
        'https://twimlets.com/echo.mp3'
      );
      return true;
    } catch (error) {
      console.error("Error testing audio output:", error);
      return false;
    }
  };

  const makeCall = async (phoneNumber: string, leadId: string): Promise<TwilioCallResult> => {
    try {
      if (!device) {
        console.error("Twilio device not initialized.");
        return { success: false, error: "Twilio device not initialized." };
      }

      // First try using the Twilio JS SDK directly for browser client call
      try {
        console.log(`Attempting to call ${phoneNumber} via browser client`);
        const call = await device.connect({
          params: {
            phoneNumber: phoneNumber,
            leadId: leadId
          }
        });

        console.log(`Browser client call connected with SID: ${call.sid || 'unknown'}`);
        return { 
          success: true, 
          callSid: call.sid,
          leadId: leadId
        };
      } catch (deviceError) {
        console.warn("Browser-based call initiation failed. Error:", deviceError);
        console.log("Falling back to server-side call initiation...");
        
        // If browser-based call fails, try making a call through the edge function
        const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'makeCall',
            phoneNumber: phoneNumber,
            leadId: leadId,
            browserClientName: 'browser-client'
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server response error:", response.status, errorText);
          throw new Error(`Server returned ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          console.log("Server-side call initiated successfully:", result);
          return {
            success: true,
            callSid: result.callSid || result.phoneCallSid,
            browserCallSid: result.browserCallSid,
            phoneCallSid: result.phoneCallSid,
            conferenceName: result.conferenceName,
            leadId: leadId
          };
        } else {
          throw new Error(result.error || "Failed to make server-side call");
        }
      }
    } catch (error: any) {
      console.error("Error making call:", error);
      return { success: false, error: error.message || "Failed to make call" };
    }
  };

  const endCall = async (leadId?: string): Promise<boolean> => {
    try {
      if (device) {
        if (leadId) {
          console.log(`Ending call for lead ID: ${leadId}`);
        } else {
          console.log("Ending all calls");
        }
        
        if (typeof device.disconnectAll === 'function') {
          device.disconnectAll();
          return true;
        } else {
          console.warn("disconnectAll method not available on device");
          return false;
        }
      } else {
        console.warn("Twilio device not initialized.");
        return false;
      }
    } catch (error) {
      console.error("Error ending call:", error);
      return false;
    }
  };

  const checkCallStatus = async (leadId: string): Promise<string> => {
    try {
      // Mock implementation for browser-based calls
      console.log(`Checking call status for lead ID: ${leadId} (browser-based)`);
      return 'in-progress';
    } catch (error) {
      console.error("Error checking call status:", error);
      return 'unknown';
    }
  };

  const toggleMute = (mute: boolean): boolean => {
    try {
      if (device && device.calls && device.calls.length > 0) {
        const call = device.calls[0];
        if (call) {
          call.mute(mute);
          console.log(`Call ${call.sid} ${mute ? 'muted' : 'unmuted'}`);
          return true;
        } else {
          console.warn("No active call to mute.");
          return false;
        }
      } else {
        console.warn("Twilio device not initialized or no calls available.");
        return false;
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
      return false;
    }
  };

  const toggleSpeaker = (speakerOn: boolean): boolean => {
    try {
      if (device && device.audio) { // Check for device.audio existence
        device.audio.speakerDevices.set(speakerOn ? 'default' : 'none');
        console.log(`Speaker ${speakerOn ? 'enabled' : 'disabled'}`);
        return true;
      } else {
        console.warn("Twilio device not initialized or audio not available.");
        return false;
      }
    } catch (error) {
      console.error("Error toggling speaker:", error);
      return false;
    }
  };

  const cleanup = () => {
    if (device) {
      if (typeof device.destroy === 'function') {
        device.destroy();
      }
      device = null;
      console.log("Twilio device destroyed.");
    }
    if (audioContext && audioContext.state === 'running') {
      audioContext.close().then(() => {
        audioContext = null;
        console.log("Audio context closed.");
      });
    }
  };

  return {
    initializeTwilioDevice,
    initializeAudioContext,
    isMicrophoneActive,
    getAudioOutputDevices,
    getCurrentAudioDevice,
    setAudioOutputDevice,
    testAudioOutput,
    makeCall,
    endCall,
    checkCallStatus,
    toggleMute,
    toggleSpeaker,
    cleanup
  };
};

export const twilioService: TwilioService = createTwilioService();
