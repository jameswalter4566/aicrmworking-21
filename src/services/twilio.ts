
// src/services/twilio.ts

class TwilioService {
  private device: any = null;
  private call: any = null;
  private token: string | null = null;
  private isInitialized: boolean = false;
  private isAudioContextInitialized: boolean = false;
  private microphoneStream: MediaStream | null = null;
  private audioOutputDevices: MediaDeviceInfo[] = [];
  private currentAudioDeviceId: string = '';
  private hasActiveCall: boolean = false;

  // Initialize the Twilio device
  async initializeTwilioDevice(): Promise<boolean> {
    try {
      console.log("Initializing Twilio Device...");
      const tokenResponse = await this.fetchToken();
      
      if (!tokenResponse?.token) {
        console.error("Failed to get token from server");
        return false;
      }
      
      this.token = tokenResponse.token;
      
      // Check if Twilio.Device is available
      if (!window.Twilio || !window.Twilio.Device) {
        console.error("Twilio Device not found. Script may not be loaded.");
        this.loadTwilioScript();
        return false;
      }

      // Create a new Twilio.Device
      this.device = new window.Twilio.Device(this.token, {
        codecPreferences: ['opus', 'pcmu'],
        fakeLocalDTMF: true,
        enableRingingState: true,
        debug: true
      });
      
      // Set up event listeners
      this.setupDeviceEvents();
      
      // Register to receive incoming calls
      this.device.register();
      
      this.isInitialized = true;
      console.log("Twilio Device initialized successfully");
      
      return true;
    } catch (error) {
      console.error("Error initializing Twilio Device:", error);
      return false;
    }
  }

  // Try to load the Twilio script if it's not already loaded
  private loadTwilioScript(): void {
    console.log("Attempting to load Twilio script...");
    
    const existingScript = document.getElementById('twilio-js');
    if (existingScript) {
      console.log("Twilio script already exists, not loading again");
      return;
    }
    
    const script = document.createElement('script');
    script.id = 'twilio-js';
    script.src = 'https://sdk.twilio.com/js/client/releases/1.14.0/twilio.js';
    script.async = true;
    script.onload = () => {
      console.log("Twilio script loaded successfully");
      setTimeout(() => this.initializeTwilioDevice(), 1000);
    };
    script.onerror = (error) => {
      console.error("Failed to load Twilio script:", error);
    };
    
    document.head.appendChild(script);
  }

  // Set up event listeners for the Twilio Device
  private setupDeviceEvents(): void {
    if (!this.device) return;
    
    this.device.on('ready', () => {
      console.log("Twilio Device is ready for calls");
    });
    
    this.device.on('error', (error: any) => {
      console.error("Twilio Device error:", error);
    });
    
    this.device.on('incoming', (call: any) => {
      console.log("Incoming call from:", call.parameters.From);
    });
    
    this.device.on('offline', () => {
      console.log("Twilio Device is offline");
      this.isInitialized = false;
    });
    
    this.device.on('tokenWillExpire', () => {
      console.log("Token will expire soon, refreshing...");
      this.refreshToken();
    });
  }

  // Fetch a new token from the server
  private async fetchToken(): Promise<{ token: string; identity: string; } | null> {
    try {
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (!data.token) {
        console.error("No token received from server");
        return null;
      }
      
      return {
        token: data.token,
        identity: data.identity
      };
    } catch (error) {
      console.error("Error fetching Twilio token:", error);
      return null;
    }
  }

  // Refresh the token
  private async refreshToken(): Promise<boolean> {
    const tokenData = await this.fetchToken();
    
    if (!tokenData?.token) {
      console.error("Failed to refresh token");
      return false;
    }
    
    this.token = tokenData.token;
    
    if (this.device) {
      this.device.updateToken(this.token);
      return true;
    }
    
    return false;
  }

