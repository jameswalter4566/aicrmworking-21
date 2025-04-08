
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
  hangupAllCalls: () => Promise<boolean>;
  isDeviceRegistered: () => boolean;
  getActiveCallCount: () => number;
}

const createTwilioService = (): TwilioService => {
  let device: any = null; // Using any to avoid TypeScript errors
  let audioContext: AudioContext | null = null;
  let preferredAudioDevice: string | null = null;
  let activeCalls: any[] = []; // Track active calls for better management

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
      if (device) {
        console.log("Cleaning up existing Twilio device before initialization");
        try {
          if (typeof device.destroy === 'function') {
            await device.destroy();
          }
          device = null;
          activeCalls = [];
        } catch (cleanupErr) {
          console.warn("Error during cleanup of existing device:", cleanupErr);
        }
      }
      
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
        throw new Error(`Failed to fetch Twilio token: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.token) {
        console.error("Failed to retrieve Twilio token:", data.error || "No token in response");
        throw new Error(data.error || "No token in response");
      }

      if (window.Twilio && window.Twilio.Device) {
        // First make sure we terminate any previous device
        try {
          await hangupAllCalls();
        } catch (err) {
          console.warn("Error cleaning up existing calls:", err);
        }

        device = new window.Twilio.Device(data.token, {
          codecPreferences: ["opus", "pcmu"],
          maxCallSignalingTimeoutMs: 30000,
          logLevel: 'debug',
          forceAggressiveIceNomination: true,
          // Add sound customization to help with debugging
          sounds: {
            incoming: 'https://cdn.jsdelivr.net/gh/twilio/twilio-voice.js@1.1.0/sounds/incoming.mp3',
            outgoing: 'https://cdn.jsdelivr.net/gh/twilio/twilio-voice.js@1.1.0/sounds/outgoing.mp3',
            disconnect: 'https://cdn.jsdelivr.net/gh/twilio/twilio-voice.js@1.1.0/sounds/disconnect.mp3',
          }
        });

        device.on("error", (error: any) => {
          console.error("Twilio Device Error:", error);
          
          // More detailed error reporting
          let errorMessage = error.message || error.toString();
          let errorCode = error.code || "unknown";
          
          if (errorCode === '31005' && errorMessage.includes('HANGUP')) {
            errorMessage = "Call terminated unexpectedly. The line may be busy or a previous call is still active.";
          }
          
          toast({
            title: `Twilio Device Error (${errorCode})`,
            description: errorMessage,
            variant: "destructive",
          });
          
          // Clean up any zombie calls when we get errors
          try {
            if (activeCalls.length > 0) {
              console.log("Cleaning up calls after error");
              device.disconnectAll();
              activeCalls = [];
            }
          } catch (cleanupErr) {
            console.warn("Error cleaning up after device error:", cleanupErr);
          }
        });

        device.on("disconnect", (call: any) => {
          console.log(`Call disconnected: ${call.sid || 'unknown'}`);
          
          // Remove from active calls when disconnected
          activeCalls = activeCalls.filter(c => c.sid !== call.sid);
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
          throw registerError;
        }
      } else {
        console.error("Twilio.Device is not supported in this browser.");
        throw new Error("Twilio.Device is not supported in this browser.");
      }
    } catch (error) {
      console.error("Error initializing Twilio device:", error);
      throw error;
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
      if (device && device.audio) {
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
      if (!device || !device.audio) {
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

      // First clean up any existing calls
      await hangupAllCalls();
      
      // Make sure we're starting fresh
      activeCalls = [];

      let formattedPhoneNumber = phoneNumber;
      if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
        formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
      }
      
      console.log(`Attempting to call ${formattedPhoneNumber} via browser client`);
      
      try {
        // Make sure we're not already on a call
        if (device.calls && device.calls.length > 0) {
          console.warn("Device has active calls before making new call. Cleaning up...");
          device.disconnectAll();
          
          // Small delay to ensure clean state
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const call = await device.connect({
          params: {
            phoneNumber: formattedPhoneNumber,
            leadId: leadId
          }
        });
        
        // Add to active calls tracking
        activeCalls.push(call);
        
        console.log(`Browser client call connected with SID: ${call.sid || 'unknown'}`);
        
        call.on('error', (error: any) => {
          console.error('Call error:', error);
          toast({
            title: "Call Error",
            description: `Error during call: ${error.message || error}`,
            variant: "destructive",
          });
          
          // Remove from active calls on error
          activeCalls = activeCalls.filter(c => c.sid !== call.sid);
        });
        
        call.on('accept', () => {
          console.log('Call accepted, audio connection established');
          toast({
            title: "Call Connected",
            description: "You're now connected to the call.",
          });
        });
        
        call.on('disconnect', () => {
          console.log('Call disconnected');
          toast({
            title: "Call Ended",
            description: "The call has been disconnected.",
          });
          
          // Remove from active calls when disconnected
          activeCalls = activeCalls.filter(c => c.sid !== call.sid);
        });
        
        return { 
          success: true, 
          callSid: call.sid || 'browser-call',
          leadId: leadId
        };
      } catch (deviceError) {
        console.warn("Browser-based call initiation failed. Error:", deviceError);
        console.log("Falling back to server-side call initiation...");
        
        const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'makeCall',
            phoneNumber: formattedPhoneNumber,
            leadId: leadId,
            browserClientName: device.identity || 'browser-client'
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
        
        // First try the Twilio method
        if (typeof device.disconnectAll === 'function') {
          device.disconnectAll();
          activeCalls = []; // Reset active calls tracking
        } else {
          console.warn("disconnectAll method not available on device");
          return false;
        }
        
        // Also try to hangup via server as a backup
        try {
          await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'hangupAll'
            })
          });
        } catch (serverError) {
          console.warn("Error ending call via server, but client-side hangup succeeded:", serverError);
        }
        
        return true;
      } else {
        console.warn("Twilio device not initialized.");
        return false;
      }
    } catch (error) {
      console.error("Error ending call:", error);
      return false;
    }
  };

  const hangupAllCalls = async (): Promise<boolean> => {
    try {
      // First try the client-side approach
      if (device && typeof device.disconnectAll === 'function') {
        device.disconnectAll();
        activeCalls = []; // Reset active calls tracking
      }
      
      // Always also try the server-side approach for thorough cleanup
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'hangupAll'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server hangup all response error:", response.status, errorText);
        return true; // Still return true as we attempted client-side cleanup
      }
      
      const result = await response.json();
      console.log("Hangup all result:", result);
      
      return true;
    } catch (error) {
      console.error("Error hanging up all calls:", error);
      return false;
    }
  };

  const checkCallStatus = async (leadId: string): Promise<string> => {
    try {
      console.log(`Checking call status for lead ID: ${leadId} (browser-based)`);
      
      // Check if we have any active device calls
      if (device && device.calls && device.calls.length > 0) {
        return 'in-progress';
      }
      
      // Check our internal tracking
      if (activeCalls.length > 0) {
        return 'in-progress';
      }
      
      return 'completed';
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
      if (device && device.audio) {
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

  const isDeviceRegistered = (): boolean => {
    return !!(device && device.state === 'registered');
  };
  
  const getActiveCallCount = (): number => {
    return activeCalls.length;
  };

  const cleanup = () => {
    if (device) {
      hangupAllCalls().catch(err => console.warn("Error in final hangup:", err));
      
      if (typeof device.destroy === 'function') {
        device.destroy();
      }
      device = null;
      activeCalls = [];
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
    cleanup,
    hangupAllCalls,
    isDeviceRegistered,
    getActiveCallCount
  };
};

export const twilioService: TwilioService = createTwilioService();
