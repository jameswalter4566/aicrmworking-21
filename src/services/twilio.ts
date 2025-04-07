import { createClient } from '@supabase/supabase-js';

// Create Supabase client with direct URL and key
const supabaseUrl = 'https://imrmboyczebjlbnkgjns.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltcm1ib3ljemViamxibmtnam5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2Njg1MDQsImV4cCI6MjA1OTI0NDUwNH0.scafe8itFDyN5mFcCiyS1uugV5-7s9xhaKoqYuXGJwQ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TwilioCallOptions {
  phoneNumber: string;
  identity?: string;
  params?: Record<string, string>;
}

interface TwilioCallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

interface TwilioCall {
  status: () => string;
  parameters?: {
    CallSid?: string;
    [key: string]: any;
  };
}

class TwilioService {
  private device: any = null;
  private token: string = '';
  private tokenExpiry: Date | null = null;
  private initialized: boolean = false;
  private activeCallSids: Map<string, string> = new Map();
  private twilioPhoneNumber: string = '';
  private microphoneStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private currentAudioDevice: string = 'default';
  private audioOutputDevices: MediaDeviceInfo[] = [];
  private customSounds: Record<string, string> = {
    incoming: '/sounds/incoming.mp3',
    outgoing: '/sounds/outgoing.mp3',
    disconnect: '/sounds/disconnect.mp3',
    dtmf1: '/sounds/dtmf-1.mp3',
    dtmf2: '/sounds/dtmf-2.mp3',
    dtmf3: '/sounds/dtmf-3.mp3',
    dtmf4: '/sounds/dtmf-4.mp3',
    dtmf5: '/sounds/dtmf-5.mp3',
    dtmf6: '/sounds/dtmf-6.mp3',
    dtmf7: '/sounds/dtmf-7.mp3',
    dtmf8: '/sounds/dtmf-8.mp3',
    dtmf9: '/sounds/dtmf-9.mp3',
    dtmf0: '/sounds/dtmf-0.mp3',
    'dtmf*': '/sounds/dtmf-star.mp3',
    'dtmf#': '/sounds/dtmf-pound.mp3',
  };

  constructor() {
    // Initialize in browser environment only
    if (typeof window !== 'undefined') {
      this.initializeTwilioDevice();
    }
  }

  async initializeTwilioDevice(): Promise<boolean> {
    try {
      // Only initialize once
      if (this.initialized) {
        console.log('Twilio device already initialized');
        return true;
      }

      // Check if Twilio.Device is available globally
      if (!window.Twilio || !window.Twilio.Device) {
        console.error('Twilio.Device is not available globally');
        return false;
      }

      console.log('Initializing Twilio device');

      // Preload required audio files to avoid encoding errors
      await this.preloadAudioFiles();

      // Get configuration from the server
      await this.getConfig();

      // Get a token
      const token = await this.getToken();
      if (!token) return false;

      // Create the device
      this.device = new window.Twilio.Device(token, {
        debug: true,
        closeProtection: true,
        codecPreferences: ['opus', 'pcmu'],
        disableAudioContextSounds: true, // Disable built-in sounds to use our own
        maxCallSignalingTimeoutMs: 30000,
        sounds: this.customSounds
      });

      // Set up device event handlers
      this.setupDeviceListeners();

      this.initialized = true;
      console.log('Twilio device initialized successfully');
      
      // Register device to receive incoming calls
      await this.device.register();
      console.log('Twilio device registered for incoming calls');

      return true;
    } catch (error) {
      console.error('Error initializing Twilio device:', error);
      return false;
    }
  }

  // Preload audio files to avoid decoding errors
  private async preloadAudioFiles(): Promise<void> {
    try {
      // Import the audio preloader dynamically to avoid circular dependencies
      const { preloadAudioAssets } = await import('@/utils/audioPreloader');
      await preloadAudioAssets();
      console.log('Audio files preloaded for Twilio service');
    } catch (err) {
      console.warn('Error preloading audio files:', err);
    }
  }

  private setupDeviceListeners() {
    if (!this.device) return;

    this.device.on('registered', () => {
      console.log('Twilio device registered');
    });

    this.device.on('error', (error: any) => {
      console.error('Twilio device error:', error);
    });

    this.device.on('incoming', (call: any) => {
      console.log('Incoming call received:', call);
    });

    this.device.on('cancel', () => {
      console.log('Call was canceled');
    });

    this.device.on('connect', (call: any) => {
      console.log('Call connected:', call);
    });

    this.device.on('disconnect', (call: any) => {
      console.log('Call disconnected:', call);
    });
  }

