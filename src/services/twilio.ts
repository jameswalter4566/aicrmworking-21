import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

export interface CallStatusListener {
  (update: {
    callSid?: string;
    status: string;
    phoneNumber?: string;
    startTime?: Date;
    endTime?: Date;
    leadId?: string;
    errorCode?: string;
    errorMessage?: string;
  }): void;
}

interface CallOptions {
  originalLeadId?: string | number;
  callBack?: string;
  conferenceType?: string;
}

class TwilioService {
  private token: string | null = null;
  private device: any = null;
  private audioContext: AudioContext | null = null;
  private audioPlayer: HTMLAudioElement | null = null;
  private microphoneStream: MediaStream | null = null;
  private currentAudioDeviceId: string = '';
  private tokenExpirationTime: number = 0;
  private isCleaningUp: boolean = false;
  private soundsInitialized: boolean = false;
  private callDisconnectListeners: Array<() => void> = [];
  private callStatusListeners: CallStatusListener[] = [];

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
          
          this.notifyCallStatusListeners({
            status: 'error',
            errorCode: errorCode,
            errorMessage: errorMessage
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
          
          const params = call.customParameters || new Map();
          const leadId = params.get('leadId');
          
          if (leadId) {
            this.notifyCallStatusListeners({
              callSid: call.sid,
              status: 'completed',
              leadId: leadId,
              endTime: new Date()
            });
          }
        });

        this.device.on("cancel", (call: any) => {
          console.log(`Call canceled: ${call.sid || 'unknown'}`);
          this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
          
          const params = call.customParameters || new Map();
          const leadId = params.get('leadId');
          
          if (leadId) {
            this.notifyCallStatusListeners({
              callSid: call.sid,
              status: 'canceled',
              leadId: leadId,
              endTime: new Date()
            });
          }
          
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
            
            this.notifyCallStatusListeners({
              callSid: call.sid,
              status: 'connecting',
              phoneNumber: phoneNumber,
              leadId: leadId,
              startTime: new Date()
            });
            
            call.on('error', (error: any) => {
              console.error('Call error:', error);
              
              this.notifyCallStatusListeners({
                callSid: call.sid,
                status: 'error',
                leadId: leadId,
                errorMessage: error.message,
                errorCode: error.code
              });
              
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
            
            call.on('disconnect', () => {
              console.log('Call disconnected');
              this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
              
              this.notifyCallStatusListeners({
                callSid: call.sid,
                status: 'completed',
                leadId: leadId,
                endTime: new Date()
              });
            });
            
            call.on('cancel', () => {
              console.log('Call was cancelled');
              this.activeCalls = this.activeCalls.filter(c => c.sid !== call.sid);
              
              this.notifyCallStatusListeners({
                callSid: call.sid,
                status: 'canceled',
                leadId: leadId,
                endTime: new Date()
              });
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
    return this.currentAudioDeviceId || 'default';
  }

  async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    try {
      if (this.device && this.device.audio) {
        await this.device.audio.speakerDevices.set(deviceId);
        this.currentAudioDeviceId = deviceId;
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

      const testDevice = deviceId || this.currentAudioDeviceId || 'default';
      console.log(`Testing audio output device: ${testDevice}`);

      await this.device.audio.speakerDevices.test('/sounds/test-tone.mp3');
      return true;
    } catch (error) {
      console.error("Error testing audio output:", error);
      return false;
    }
  }

  async makeCall(phoneNumber: string, leadId: string | number, options: CallOptions = {}): Promise<TwilioCallResult> {
    try {
      console.log(`Making call to ${phoneNumber} for lead ${leadId} with options:`, options);
      
      if (!phoneNumber) {
        return { success: false, error: "Phone number is required" };
      }
      
      if (!this.token || Date.now() >= this.tokenExpirationTime - 60000) {
        await this.initializeTwilioDevice();
      }

      if (!this.device) {
        return { success: false, error: "Twilio device not initialized" };
      }
      
      // Make sure our phone number is in E.164 format
      let formattedPhoneNumber = phoneNumber;
      if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
        formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
      }
      
      try {
        // Prepare the parameters to pass to the call
        const callParams: Record<string, string> = {
          To: formattedPhoneNumber,
          leadId: String(leadId)
        };
        
        // Add the original lead ID if provided
        if (options.originalLeadId) {
          callParams.originalLeadId = String(options.originalLeadId);
        }
        
        console.log("Initiating call with params:", callParams);
        
        // Connect the call using the device
        const call = await this.device.connect({ params: callParams });
        
        return {
          success: true,
          callSid: call.parameters?.CallSid || 'browser-call',
          phoneNumber: formattedPhoneNumber,
          browserCallSid: call.parameters?.CallSid || null
        };
      } catch (error: any) {
        console.error("Error connecting call:", error);
        return { 
          success: false, 
          error: error.message || "Error connecting call" 
        };
      }
    } catch (error: any) {
      console.error("Error in makeCall:", error);
      return { 
        success: false, 
        error: error.message || "Error initiating call" 
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

  onCallStatusChange(listener: CallStatusListener): () => void {
    this.callStatusListeners.push(listener);
    
    return () => {
      this.callStatusListeners = this.callStatusListeners.filter(l => l !== listener);
    };
  }
  
  private notifyCallStatusListeners(update: {
    callSid?: string;
    status: string;
    phoneNumber?: string;
    startTime?: Date;
    endTime?: Date;
    leadId?: string;
    errorMessage?: string;
    errorCode?: string;
  }): void {
    for (const listener of this.callStatusListeners) {
      try {
        listener(update);
      } catch (error) {
        console.error('Error in call status listener:', error);
      }
    }
  }
  
  getActiveCalls(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const call of this.activeCalls) {
      try {
        const params = call.customParameters || new Map();
        const leadId = params.get('leadId');
        
        if (leadId) {
          result[leadId] = {
            sid: call.sid,
            status: call.status(),
            parameters: Object.fromEntries(params.entries())
          };
        }
      } catch (error) {
        console.error('Error getting active call info:', error);
      }
    }
    
    return result;
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
}

export const twilioService = new TwilioService();
