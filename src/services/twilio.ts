
import { toast } from "@/components/ui/use-toast";

export interface TwilioCallResult {
  success: boolean;
  callSid?: string;
  browserCallSid?: string;
  phoneCallSid?: string;
  conferenceName?: string;
  transcriptionSid?: string;  // Added this line to fix the error
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
  let isCleaningUp: boolean = false;

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
      // First, clean up any existing device
      if (device) {
        console.log("Cleaning up existing Twilio device before initialization");
        try {
          // await hangupAllCalls();
          
          if (typeof device.destroy === 'function') {
            await device.destroy();
          }
          device = null;
          activeCalls = [];
        } catch (cleanupErr) {
          console.warn("Error during cleanup of existing device:", cleanupErr);
        }
      }
      
      // Reset the cleaning up flag
      isCleaningUp = false;
      
      console.log("Fetching Twilio token...");
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
          // await hangupAllCalls();
        } catch (err) {
          console.warn("Error cleaning up existing calls:", err);
        }

        device = new window.Twilio.Device(data.token, {
          codecPreferences: ["opus", "pcmu"],
          maxCallSignalingTimeoutMs: 30000,
          logLevel: 'debug',
          forceAggressiveIceNomination: true,
          // Use our local sound files instead of GitHub URLs
          sounds: {
            incoming: '/sounds/incoming.mp3',
            outgoing: '/sounds/outgoing.mp3',
            disconnect: '/sounds/disconnect.mp3',
            dtmf0: '/sounds/dtmf-0.mp3',
            dtmf1: '/sounds/dtmf-1.mp3',
            dtmf2: '/sounds/dtmf-2.mp3',
            dtmf3: '/sounds/dtmf-3.mp3',
            dtmf4: '/sounds/dtmf-4.mp3',
            dtmf5: '/sounds/dtmf-5.mp3',
            dtmf6: '/sounds/dtmf-6.mp3',
            dtmf7: '/sounds/dtmf-7.mp3',
            dtmf8: '/sounds/dtmf-8.mp3',
            dtmf9: '/sounds/dtmf-9.mp3',
            dtmfs: '/sounds/dtmf-star.mp3',
            dtmfh: '/sounds/dtmf-pound.mp3'
          }
        });

        device.on("error", (error: any) => {
          console.error("Twilio Device Error:", error);
          
          // More detailed error reporting
          let errorMessage = error.message || error.toString();
          let errorCode = error.code || "unknown";
          
          if (errorCode === '31005' && errorMessage.includes('HANGUP')) {
            errorMessage = "Call terminated unexpectedly. The line may be busy or a previous call is still active.";
            
            // Automatically clean up when we get a HANGUP error
            console.log("Received HANGUP error, performing cleanup");
            if (!isCleaningUp) {
              isCleaningUp = true;
              setTimeout(() => {
                //  hangupAllCalls().then(() => {
                //   isCleaningUp = false;
                // }).catch(err => {
                //   isCleaningUp = false;
                //   console.warn("Error in auto-cleanup after HANGUP:", err);
                // });
              }, 1000);
            }
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

        device.on("cancel", (call: any) => {
          console.log(`Call canceled: ${call.sid || 'unknown'}`);
          // This is important to handle 'no-answer' scenarios
          activeCalls = activeCalls.filter(c => c.sid !== call.sid);
          
          toast({
            title: "Call Canceled",
            description: "The call was canceled or not answered.",
          });
        });

        device.on("incoming", (call: any) => {
          console.log(`Incoming call from: ${call.from || 'unknown'}`);
          
          // For direct browser calls, we'll automatically accept the call
          // This is critical to ensure the call is answered and connected
          const params = call.customParameters || new Map();
          const phoneNumber = params.get('phoneNumber');
          const leadId = params.get('leadId') || 'unknown';
          
          if (phoneNumber) {
            console.log(`Incoming call includes target phone: ${phoneNumber}, leadId: ${leadId}`);
            console.log("Automatically accepting incoming call to connect to target phone");
            
            // Always accept the call - this is essential to prevent "no answer" errors
            call.accept();
            
            // Add to active calls tracking
            activeCalls.push(call);
            
            // Set up listeners for this call
            call.on('error', (error: any) => {
              console.error('Call error:', error);
              // Remove from active calls on error
              activeCalls = activeCalls.filter(c => c.sid !== call.sid);
            });
            
            call.on('disconnect', () => {
              console.log('Call disconnected');
              // Remove from active calls when disconnected
              activeCalls = activeCalls.filter(c => c.sid !== call.sid);
            });
            
            call.on('cancel', () => {
              console.log('Call was cancelled');
              // Remove from active calls
              activeCalls = activeCalls.filter(c => c.sid !== call.sid);
            });
            
          } else {
            console.log("Incoming call without phone number target, rejecting");
            call.reject();
          }
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

      // Use a local test tone instead of an external URL
      await device.audio.speakerDevices.test('/sounds/test-tone.mp3');
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
      // await hangupAllCalls();
      
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
          
          // Attempt recovery if we get a connection error
          if (error.code === '31005') {
            console.log("Attempting recovery from connection error");
            setTimeout(() => {
               hangupAllCalls().catch(e => console.warn("Recovery cleanup error:", e));
            }, 1000);
          }
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
        
        // Listen specifically for no-answer event
        call.on('cancel', () => {
          console.log('Call was cancelled or not answered');
          toast({
            title: "Call Not Answered",
            description: "The recipient didn't answer the call.",
          });
          
          // Remove from active calls
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
      // Prevent concurrent cleanup operations
      if (isCleaningUp) {
        console.log("Cleanup already in progress, skipping");
        return true;
      }
      
      isCleaningUp = true;
      console.log("Hanging up all calls..1.");
      
      // First try the client-side approach
      if (device && typeof device.disconnectAll === 'function') {
        try {
          console.log("Executing device.disconnectAll() to clean up calls");
          device.disconnectAll();
          activeCalls = []; // Reset active calls tracking
        } catch (clientError) {
          console.warn("Error in client-side hangup:", clientError);
        }
      }
      
      // Always also try the server-side approach for thorough cleanup
      try {
        console.log("Executing server-side hangupAll for thorough cleanup");
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
        } else {
          const result = await response.json();
          console.log("Hangup all result:", result);
        }
      } catch (serverError) {
        console.warn("Error in server-side hangup:", serverError);
      }
      
      // Try a second cleanup after a short delay for reliability
      setTimeout(() => {
        if (device && typeof device.disconnectAll === 'function') {
          try {
            console.log("Executing delayed cleanup to ensure calls are terminated");
            device.disconnectAll();
          } catch (e) {
            console.warn("Error in delayed cleanup:", e);
          }
        }
        isCleaningUp = false;
      }, 1000);
      
      return true;
    } catch (error) {
      console.error("Error hanging up all calls:", error);
      isCleaningUp = false;
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
    isCleaningUp = false;
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