  async getToken(): Promise<string> {
    try {
      // Check if we have a valid token
      if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
        return this.token;
      }

      // Generate a unique identity based on browser
      const identity = `browser-refresh-${Date.now()}`;

      // Get a token from our edge function
      const response = await supabase.functions.invoke('twilio-token', {
        body: {
          refreshRequest: true,
          identity: identity,
        },
      });

      if (!response.data?.token) {
        console.error('Failed to get Twilio token:', response);
        return '';
      }

      this.token = response.data.token;
      
      // Set token expiry to 23 hours from now to be safe
      this.tokenExpiry = new Date();
      this.tokenExpiry.setHours(this.tokenExpiry.getHours() + 23);

      return this.token;
    } catch (error) {
      console.error('Error getting Twilio token:', error);
      return '';
    }
  }

  async getConfig(): Promise<boolean> {
    try {
      const response = await supabase.functions.invoke('twilio-voice', {
        body: {
          action: 'getConfig',
        },
      });

      if (!response.data?.success) {
        console.error('Failed to get Twilio configuration:', response);
        return false;
      }

      this.twilioPhoneNumber = response.data.twilioPhoneNumber;
      return true;
    } catch (error) {
      console.error('Error getting Twilio configuration:', error);
      return false;
    }
  }

  async makeCall(phoneNumber: string, leadId: string = ''): Promise<TwilioCallResult> {
    try {
      // Initialize if needed
      if (!this.initialized) {
        const initialized = await this.initializeTwilioDevice();
        if (!initialized) {
          return { success: false, error: 'Twilio device failed to initialize' };
        }
      }

      // Clean up the phone number - ensure it has a + and contains only digits
      let formattedNumber = phoneNumber;
      if (!formattedNumber.startsWith('+')) {
        formattedNumber = '+' + formattedNumber.replace(/\D/g, '');
      }

      console.log(`Making call to ${formattedNumber}`);

      // Get current identity from token
      const identity = this.getIdentityFromToken();
      
      try {
        // First try using server-side call via REST API
        console.log('Attempting to make call via REST API...');
        
        const response = await supabase.functions.invoke('twilio-voice', {
          body: {
            action: 'makeCall',
            phoneNumber: formattedNumber,
            browserClientName: identity || undefined,
          },
        });

        // Check if the response has data and success property
        if (response.data && typeof response.data === 'object' && 'success' in response.data) {
          if (response.data.success) {
            const callSid = response.data.callSid;
            console.log(`Call initiated with SID: ${callSid}`);
            
            // Store the callSid for this lead
            if (leadId) {
              this.activeCallSids.set(leadId, callSid);
            }
            
            return { success: true, callSid };
          } else {
            throw new Error(response.data.error || 'Failed to make call through REST API');
          }
        } else {
          throw new Error('Invalid response format from REST API');
        }
      } catch (error: any) {
        console.error('Error making call via REST API:', error);
        
        // Fallback to browser-based calling if REST API fails
        console.log('Falling back to browser-based calling...');
        
        if (!this.device) {
          return { success: false, error: 'Twilio device not initialized' };
        }
        
        try {
          const call = await this.device.connect({
            params: {
              To: formattedNumber,
              From: this.twilioPhoneNumber
            }
          });
          
          console.log('Browser-based call connected:', call);
          
          // Fix: Add type check before accessing call.parameters.CallSid
          const callSid = call.parameters && call.parameters.CallSid ? call.parameters.CallSid : undefined;
          if (callSid && leadId) {
            this.activeCallSids.set(leadId, callSid);
          }
          
          return { 
            success: true, 
            callSid: callSid || 'browser-call' 
          };
        } catch (browserError: any) {
          console.error('Browser-based call failed:', browserError);
          return { 
            success: false, 
            error: browserError.message || 'Browser-based call failed'
          };
        }
      }
    } catch (error: any) {
      console.error('Error making call:', error);
      return { success: false, error: error.message || 'Unknown error making call' };
    }
  }

  async checkCallStatus(leadId: string): Promise<string> {
    try {
      const callSid = this.activeCallSids.get(leadId) || 'pending-sid';
      
      if (callSid === 'browser-call') {
        // For browser-based calls, check device status
        if (this.device?.calls?.size > 0) {
          // Get the first call
          const firstCall = Array.from(this.device.calls.values())[0];
          
          // First check if firstCall exists and has a status method
          if (firstCall) {
            // Type guard to check if status is a function
            if (typeof (firstCall as any).status === 'function') {
              return (firstCall as TwilioCall).status() || 'unknown';
            }
          }
          return 'unknown';
        }
        return 'unknown';
      }
      
      // For REST API calls, check status from server
      const response = await supabase.functions.invoke('twilio-voice', {
        body: {
          action: 'checkStatus',
          callSid,
        },
      });

      if (!response.data?.success) {
        console.error('Failed to check call status:', response);
        return 'unknown';
      }

      return response.data.status;
    } catch (error) {
      console.error('Error checking call status:', error);
      return 'error';
    }
  }

  async endCall(leadId?: string): Promise<boolean> {
    try {
      if (leadId) {
        const callSid = this.activeCallSids.get(leadId);
        if (!callSid) {
          console.warn(`No active call found for lead ${leadId}`);
          return false;
        }
        
        // For browser-based calls
        if (callSid === 'browser-call') {
          if (this.device && this.device.calls && this.device.calls.size > 0) {
            this.device.disconnectAll();
            this.activeCallSids.delete(leadId);
            return true;
          }
        }

        // For REST API calls
        const response = await supabase.functions.invoke('twilio-voice', {
          body: {
            action: 'endCall',
            callSid,
          },
        });

        if (!response.data?.success) {
          console.error('Failed to end call:', response);
          return false;
        }

        // Remove from active calls
        this.activeCallSids.delete(leadId);
        
        return true;
      } else {
        // End all calls if no specific leadId is provided
        if (this.device && this.device.calls && this.device.calls.size > 0) {
          // End all device calls
          this.device.disconnectAll();
          console.log('Disconnected all browser calls');
        }
        
        // Also end any ongoing server-side calls
        return await this.endAllCalls();
      }
    } catch (error) {
      console.error('Error ending call:', error);
      return false;
    }
  }
  
  async endAllCalls(): Promise<boolean> {
    try {
      const promises: Promise<boolean>[] = [];
      
      this.activeCallSids.forEach((_, leadId) => {
        promises.push(this.endCall(leadId));
      });
      
      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      console.error('Error ending all calls:', error);
      return false;
    }
  }
  
  private getIdentityFromToken(): string | null {
    try {
      if (!this.token) return null;
      
      // JWT tokens are in the format header.payload.signature
      const parts = this.token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      return payload.sub || payload.identity || null;
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }

  // Audio context and device management
  async initializeAudioContext(): Promise<boolean> {
    try {
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        console.error('AudioContext not supported in this browser');
        return false;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Request microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        this.microphoneStream = stream;
        console.log('Microphone access granted', stream);
        return true;
      } catch (err) {
        console.error('Error accessing microphone:', err);
        return false;
      }
    } catch (err) {
      console.error('Error initializing audio context:', err);
      return false;
    }
  }

  isMicrophoneActive(): boolean {
    return !!this.microphoneStream && 
           this.microphoneStream.active && 
           this.microphoneStream.getAudioTracks().some(track => track.enabled && track.readyState === 'live');
  }

  async getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error('MediaDevices API not supported in this browser');
        return [];
      }
      
      // Ensure we have permission to enumerate devices
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      this.audioOutputDevices = audioOutputs;
      return audioOutputs;
    } catch (err) {
      console.error('Error getting audio output devices:', err);
      return [];
    }
  }

  getCurrentAudioDevice(): string {
    return this.currentAudioDevice;
  }

  async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    try {
      this.currentAudioDevice = deviceId;
      
      // If Device Audio is available from Twilio 2.x
      if (this.device && this.device.audio && this.device.audio.speakerDevices) {
        try {
          await this.device.audio.speakerDevices.set(deviceId);
          console.log(`Set Twilio audio output to device: ${deviceId}`);
        } catch (e) {
          console.warn('Could not set Twilio audio device:', e);
        }
      }
      
      // Store preference
      try {
        localStorage.setItem('preferredAudioDevice', deviceId);
      } catch (e) {
        console.warn('Could not store audio device preference:', e);
      }
      
      return true;
    } catch (err) {
      console.error('Error setting audio output device:', err);
      return false;
    }
  }

  async testAudioOutput(deviceId: string): Promise<boolean> {
    try {
      // Import the audio player dynamically
      const { playAudio } = await import('@/utils/audioPreloader');
      
      try {
        await playAudio('/sounds/test-tone.mp3', 0.3);
        console.log('Playing test audio to device:', deviceId);
        return true;
      } catch (e) {
        console.error('Could not play test audio:', e);
        
        // Try a different approach - generate a tone with AudioContext
        if (this.audioContext) {
          try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // 440 Hz - A4
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5); // Play for 0.5 seconds
            
            console.log('Playing test tone with AudioContext');
            return true;
          } catch (toneErr) {
            console.error('Could not play test tone:', toneErr);
          }
        }
        
        return false;
      }
    } catch (err) {
      console.error('Error testing audio output:', err);
      return false;
    }
  }

  toggleMute(shouldMute: boolean): boolean {
    try {
      // For Twilio 2.x device
      if (this.device && this.device.calls) {
        this.device.calls.forEach((call: any) => {
          if (shouldMute) {
            call.mute();
          } else {
            call.unmute();
          }
        });
      }
      
      // Also mute local microphone
      if (this.microphoneStream) {
        this.microphoneStream.getAudioTracks().forEach(track => {
          track.enabled = !shouldMute;
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error toggling mute:', err);
      return false;
    }
  }

  toggleSpeaker(speakerOn: boolean): boolean {
    // This is just a placeholder for now - actual speaker toggle would depend on the device
    return true;
  }

  cleanup(): void {
    // Clean up resources
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close().catch(err => console.warn('Error closing audio context:', err));
      this.audioContext = null;
    }
    
    if (this.device) {
      try {
        this.device.destroy();
      } catch (err) {
        console.warn('Error destroying Twilio device:', err);
      }
    }
  }
}

export const twilioService = new TwilioService();
