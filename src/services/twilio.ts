
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
  let device: any = null; // Changed from 'Twilio.Device | null' to 'any'
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
      const response = await fetch('/api/twilio/token');
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
          // Use fake DTMF tones client-side.
          // enableRingingState: true,
          // Set maximum feedback delay to 3 seconds.
          // maxAverageBitrate: 8000,
          // maxCallSignalingTimeoutMs: 3000
        });

        device.on("error", (error: any) => {
          console.error("Twilio Device Error:", error);
          toast({
            title: "Twilio Device Error",
            description: `An error occurred with the phone system: ${error.message}`,
            variant: "destructive",
          });
        });

        device.on("disconnect", (call: any) => {
          console.log(`Call disconnected: ${call.sid}`);
        });

        device.on("incoming", (call: any) => {
          console.log(`Incoming call from: ${call.from}`);
          call.reject();
        });

        await device.register();
        console.log("Twilio device registered successfully.");
        return true;
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

      const call = await device.connect({
        params: {
          phoneNumber: phoneNumber,
          leadId: leadId
        }
      });

      console.log(`Attempting to call ${phoneNumber}`);

      return { 
        success: true, 
        callSid: call.sid,
        leadId: leadId
      };
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
