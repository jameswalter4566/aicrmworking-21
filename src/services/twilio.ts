// src/services/twilio.ts
import { twilioAudioService } from './twilio-audio';

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
  private tokenRefreshInterval: number | null = null;
  private useBrowserCallingOnly: boolean = true; // Always use browser calling
  private errorHandlers: Array<(error: any) => void> = [];

  // Initialize the Twilio device with options for Voice SDK 2.x
  async initializeTwilioDevice(): Promise<boolean> {
    try {
      console.log("Initializing Twilio Voice SDK 2.x Device...");
      const tokenResponse = await this.fetchToken();
      
      if (!tokenResponse?.token) {
        console.error("Failed to get token from server");
        return false;
      }
      
      this.token = tokenResponse.token;
      
      // Check if Twilio.Device is available
      if (!window.Twilio || !window.Twilio.Device) {
        console.error("Twilio Device not found. Script may not be loaded.");
        return false;
      }

      // Clean up any existing device before creating a new one
      if (this.device) {
        try {
          this.device.destroy();
          this.device = null;
        } catch (e) {
          console.warn("Error cleaning up previous device", e);
        }
      }

      // Create a new Twilio.Device with Voice SDK 2.x options
      // In 2.x, Device is a constructor, not a singleton
      this.device = new window.Twilio.Device(this.token, {
        // Voice SDK 2.x options
        edge: 'ashburn',
        enableRingingState: true,
        disableAudioContextSounds: false,
        codecPreferences: ['opus', 'pcmu'],
        sounds: {
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
          dtmfs: '/sounds/dtmf-star.mp3',
          dtmfh: '/sounds/dtmf-pound.mp3'
        },
        logLevel: 'debug',
      });
      
      console.log("Twilio device created with token:", this.token ? this.token.substring(0, 10) + "..." : "no token");
      
      // Set up event listeners with Voice SDK 2.x syntax
      this.setupDeviceEvents();
      
      // Initialize audio service
      twilioAudioService.initialize(this.device);
      
      // Register to receive incoming calls
      try {
        await this.device.register();
        console.log("Device registered successfully");
      } catch (err) {
        console.error("Error registering device:", err);
        // Continue even if registration fails, as outgoing calls might still work
      }
      
      // Set up automatic token refreshing every 10 minutes
      this.setupTokenRefresh();
      
      this.isInitialized = true;
      console.log("Twilio Device initialized successfully with Voice SDK 2.x");
      
      return true;
    } catch (error) {
      console.error("Error initializing Twilio Device:", error);
      return false;
    }
  }

  // Set up event listeners for the Twilio Device
  private setupDeviceEvents(): void {
    if (!this.device) return;
    
    // Voice SDK 2.x uses event emitter pattern
    this.device.on('registered', () => {
      console.log("Twilio Device is registered and ready for calls");
    });
    
    this.device.on('error', (error: any) => {
      // Handle different types of Twilio errors
      if (error.code === 31005) {
        // This is a normal hangup error, just log it
        console.log("Normal connection closure from Twilio gateway (31005)");
      } else {
        console.error("Twilio Device error:", error);
        
        // If we get a token error, try to refresh the token
        if (error.code === 31102 || error.message?.includes('token')) {
          console.log("Token error detected, attempting to refresh token");
          this.refreshToken();
        }
        
        // Notify any registered error handlers
        this.errorHandlers.forEach(handler => {
          try {
            handler(error);
          } catch (handlerError) {
            console.error("Error in Twilio error handler:", handlerError);
          }
        });
      }
    });
    
    this.device.on('incoming', (call: any) => {
      console.log("Incoming call from:", call.parameters.From);
      
      // Add error handler to the incoming call
      call.on('error', (callError: any) => {
        if (callError.code === 31005) {
          // This is a normal hangup error, just log it
          console.log("Normal call disconnect from Twilio gateway (31005)");
        } else {
          console.error("Twilio call error:", callError);
          
          // Notify any registered error handlers
          this.errorHandlers.forEach(handler => {
            try {
              handler(callError);
            } catch (handlerError) {
              console.error("Error in Twilio call error handler:", handlerError);
            }
          });
        }
      });
    });
    
    this.device.on('unregistered', () => {
      console.log("Twilio Device is unregistered");
      this.isInitialized = false;
    });
    
    this.device.on('destroyed', () => {
      console.log("Twilio Device has been destroyed");
      this.isInitialized = false;
    });
    
    // Add enhanced audio event handlers
    this.device.on('registered', () => {
      console.log("Audio is ready for the device");
      // Apply the selected audio device if we have one
      if (this.currentAudioDeviceId) {
        twilioAudioService.setSpeakerDevice(this.currentAudioDeviceId);
      }
    });
  }

  // Register a handler for Twilio errors
  public addErrorHandler(handler: (error: any) => void): void {
    this.errorHandlers.push(handler);
  }

  // Remove an error handler
  public removeErrorHandler(handler: (error: any) => void): void {
    const index = this.errorHandlers.indexOf(handler);
    if (index !== -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  // Set up automatic token refreshing
  private setupTokenRefresh(): void {
    // Clear any existing interval
    if (this.tokenRefreshInterval) {
      window.clearInterval(this.tokenRefreshInterval);
    }
    
    // Refresh token every 10 minutes
    // Twilio tokens typically last for 1 hour, so refreshing every 10 minutes gives us plenty of buffer
    this.tokenRefreshInterval = window.setInterval(() => {
      console.log("Automatic token refresh triggered");
      this.refreshToken();
    }, 10 * 60 * 1000); // 10 minutes
  }

  // Fetch a new token from the server
  private async fetchToken(): Promise<{ token: string; identity: string; } | null> {
    try {
      console.log("Fetching fresh Twilio token...");
      
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          timestamp: new Date().toISOString(),
          refreshRequest: true,
          authorization: `Bearer ${this.token || ''}` 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.token) {
        console.error("No token received from server", data);
        return null;
      }
      
      console.log("Successfully received new token:", data.token.substring(0, 10) + "...");
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
      try {
        console.log("Updating device with new token");
        this.device.updateToken(this.token);
        return true;
      } catch (err) {
        console.error("Error updating device token:", err);
        
        // If updating the token fails, try to reinitialize the device
        console.log("Attempting to reinitialize device with new token");
        return this.initializeTwilioDevice();
      }
    }
    
    return false;
  }

  // Initialize audio context and get microphone access
  async initializeAudioContext(): Promise<boolean> {
    if (this.isAudioContextInitialized) {
      return true;
    }
    
    try {
      // Request microphone access with enhanced audio quality settings
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });
      
      // Stop tracks immediately, we just needed the permission
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
      
      this.isAudioContextInitialized = true;
      
      // Get available audio output devices using the audio service
      await this.getAudioOutputDevices();
      
      return true;
    } catch (error) {
      console.error("Error initializing audio context:", error);
      return false;
    }
  }

  // Check if the microphone is active
  isMicrophoneActive(): boolean {
    return this.isAudioContextInitialized;
  }

  // Get current audio device
  getCurrentAudioDevice(): string {
    return this.currentAudioDeviceId;
  }

  // Make a call using the Twilio device
  async makeCall(phoneNumber: string): Promise<{ success: boolean; callSid?: string; error?: string }> {
    try {
      if (!this.device) {
        console.error("Twilio device not initialized");
        const deviceInitialized = await this.initializeTwilioDevice();
        
        if (!deviceInitialized) {
          return { success: false, error: "Failed to initialize Twilio device" };
        }
      }
      
      // Check if we already have an active call
      if (this.call) {
        console.warn("Call already in progress");
        return { success: false, error: "Call already in progress" };
      }
      
      // Ensure we have microphone access
      if (!this.isAudioContextInitialized) {
        const micAccess = await this.initializeAudioContext();
        if (!micAccess) {
          return { success: false, error: "Failed to access microphone" };
        }
      }
      
      // Make the call using the Twilio device
      try {
        console.log(`Making call to ${phoneNumber}`);
        
        // Add the country code if not present and not a test number
        let formattedNumber = phoneNumber;
        if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('client:') && phoneNumber !== 'test') {
          formattedNumber = '+' + phoneNumber.replace(/\D/g, '');
        }
        
        // Connect with the formatted number
        this.call = await this.device.connect({
          params: {
            To: formattedNumber,
            useStream: 'true', // Enable bidirectional audio stream
            streamWebhookUrl: 'wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream'
          }
        });
        
        console.log("Call connected:", this.call);
        this.hasActiveCall = true;
        
        // Handle call events
        this.call.on('accept', () => {
          console.log("Call accepted");
        });
        
        this.call.on('disconnect', () => {
          console.log("Call disconnected - cleaning up audio resources");
          this.call = null;
          this.hasActiveCall = false;
        });
        
        // Handle call errors - filter out normal 31005 errors
        this.call.on('error', (callError: any) => {
          if (callError.code === 31005) {
            console.log("Normal call hangup from gateway");
          } else {
            console.error("Call error:", callError);
            
            // Notify any registered error handlers
            this.errorHandlers.forEach(handler => {
              try {
                handler(callError);
              } catch (handlerError) {
                console.error("Error in call error handler:", handlerError);
              }
            });
          }
        });
        
        // Return the call SID if available
        return { 
          success: true, 
          callSid: this.call.parameters.CallSid || 'pending-sid'
        };
      } catch (callError: any) {
        console.error("Error making call:", callError);
        return { 
          success: false, 
          error: callError.message || "Failed to initiate call" 
        };
      }
    } catch (error: any) {
      console.error("Error in makeCall:", error);
      return { success: false, error: error.message || "Unknown error making call" };
    }
  }

  // Toggle mute
  toggleMute(mute: boolean): boolean {
    try {
      if (this.call) {
        // Voice SDK 2.x muting
        this.call.mute(mute);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error toggling mute:", error);
      return false;
    }
  }

  // Toggle speaker mode
  toggleSpeaker(speakerOn: boolean): boolean {
    try {
      // In browser context, "speaker mode" typically means changing the audio output device
      // to either the default speakers or a specifically designated speaker device
      
      // If we have the twilioAudioService and the device is initialized
      if (twilioAudioService && this.device) {
        // We'll handle this asynchronously but return success immediately
        // since the toggleSpeaker method is expected to return a boolean
        this.toggleSpeakerAsync(speakerOn);
        return true;
      }
      
      console.log("Unable to toggle speaker mode - audio service not initialized");
      return false;
    } catch (error) {
      console.error("Error toggling speaker:", error);
      return false;
    }
  }
  
  // Private async method to handle the speaker toggle
  private async toggleSpeakerAsync(speakerOn: boolean): Promise<void> {
    try {
      if (!twilioAudioService || !this.device) return;
      
      // Get currently available output devices
      const outputDevices = await twilioAudioService.getOutputDevices();
      
      if (outputDevices && outputDevices.length > 0) {
        // If speaker is turned on, try to find a device labeled as "speaker" or use default
        if (speakerOn) {
          // Look for a device that might be a speaker (contains "speaker" or "output" in the name)
          const speakerDevice = outputDevices.find(device => 
            device.label.toLowerCase().includes('speaker') || 
            device.label.toLowerCase().includes('output')
          );
          
          // If found a speaker device, use it, otherwise use default
          const deviceId = speakerDevice ? speakerDevice.deviceId : 'default';
          await twilioAudioService.setSpeakerDevice(deviceId);
          console.log(`Speaker mode ON: set to device ${deviceId}`);
        } else {
          // If speaker is turned off, try to find a device that might be headphones
          const headphoneDevice = outputDevices.find(device => 
            device.label.toLowerCase().includes('headphone') || 
            device.label.toLowerCase().includes('earphone') ||
            device.label.toLowerCase().includes('headset')
          );
          
          // If found headphones, use them, otherwise use default
          const deviceId = headphoneDevice ? headphoneDevice.deviceId : 'default';
          await twilioAudioService.setSpeakerDevice(deviceId);
          console.log(`Speaker mode OFF: set to device ${deviceId}`);
        }
      } else {
        console.log("No audio output devices available for speaker toggle");
      }
    } catch (error) {
      console.error("Error in toggleSpeakerAsync:", error);
    }
  }

  // End the active call
  async endCall(): Promise<boolean> {
    if (!this.call) {
      console.log("No active call to end");
      return true; // No call to end is technically success
    }
    
    try {
      console.log("Ending active call");
      this.call.disconnect();
      this.call = null;
      this.hasActiveCall = false;
      return true;
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
    
    // Map Voice SDK 2.x call status to our status format
    switch (status) {
      case 'pending':
        return 'connecting';
      case 'connecting':
        return 'connecting';
      case 'ringing':
        return 'connecting';
      case 'open':
        return 'in-progress';
      case 'closed':
        return 'completed';
      default:
        return status;
    }
  }

  // Get available audio output devices with enhanced logging
  async getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      // Use Twilio audio service if available
      if (twilioAudioService && this.device) {
        const devices = await twilioAudioService.getOutputDevices();
        this.audioOutputDevices = devices as MediaDeviceInfo[];
        
        console.log("Available audio output devices:", 
          this.audioOutputDevices.map(d => ({ 
            deviceId: d.deviceId, 
            label: d.label || 'Unlabeled device' 
          }))
        );
        
        // Set default device if not already set
        if (this.audioOutputDevices.length > 0 && !this.currentAudioDeviceId) {
          const defaultDevice = this.audioOutputDevices.find(d => d.deviceId === 'default') || this.audioOutputDevices[0];
          this.currentAudioDeviceId = defaultDevice.deviceId;
          console.log(`Selected default audio output device: ${defaultDevice.label || 'Unlabeled device'}`);
        }
        
        return this.audioOutputDevices;
      } else {
        // Fallback to browser API if Twilio is not initialized
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          console.error("MediaDevices API not supported");
          return [];
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
        
        console.log("Available audio output devices:", 
          this.audioOutputDevices.map(d => ({ 
            deviceId: d.deviceId, 
            label: d.label || 'Unlabeled device' 
          }))
        );
        
        // Set default device if not already set
        if (this.audioOutputDevices.length > 0 && !this.currentAudioDeviceId) {
          const defaultDevice = this.audioOutputDevices.find(d => d.deviceId === 'default') || this.audioOutputDevices[0];
          this.currentAudioDeviceId = defaultDevice.deviceId;
          console.log(`Selected default audio output device: ${defaultDevice.label || 'Unlabeled device'}`);
        }
        
        return this.audioOutputDevices;
      }
    } catch (error) {
      console.error("Error getting audio output devices:", error);
      return [];
    }
  }

  // Enhanced set audio output device with better error handling and logging
  async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    if (!deviceId) return false;
    
    try {
      console.log(`Setting audio output device to: ${deviceId}`);
      
      // Use Twilio audio service if available
      if (twilioAudioService && this.device) {
        const success = await twilioAudioService.setSpeakerDevice(deviceId);
        if (success) {
          this.currentAudioDeviceId = deviceId;
          return true;
        }
      }
      
      // Fallback to browser API
      const audio = new Audio();
      
      if ('setSinkId' in audio) {
        this.currentAudioDeviceId = deviceId;
        
        // If we have an active call, update it - different method in Voice SDK 2.x
        if (this.call) {
          console.log("Active call detected, updating output device for call audio");
          
          try {
            // Voice SDK 2.x handles audio output through the Device's audio object
            if (this.device && this.device.audio && this.device.audio.speakerDevices) {
              await this.device.audio.speakerDevices.set(deviceId);
              console.log("Updated call audio output to use device:", deviceId);
            }
          } catch (err) {
            console.error("Error setting audio device for call:", err);
          }
        }
        
        // Also update audio from any WebSocket connection or other audio elements
        const audioElements = document.querySelectorAll('audio');
        let updatedElements = 0;
        
        for (let i = 0; i < audioElements.length; i++) {
          const element = audioElements[i];
          if ('setSinkId' in element) {
            try {
              await (element as any).setSinkId(deviceId);
              updatedElements++;
            } catch (err) {
              console.warn(`Could not set sink ID for audio element ${i}:`, err);
            }
          }
        }
        
        console.log(`Updated ${updatedElements} audio elements to use device: ${deviceId}`);
        
        // Test the new audio device to confirm it works
        await this.testAudioOutput(deviceId);
        
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
  
  // Test audio output with enhanced error handling
  async testAudioOutput(deviceId?: string): Promise<boolean> {
    // Use Twilio audio service if available
    if (twilioAudioService && this.device) {
      return twilioAudioService.testSpeakerDevice(deviceId);
    }
    
    // Fallback to manual audio testing
    try {
      console.log(`Testing audio output${deviceId ? ` on device: ${deviceId}` : ''}`);
      
      // Try to use a preloaded audio element from our audioPreloader utility
      try {
        const { playAudio } = await import('@/utils/audioPreloader');
        const played = await playAudio('test-tone', 0.3);
        if (played) {
          console.log("Audio test successful using preloaded audio");
          return true;
        }
      } catch (preloadError) {
        console.warn("Could not use preloaded audio for testing:", preloadError);
      }
      
      // Fall back to direct audio element creation
      const audio = new Audio('/sounds/dialtone.mp3');
      
      // If no sound file is available, generate a test tone
      if (!audio.src || audio.src.includes('undefined')) {
        console.log("No test sound available, generating tone");
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.type = 'sine';
          oscillator.frequency.value = 440; // A4 note
          gainNode.gain.value = 0.3; // Lower volume
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.start();
          setTimeout(() => {
            oscillator.stop();
            audioContext.close();
          }, 1000);
          
          return true;
        } else {
          throw new Error("AudioContext not supported");
        }
      }
      
      if (deviceId && 'setSinkId' in audio) {
        await (audio as any).setSinkId(deviceId);
        console.log(`Audio sink set to device ID: ${deviceId}`);
      }
      
      audio.volume = 0.3;
      await audio.play();
      console.log("Test audio playback started");
      
      // Stop after 1 second
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        console.log("Test audio playback stopped");
      }, 1000);
      
      return true;
    } catch (error) {
      console.error("Error testing audio output:", error);
      return false;
    }
  }

  // Clean up resources when the service is no longer needed
  cleanup(): void {
    if (this.tokenRefreshInterval) {
      window.clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
    
    if (this.call) {
      try {
        this.call.disconnect();
      } catch (e) {
        console.warn("Error disconnecting call during cleanup:", e);
      }
      this.call = null;
    }
    
    if (this.device) {
      try {
        this.device.destroy();
      } catch (e) {
        console.warn("Error destroying device during cleanup:", e);
      }
      this.device = null;
    }
    
    if (this.microphoneStream) {
      try {
        this.microphoneStream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.warn("Error stopping microphone tracks during cleanup:", e);
      }
      this.microphoneStream = null;
    }
    
    this.isInitialized = false;
    this.isAudioContextInitialized = false;
  }
}

export const twilioService = new TwilioService();
