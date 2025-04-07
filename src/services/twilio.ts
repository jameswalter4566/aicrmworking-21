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

  // Initialize the Twilio device with enhanced options for Voice SDK 2.x
  async initializeTwilioDevice(): Promise<boolean> {
    try {
      console.log("Initializing Twilio Voice SDK Device...");
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

      // Create a new Twilio.Device with Voice SDK 2.x options
      this.device = new window.Twilio.Device(this.token, {
        // Voice SDK 2.x options
        codecPreferences: ['opus', 'pcmu'],
        enableRingingState: true,
        debug: true,
        // Audio constraints 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Set up event listeners with Voice SDK 2.x syntax
      this.setupDeviceEvents();
      
      // Initialize audio service
      twilioAudioService.initialize(this.device);
      
      // Register to receive incoming calls
      this.device.register();
      
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
      console.error("Twilio Device error:", error);
    });
    
    this.device.on('incoming', (call: any) => {
      console.log("Incoming call from:", call.parameters.From);
    });
    
    this.device.on('unregistered', () => {
      console.log("Twilio Device is offline");
      this.isInitialized = false;
    });
    
    this.device.on('tokenWillExpire', () => {
      console.log("Token will expire soon, refreshing...");
      this.refreshToken();
    });
    
    // Add enhanced audio event handlers
    this.device.on('ready', () => {
      console.log("Audio is ready for the device");
      // Apply the selected audio device if we have one
      if (this.currentAudioDeviceId) {
        twilioAudioService.setSpeakerDevice(this.currentAudioDeviceId);
      }
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
            // Voice SDK 2.x uses different method to set audio device
            if (typeof this.call.setOutputDevice === 'function') {
              await this.call.setOutputDevice(deviceId);
              console.log("Updated call audio to use device:", deviceId);
            }
            // Fallback to direct manipulation of audio elements
            else if (this.call._mediaHandler && this.call._mediaHandler._remoteStream) {
              const audioEl = this.call._mediaHandler._remoteStream.audio;
              if (audioEl && audioEl._element && 'setSinkId' in audioEl._element) {
                await audioEl._element.setSinkId(deviceId);
                console.log("Updated call audio element to use device:", deviceId);
              }
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
      
      const audio = new Audio('/sounds/dialtone.mp3');
      
      // If no sound file is available, generate a test tone
      if (!audio.src || audio.src.includes('undefined')) {
        console.log("No test sound available, generating tone");
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  // Make a call using Twilio Voice SDK 2.x
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
      }
      
      // Try to use the Twilio Device for in-browser calling if available
      if (this.isInitialized && this.device) {
        console.log(`Making browser call to ${phoneNumber} with Voice SDK 2.x`);
        
        try {
          // Voice SDK 2.x connect params 
          const params = {
            To: phoneNumber,
            // These parameters will be available in the TwiML app
            useStream: 'true',
            streamWebhookUrl: 'wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream'
          };
          
          // Voice SDK 2.x connect method
          this.call = await this.device.connect({ params });
          
          // Set up call event handlers with Voice SDK 2.x events
          this.call.on('accept', () => {
            console.log('Call accepted - setting up audio channels');
            this.hasActiveCall = true;
            
            // Set the audio output device for this call if we have one selected
            if (this.currentAudioDeviceId) {
              setTimeout(() => {
                twilioAudioService.setSpeakerDevice(this.currentAudioDeviceId);
              }, 500);
            }
          });
          
          this.call.on('disconnect', () => {
            console.log('Call disconnected - cleaning up audio resources');
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
    
    // Map Voice SDK 2.x call status to our status format
    switch (status) {
      case 'pending':
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

  // Toggle mute
  toggleMute(mute: boolean): boolean {
    try {
      if (this.call) {
        // Voice SDK 2.x uses mute() method with parameter
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
        // Get currently available output devices
        const outputDevices = twilioAudioService.getOutputDevices();
        
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
            twilioAudioService.setSpeakerDevice(deviceId);
            console.log(`Speaker mode ON: set to device ${deviceId}`);
            return true;
          } else {
            // If speaker is turned off, try to find a device that might be headphones
            const headphoneDevice = outputDevices.find(device => 
              device.label.toLowerCase().includes('headphone') || 
              device.label.toLowerCase().includes('earphone') ||
              device.label.toLowerCase().includes('headset')
            );
            
            // If found headphones, use them, otherwise use default
            const deviceId = headphoneDevice ? headphoneDevice.deviceId : 'default';
            twilioAudioService.setSpeakerDevice(deviceId);
            console.log(`Speaker mode OFF: set to device ${deviceId}`);
            return true;
          }
        } else {
          console.log("No audio output devices available for speaker toggle");
          return false;
        }
      }
      
      console.log("Unable to toggle speaker mode - audio service not initialized");
      return false;
    } catch (error) {
      console.error("Error toggling speaker:", error);
      return false;
    }
  }

  // Check if microphone is active
  isMicrophoneActive(): boolean {
    return this.isAudioContextInitialized;
  }

  // Clean up resources
  cleanup(): void {
    if (this.device) {
      // Clean up audio service first
      twilioAudioService.cleanup();
      
      // Voice SDK 2.x uses destroy() method
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

  // Get current audio device
  getCurrentAudioDevice(): string {
    return this.currentAudioDeviceId;
  }
}

export const twilioService = new TwilioService();
