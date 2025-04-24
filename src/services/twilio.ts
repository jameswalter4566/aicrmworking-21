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

class TwilioService {
  private device: any = null;
  private audioContext: AudioContext | null = null;
  private preferredAudioDevice: string | null = null;
  private activeCalls: any[] = [];
  private isCleaningUp: boolean = false;
  private soundsInitialized: boolean = false;
  
  async initializeAudioContext(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error("Error initializing audio context or accessing microphone:", error);
      return false;
    }
  }
  
  isMicrophoneActive(): boolean {
    if (!this.audioContext) return false;
    return this.audioContext.state === 'running';
  }
  
  async initializeTwilioDevice(): Promise<boolean> {
    try {
      // First, clean up any existing device
      if (this.device) {
        console.log("Cleaning up existing Twilio device before initialization");
        try {
          if (typeof this.device.destroy === 'function') {
            await this.device.destroy();
          }
          this.device = null;
          this.activeCalls = [];
        } catch (cleanupErr) {
          console.warn("Error during cleanup of existing device:", cleanupErr);
        }
      }
      
      // Reset the cleaning up flag
      this.isCleaningUp = false;
      this.soundsInitialized = false;
      
      console.log("Fetching Twilio token...");
      // Using direct fetch to bypass authorization header requirements
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
        // First initialize with minimal options to avoid audio loading errors
        this.device = new window.Twilio.Device(data.token, {
          codecPreferences: ["opus", "pcmu"],
          maxCallSignalingTimeoutMs: 30000,
          logLevel: 'debug',
          // Disable audio context sounds to avoid decoding errors
          disableAudioContextSounds: true,
          sounds: {} // Set empty sounds object to avoid decoding errors
        });

        // Set up event handlers
        this.device.on("error", (error: any) => {
          console.error("Twilio Device Error:", error);
          
          // More detailed error reporting
          let errorMessage = error.message || error.toString();
          let errorCode = error.code || "unknown";
          
          if (errorCode === '31005' && errorMessage.includes('HANGUP')) {
            errorMessage = "Call terminated unexpectedly. The line may be busy or a previous call is still active.";
            
            // Automatically clean up when we get a HANGUP error
            console.log("Received HANGUP error, performing cleanup");
            if (!this.isCleaningUp) {
              this.isCleaningUp = true;
              setTimeout(() => {
                this.hangupAllCalls().then(() => {
                  this.isCleaningUp = false;
                }).catch(err => {
                  this.isCleaningUp = false;
                  console.warn("Error in auto-cleanup after HANGUP:", err);
                });
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
            if (this.activeCalls.length > 0) {
              console.log("Cleaning up calls after error");
              this.device.disconnectAll();
              this.activeCalls = [];
            }
          } catch (cleanupErr) {
            console.warn("Error cleaning up after device error:", cleanupErr);
          }
        });

        this.device.on("disconnect", (call: any) => {
          console.log(`Call disconnected: ${call.sid || 'unknown'}`);
          
          // Remove from active calls when disconnected
          this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
        });

        this.device.on("cancel", (call: any) => {
          console.log(`Call canceled: ${call.sid || 'unknown'}`);
          // This is important to handle 'no-answer' scenarios
          this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
          
          toast({
            title: "Call Canceled",
            description: "The call was canceled or not answered.",
          });
        });

        this.device.on("incoming", (call: any) => {
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
            this.activeCalls.push(call);
            
            // Set up listeners for this call
            call.on('error', (error: any) => {
              console.error('Call error:', error);
              // Remove from active calls on error
              this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
            });
            
            call.on('disconnect', () => {
              console.log('Call disconnected');
              // Remove from active calls when disconnected
              this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
            });
            
            call.on('cancel', () => {
              console.log('Call was cancelled');
              // Remove from active calls
              this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
            });
          } else {
            console.log("Incoming call without phone number target, rejecting");
            call.reject();
          }
        });

        try {
          await this.device.register();
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
  }

  async getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      await this.initializeAudioContext();
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audiooutput');
    } catch (error) {
      console.error("Error getting audio output devices:", error);
      return [];
    }
  }

  getCurrentAudioDevice(): string {
    return this.preferredAudioDevice || 'default';
  }

  async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    try {
      if (this.device && this.device.audio) {
        await this.device.audio.speakerDevices.set(deviceId);
        this.preferredAudioDevice = deviceId;
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
  }

  async testAudioOutput(deviceId?: string): Promise<boolean> {
    try {
      if (!this.device || !this.device.audio) {
        console.warn("Twilio device not initialized or audio not available, cannot test audio.");
        return false;
      }

      const testDevice = deviceId || this.preferredAudioDevice || 'default';
      console.log(`Testing audio output device: ${testDevice}`);

      // Use a local test tone instead of an external URL
      await this.device.audio.speakerDevices.test('/sounds/test-tone.mp3');
      return true;
    } catch (error) {
      console.error("Error testing audio output:", error);
      return false;
    }
  }

  async makeCall(phoneNumber: string, leadId: string): Promise<TwilioCallResult> {
    try {
      if (!this.device) {
        console.error("Twilio device not initialized.");
        return { success: false, error: "Twilio device not initialized." };
      }

      // Make sure we're starting fresh
      this.activeCalls = [];

      let formattedPhoneNumber = phoneNumber;
      if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
        formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
      }
      
      console.log(`Attempting to call ${formattedPhoneNumber} via browser client`);
      
      try {
        // Make sure we're not already on a call
        if (this.device.calls && this.device.calls.length > 0) {
          console.warn("Device has active calls before making new call. Cleaning up...");
          this.device.disconnectAll();
          
          // Small delay to ensure clean state
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // We need to ensure the device is ready before making a call
        if (this.device.state !== 'registered') {
          console.log("Device not registered, attempting to register...");
          await this.device.register();
          
          // Small delay after registering
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Now we can make the call with properly formatted parameters
        const call = await this.device.connect({
          params: {
            phoneNumber: formattedPhoneNumber,
            leadId: leadId.toString() // Ensure leadId is a string
          }
        });
        
        // Add to active calls tracking
        this.activeCalls.push(call);
        
        console.log(`Browser client call connected with SID: ${call.sid || 'unknown'}`);
        
        call.on('error', (error: any) => {
          console.error('Call error:', error);
          toast({
            title: "Call Error",
            description: `Error during call: ${error.message || error}`,
            variant: "destructive",
          });
          
          // Remove from active calls on error
          this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
          
          // Attempt recovery if we get a connection error
          if (error.code === '31005') {
            console.log("Attempting recovery from connection error");
            setTimeout(() => {
               this.hangupAllCalls().catch(e => console.warn("Recovery cleanup error:", e));
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
          this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
        });
        
        // Listen specifically for no-answer event
        call.on('cancel', () => {
          console.log('Call was cancelled or not answered');
          toast({
            title: "Call Not Answered",
            description: "The recipient didn't answer the call.",
          });
          
          // Remove from active calls
          this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
        });
        
        return { 
          success: true, 
          callSid: call.sid || 'browser-call',
          leadId: leadId
        };
      } catch (deviceError: any) {
        console.warn("Browser-based call initiation failed. Error:", deviceError);
        return {
          success: false,
          error: deviceError.message || "Failed to initiate call through the browser"
        };
      }
    } catch (error: any) {
      console.error("Error making call:", error);
      return {
        success: false,
        error: error.message || "Unknown error making call"
      };
    }
  }

  async endCall(leadId?: string): Promise<boolean> {
    try {
      if (!this.device) {
        console.error("Twilio device not initialized.");
        return false;
      }
      
      if (leadId) {
        // End specific call for this lead
        const call = this.activeCalls.find((c: any) => {
          const params = c.customParameters || new Map();
          return params.get('leadId') === leadId;
        });
        
        if (call) {
          call.disconnect();
          console.log(`Ended call for lead ID ${leadId}`);
          return true;
        } else {
          console.warn(`No active call found for lead ID ${leadId}`);
          return false;
        }
      } else {
        // End all calls
        return await this.hangupAllCalls();
      }
    } catch (error) {
      console.error("Error ending call:", error);
      return false;
    }
  }

  async hangupAllCalls(): Promise<boolean> {
    try {
      console.log("Attempting to hang up all active calls");
      
      if (!this.device) {
        console.warn("Twilio device not initialized.");
        return false;
      }
      
      // First try to disconnect via device
      try {
        this.device.disconnectAll();
      } catch (e) {
        console.warn("Error hanging up calls via Device API:", e);
      }

      // Also try via API for any zombie calls
      try {
        const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'hangupAll' })
        });
        
        if (!response.ok) {
          console.warn(`Server responded with ${response.status} when trying to hang up all calls`);
        } else {
          const data = await response.json();
          console.log(`Hung up ${data.hungUpCount || 0} calls via API`);
        }
      } catch (e) {
        console.warn("Error calling hangup API:", e);
      }
      
      // Clear our local tracking of calls
      this.activeCalls = [];
      
      return true;
    } catch (error) {
      console.error("Error hanging up all calls:", error);
      return false;
    }
  }

  checkCallStatus(leadId: string): string {
    // Find call for this lead
    const call = this.activeCalls.find((c: any) => {
      const params = c.customParameters || new Map();
      return params.get('leadId') === leadId;
    });
    
    if (!call) {
      return 'no-call';
    }
    
    return call.status || 'unknown';
  }

  toggleMute(mute?: boolean): boolean {
    if (!this.device || this.activeCalls.length === 0) {
      return false;
    }
    
    // Apply to all active calls
    for (const call of this.activeCalls) {
      try {
        if (mute === undefined) {
          // Toggle current state
          if (call.isMuted()) {
            call.mute(false);
          } else {
            call.mute(true);
          }
        } else {
          // Set to specific state
          call.mute(mute);
        }
      } catch (e) {
        console.warn(`Error toggling mute on call ${call.sid || 'unknown'}:`, e);
      }
    }
    
    // Return current mute state of the first call
    return this.activeCalls[0].isMuted();
  }

  toggleSpeaker(speakerOn?: boolean): boolean {
    // This is a placeholder as the Twilio Client SDK doesn't have direct speaker control
    // Actual implementation would depend on specific UI requirements
    return speakerOn !== undefined ? speakerOn : true;
  }

  isDeviceRegistered(): boolean {
    return this.device && this.device.state === 'registered';
  }

  getActiveCallCount(): number {
    return this.activeCalls?.length || 0;
  }

  cleanup(): void {
    if (this.device) {
      try {
        this.hangupAllCalls()
          .then(() => {
            if (this.device && typeof this.device.destroy === 'function') {
              this.device.destroy();
            }
            this.device = null;
            this.activeCalls = [];
          })
          .catch(error => {
            console.error("Error during cleanup:", error);
          });
      } catch (e) {
        console.warn("Error during cleanup:", e);
      }
    }
  }
}

// Create a singleton instance
export const twilioService = new TwilioService();
