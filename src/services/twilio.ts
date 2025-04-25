import { toast } from "@/components/ui/use-toast";

export interface TwilioCallResult {
  success: boolean;
  callSid?: string;
  browserCallSid?: string;
  phoneCallSid?: string;
  conferenceName?: string;
  message?: string;
  error?: string;
  twilioErrorCode?: number;
  leadId?: string | number;
}

class TwilioService {
  private device: any = null;
  private audioContext: AudioContext | null = null;
  private preferredAudioDevice: string | null = null;
  private activeCalls: any[] = [];
  private isCleaningUp: boolean = false;
  private soundsInitialized: boolean = false;
  private callDisconnectListeners: Array<() => void> = [];
  private sessionId: string = `session-${Date.now()}`;

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
      
      this.isCleaningUp = false;
      this.soundsInitialized = false;
      
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
        this.device = new window.Twilio.Device(data.token, {
          codecPreferences: ["opus", "pcmu"],
          maxCallSignalingTimeoutMs: 30000,
          logLevel: 'debug',
          disableAudioContextSounds: true,
          sounds: {}
        });

        this.device.on("error", (error: any) => {
          console.error("Twilio Device Error:", error);
          
          let errorMessage = error.message || error.toString();
          let errorCode = error.code || "unknown";
          
          if (errorCode === '31005' && errorMessage.includes('HANGUP')) {
            errorMessage = "Call terminated unexpectedly. The line may be busy or a previous call is still active.";
            
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
          this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
        });

        this.device.on("cancel", (call: any) => {
          console.log(`Call canceled: ${call.sid || 'unknown'}`);
          this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
          
          toast({
            title: "Call Canceled",
            description: "The call was canceled or not answered.",
          });
        });

        this.device.on("incoming", (call: any) => {
          console.log(`Incoming call from: ${call.from || 'unknown'}`);
          
          const params = call.customParameters || new Map();
          const phoneNumber = params.get('phoneNumber');
          const leadId = params.get('leadId') || 'unknown';
          
          if (phoneNumber) {
            console.log(`Incoming call includes target phone: ${phoneNumber}, leadId: ${leadId}`);
            console.log("Automatically accepting incoming call to connect to target phone");
            
            call.accept();
            
            this.activeCalls.push(call);
            
            call.on('error', (error: any) => {
              console.error('Call error:', error);
              this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
            });
            
            call.on('disconnect', () => {
              console.log('Call disconnected');
              this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
            });
            
            call.on('cancel', () => {
              console.log('Call was cancelled');
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

      this.activeCalls = [];

      let formattedPhoneNumber = phoneNumber;
      if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
        formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
      }
      
      console.log(`Attempting to call ${formattedPhoneNumber} via browser client`);
      
      try {
        if (this.device.calls && this.device.calls.length > 0) {
          console.warn("Device has active calls before making new call. Cleaning up...");
          this.device.disconnectAll();
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (this.device.state !== 'registered') {
          console.log("Device not registered, attempting to register...");
          await this.device.register();
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const call = await this.device.connect({
          params: {
            phoneNumber: formattedPhoneNumber,
            leadId: leadId.toString(),
            sessionId: this.sessionId
          }
        });
        
        this.activeCalls.push(call);
        
        console.log(`Browser client call connected with SID: ${call.sid || 'unknown'}`);
        
        call.on('error', (error: any) => {
          console.error('Call error:', error);
          toast({
            title: "Call Error",
            description: `Error during call: ${error.message || error}`,
            variant: "destructive",
          });
          
          this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
          
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
          
          this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
          
          this.callDisconnectListeners.forEach(listener => listener());
        });
        
        call.on('cancel', () => {
          console.log('Call was cancelled or not answered');
          toast({
            title: "Call Not Answered",
            description: "The recipient didn't answer the call.",
          });
          
          this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
          
          this.callDisconnectListeners.forEach(listener => listener());
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
      
      try {
        this.device.disconnectAll();
      } catch (e) {
        console.warn("Error hanging up calls via Device API:", e);
      }

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
      
      this.activeCalls = [];
      
      return true;
    } catch (error) {
      console.error("Error hanging up all calls:", error);
      return false;
    }
  }

  checkCallStatus(leadId: string): string {
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
    
    for (const call of this.activeCalls) {
      try {
        if (mute === undefined) {
          if (call.isMuted()) {
            call.mute(false);
          } else {
            call.mute(true);
          }
        } else {
          call.mute(mute);
        }
      } catch (e) {
        console.warn(`Error toggling mute on call ${call.sid || 'unknown'}:`, e);
      }
    }
    
    return this.activeCalls[0].isMuted();
  }

  toggleSpeaker(speakerOn?: boolean): boolean {
    return speakerOn !== undefined ? speakerOn : true;
  }

  isDeviceRegistered(): boolean {
    return this.device && this.device.state === 'registered';
  }

  getActiveCallCount(): number {
    return this.activeCalls?.length || 0;
  }

  onCallDisconnect(callback: () => void): () => void {
    this.callDisconnectListeners.push(callback);
    
    return () => {
      this.callDisconnectListeners = this.callDisconnectListeners.filter(
        listener => listener !== callback
      );
    };
  }

  cleanup(): void {
    this.callDisconnectListeners.forEach(listener => listener());
    this.callDisconnectListeners = [];
    
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

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

export const twilioService = new TwilioService();