  // Initialize audio context and get microphone access
  async initializeAudioContext(): Promise<boolean> {
    if (this.isAudioContextInitialized) {
      return true;
    }
    
    try {
      // Request microphone access
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      // Stop tracks immediately, we just needed the permission
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
      
      this.isAudioContextInitialized = true;
      
      // Get available audio output devices
      this.getAudioOutputDevices();
      
      return true;
    } catch (error) {
      console.error("Error initializing audio context:", error);
      return false;
    }
  }

  // Get available audio output devices
  async getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error("MediaDevices API not supported");
        return [];
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
      
      // Set default device if not already set
      if (this.audioOutputDevices.length > 0 && !this.currentAudioDeviceId) {
        const defaultDevice = this.audioOutputDevices.find(d => d.deviceId === 'default') || this.audioOutputDevices[0];
        this.currentAudioDeviceId = defaultDevice.deviceId;
      }
      
      return this.audioOutputDevices;
    } catch (error) {
      console.error("Error getting audio output devices:", error);
      return [];
    }
  }

  // Set audio output device
  async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    if (!deviceId) return false;
    
    try {
      // Check if the setSinkId function is available
      const audio = new Audio();
      
      if ('setSinkId' in audio) {
        this.currentAudioDeviceId = deviceId;
        
        // If we have an active call, update it
        if (this.call) {
          const callMediaElement = this.call._mediaHandler._remoteStream?.audio?._element;
          if (callMediaElement) {
            await (callMediaElement as any).setSinkId(deviceId);
          }
        }
        
        // Also update audio from the WebSocket connection
        const audioElements = document.querySelectorAll('audio');
        for (let i = 0; i < audioElements.length; i++) {
          const element = audioElements[i];
          if ('setSinkId' in element) {
            try {
              await (element as any).setSinkId(deviceId);
              console.log(`Updated audio element ${i} to use device: ${deviceId}`);
            } catch (err) {
              console.warn(`Could not set sink ID for audio element ${i}:`, err);
            }
          }
        }
        
        return true;
      } else {
        console.warn("setSinkId is not supported in this browser");
        return false;
      }
    } catch (error) {
      console.error("Error setting audio output device:", error);
      return false;
    }
  }

  // Get current audio device ID
  getCurrentAudioDevice(): string {
    return this.currentAudioDeviceId;
  }

  // Test audio output
  async testAudioOutput(deviceId?: string): Promise<boolean> {
    try {
      const audio = new Audio('/sounds/dialtone.mp3');
      
      if (deviceId && 'setSinkId' in audio) {
        await (audio as any).setSinkId(deviceId);
      }
      
      audio.volume = 0.3;
      await audio.play();
      
      // Stop after 1 second
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 1000);
      
      return true;
    } catch (error) {
      console.error("Error testing audio output:", error);
      return false;
    }
  }

  // Make a call using Twilio REST API through Edge Functions
  async makeCall(phoneNumber: string): Promise<{
    success: boolean;
    callSid?: string;
    error?: string;
    usingBrowser?: boolean;
  }> {
    if (!phoneNumber) {
      return { success: false, error: 'Phone number is required' };
    }
    
    try {
      // First, connect to our WebSocket for bidirectional streaming
      // This should be done before making the call
      const connected = await import('@/services/audioProcessing')
        .then(module => module.audioProcessing.connect({
          onStreamStarted: (streamSid, callSid) => {
            console.log(`Audio stream started: ${streamSid}, Call: ${callSid}`);
          }
        }))
        .catch(err => {
          console.error('Error importing audio processing:', err);
          return false;
        });
      
      if (!connected) {
        console.warn('Failed to establish WebSocket connection for audio streaming');
        // Continue with the call anyway, but warn about potential audio issues
      }
      
      // Try to use the Twilio Device for in-browser calling if available
      if (this.isInitialized && this.device) {
        console.log(`Making browser call to ${phoneNumber}`);
        
        try {
          // Connect with specific parameters
          this.call = this.device.connect({
            To: phoneNumber,
            enableRingingState: true
          });
          
          // Set up call event handlers
          this.call.on('accept', () => {
            console.log('Call accepted');
            this.hasActiveCall = true;
            
            // Set the audio output device for this call if we have one selected
            if (this.currentAudioDeviceId) {
              setTimeout(() => {
                this.setAudioOutputDevice(this.currentAudioDeviceId)
                  .then(success => {
                    if (success) {
                      console.log(`Set call audio output to device: ${this.currentAudioDeviceId}`);
                    } else {
                      console.warn('Could not set audio output device for call');
                    }
                  });
              }, 500);
            }
          });
          
          this.call.on('disconnect', () => {
            console.log('Call disconnected');
            this.hasActiveCall = false;
          });
          
          this.call.on('error', (error: any) => {
            console.error('Call error:', error);
            this.hasActiveCall = false;
          });
          
          return {
            success: true,
            callSid: this.call.parameters.CallSid,
            usingBrowser: true
          };
        } catch (deviceError) {
          console.error('Error making call with Twilio Device:', deviceError);
          // Fall back to REST API call
        }
      }
      
      // Fall back to making a call via the Edge Function
      console.log(`Making REST API call to ${phoneNumber}`);
      
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'makeCall',
          phoneNumber
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Call failed',
          usingBrowser: false
        };
      }
      
      return {
        success: true,
        callSid: data.callSid,
        usingBrowser: false
      };
    } catch (error: any) {
      console.error(`Error making call to ${phoneNumber}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        usingBrowser: false
      };
    }
  }

  // End the current call
  async endCall(): Promise<boolean> {
    try {
      // Close the audio processing
      const audioProcessingModule = await import('@/services/audioProcessing')
        .catch(err => {
          console.error('Error importing audio processing:', err);
          return null;
        });
      
      if (audioProcessingModule) {
        audioProcessingModule.audioProcessing.cleanup();
      }
      
      // If we have an active call, disconnect it
      if (this.call) {
        this.call.disconnect();
        this.call = null;
        this.hasActiveCall = false;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error ending call:", error);
      return false;
    }
  }

  // Check the status of a call
  async checkCallStatus(callSid: string): Promise<string> {
    if (!callSid) {
      return 'unknown';
    }
    
    try {
      // If it's a browser call, check the local status
      if (this.call && this.call.parameters.CallSid === callSid) {
        return this.getBrowserCallStatus();
      }
      
      // Otherwise check with the Twilio API
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkStatus',
          callSid
        })
      });
      
      const data = await response.json();
      
      return data.status || 'unknown';
    } catch (error) {
      console.error(`Error checking status for call ${callSid}:`, error);
      return 'error';
    }
  }

  // Get the status of a browser call
  private getBrowserCallStatus(): string {
    if (!this.call) {
      return 'completed';
    }
    
    const status = this.call.status();
    
    // Map Twilio Device call status to our status format
    switch (status) {
      case 'open':
      case 'connecting':
        return 'connecting';
      case 'ringing':
        return 'connecting';
      case 'connected':
        return 'in-progress';
      case 'closed':
        return 'completed';
      case 'pending':
        return 'connecting';
      default:
        return status;
    }
  }

  // Toggle mute
  toggleMute(mute: boolean): boolean {
    try {
      if (this.call) {
        mute ? this.call.mute() : this.call.unmute();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error toggling mute:", error);
      return false;
    }
  }

  // Toggle speaker
  toggleSpeaker(speakerOn: boolean): boolean {
    // This is handled through the audio output device selection
    return true;
  }

  // Check if microphone is active
  isMicrophoneActive(): boolean {
    return this.isAudioContextInitialized;
  }

  // Clean up resources
  cleanup(): void {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    
    this.isInitialized = false;
    this.isAudioContextInitialized = false;
  }
}

export const twilioService = new TwilioService();
