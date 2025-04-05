// Importing any necessary dependencies
import { Device } from 'twilio-client';

class TwilioService {
  private device: Device | null = null;
  private connection: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private microphoneInitialized: boolean = false;
  private audioOutputInitialized: boolean = false;
  private supabaseUrl: string = "https://imrmboyczebjlbnkgjns.supabase.co";
  private audioStream: MediaStream | null = null;
  
  async initializeAudioContext() {
    try {
      // Create audio context for microphone access
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContext();
      
      console.log("Requesting microphone access...");
      // Request microphone access with specific constraints for better audio quality
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Store the stream for later use
      this.audioStream = stream;
      
      // Create analyzer to detect if microphone is active
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      // Connect microphone to analyzer
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      this.microphoneInitialized = true;
      console.log("Audio context initialized successfully with enhanced audio settings");
      
      // Check if audio output is available
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        
        if (audioOutputs.length > 0) {
          console.log(`Audio output devices available: ${audioOutputs.length}`);
          audioOutputs.forEach(device => {
            console.log(`- ${device.label || 'Unnamed device'} (${device.deviceId})`);
          });
          this.audioOutputInitialized = true;
        } else {
          console.warn("No audio output devices detected!");
        }
      } catch (outputError) {
        console.warn("Could not enumerate audio output devices:", outputError);
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing audio context:', error);
      this.microphoneInitialized = false;
      return false;
    }
  }
  
  isMicrophoneActive() {
    if (!this.analyser || !this.microphoneInitialized) return false;
    
    // Check if microphone is actually capturing audio
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    // If any frequency is above threshold, microphone is active
    const hasAudioSignal = dataArray.some(value => value > 5); // Slightly higher threshold to avoid background noise
    
    if (!hasAudioSignal) {
      console.log("No audio signal detected from microphone");
    }
    
    return hasAudioSignal;
  }
  
  async initializeTwilioDevice() {
    try {
      // Ensure audio is initialized first
      if (!this.microphoneInitialized) {
        const audioInitialized = await this.initializeAudioContext();
        if (!audioInitialized) {
          console.error("Failed to initialize audio context, cannot proceed with Twilio setup");
          return false;
        }
      }
      
      console.log("Fetching Twilio token...");
      // Fetch token from your backend
      const response = await fetch(`${this.supabaseUrl}/functions/v1/twilio-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'getToken' })
      });
      
      const data = await response.json();
      
      if (!data.token) {
        throw new Error('Failed to get Twilio token');
      }
      
      console.log("Twilio token received, initializing device");
      
      // Clean up any existing device first
      if (this.device) {
        console.log("Destroying existing Twilio device");
        this.device.destroy();
        this.device = null;
      }
      
      // Set up the device with audio settings
      this.device = new Device();
      
      // Create simplified device options
      const deviceOptions = {
        debug: true,
        enableRingtone: true,
        incomingSoundVolume: 1.0,  // Maximum volume for incoming audio
        outgoingSoundVolume: 1.0,  // Maximum volume for outgoing audio
        warnings: true,            // Enable warnings for debugging
        sounds: {                  // Set custom sounds paths if needed
          incoming: '/sounds/incoming.mp3',
          outgoing: '/sounds/outgoing.mp3'
        }
      };
      
      // Set up event listeners
      this.device.on('ready', () => {
        console.log('Twilio device is ready for audio I/O');
      });
      
      this.device.on('error', (error) => {
        console.error('Twilio device error:', error);
      });
      
      this.device.on('connect', (conn) => {
        console.log('Call connected - audio channels established');
        this.connection = conn;
        
        // Ensure audio input and output are working
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().then(() => {
            console.log('Audio context resumed for active call');
          });
        }
        
        // Monitor incoming and outgoing audio
        conn.volume((inputVolume, outputVolume) => {
          console.log(`Audio levels - Input: ${inputVolume.toFixed(2)}, Output: ${outputVolume.toFixed(2)}`);
          
          if (outputVolume < 0.01) {
            console.warn('Very low or no incoming audio detected');
          }
        });
      });
      
      this.device.on('disconnect', () => {
        console.log('Call disconnected - audio channels closed');
        this.connection = null;
      });
      
      // Log additional debug information
      this.device.on('offline', () => {
        console.log('Twilio device is offline');
      });
      
      this.device.on('incoming', (conn) => {
        console.log('Incoming call detected');
      });
      
      // Initialize the device with the token - using as any to bypass type errors
      console.log("Setting up Twilio device with token");
      await this.device.setup(data.token, deviceOptions as any);
      
      return true;
    } catch (error) {
      console.error('Error initializing Twilio device:', error);
      return false;
    }
  }
  
  private normalizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Ensure it has country code (assuming US/North America if none)
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    } else if (digitsOnly.length > 10 && !digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    } else if (digitsOnly.length > 10 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }
    
    // If we can't normalize it properly, at least add a plus
    return digitsOnly ? `+${digitsOnly}` : '';
  }
  
  async makeCall(phoneNumber: string) {
    try {
      console.log(`Making Twilio call to ${phoneNumber}`);
      
      if (!phoneNumber) {
        console.error("Phone number is required");
        return { success: false, error: "Phone number is required" };
      }
      
      // Format phone number using our normalizer
      const formattedPhoneNumber = this.normalizePhoneNumber(phoneNumber);
      
      if (!formattedPhoneNumber) {
        console.error("Invalid phone number format");
        return { success: false, error: "Invalid phone number format" };
      }
      
      // Check if the device is ready, if not try to re-initialize
      if (!this.device || this.device.status() !== 'ready') {
        console.log("Twilio device not ready, attempting to initialize...");
        const initialized = await this.initializeTwilioDevice();
        if (!initialized) {
          return { success: false, error: "Failed to initialize Twilio device" };
        }
      }
      
      // Try using browser audio first
      if (this.device) {
        try {
          console.log("Using Twilio Device for browser-based calling");
          
          // Resume audio context if suspended
          if (this.audioContext && this.audioContext.state !== 'running') {
            console.log("Resuming audio context...");
            await this.audioContext.resume();
            console.log("Audio context state after resume:", this.audioContext.state);
          }
          
          // Double check microphone stream is active
          if (!this.audioStream || !this.audioStream.active) {
            console.log("Audio stream inactive, requesting new microphone access");
            try {
              this.audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
                } 
              });
            } catch (micError) {
              console.error("Could not access microphone:", micError);
            }
          }
          
          // Connect to Twilio with enhanced logging - Fixed connection parameters format
          console.log("Connecting with phone number:", formattedPhoneNumber);
          
          // Fix: Update the connect method call to match the expected API signature
          // The device.connect() method expects a plain object or a function handler
          this.connection = await this.device.connect({
            To: formattedPhoneNumber  // This is sent as a parameter to your TwiML endpoint
          });
          
          console.log("Call connection established:", this.connection.parameters);
          
          // Set up connection event listeners for audio monitoring
          this.connection.on('volume', (inputVol, outputVol) => {
            if (outputVol > 0.01) {
              console.log(`AUDIO ACTIVE - Input: ${inputVol.toFixed(2)}, Output: ${outputVol.toFixed(2)}`);
            }
          });
          
          this.connection.on('warning', (warning) => {
            console.warn('Connection warning:', warning.message);
            // Try to recover from warnings when possible
            if (warning.message.includes('audio input')) {
              this.initializeAudioContext().then(success => {
                console.log("Attempted to reinitialize audio after warning:", success);
              });
            }
          });
          
          this.connection.on('disconnect', () => {
            this.connection = null;
            console.log('Call ended');
          });
          
          return { 
            success: true, 
            callSid: this.connection.parameters.CallSid,
            usingBrowser: true 
          };
        } catch (deviceError) {
          console.warn("Browser connection failed, details:", deviceError);
          console.warn("Falling back to REST API call");
        }
      }
      
      // Fall back to Twilio REST API if browser Device fails
      console.log("Making call via REST API");
      
      const response = await fetch(`${this.supabaseUrl}/functions/v1/twilio-voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'makeCall',
          phoneNumber: formattedPhoneNumber
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error:", errorText);
        return { success: false, error: `Server returned ${response.status}: ${errorText}` };
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.error("Failed to make call:", result.error);
        return { success: false, error: result.error || "Failed to make call" };
      }
      
      return { success: true, callSid: result.callSid, usingBrowser: false };
    } catch (error) {
      console.error('Error making call:', error);
      return { success: false, error: error.message || "An unknown error occurred" };
    }
  }
  
  async checkCallStatus(callSid: string) {
    try {
      // If we have an active browser connection, use that status
      if (this.connection && this.connection.parameters.CallSid === callSid) {
        return this.connection.status();
      }
      
      // Otherwise check the status via the API
      const response = await fetch(`${this.supabaseUrl}/functions/v1/twilio-voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'checkStatus',
          callSid: callSid
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        return 'unknown';
      }
      
      return result.status;
    } catch (error) {
      console.error('Error checking call status:', error);
      return 'unknown';
    }
  }
  
  async endCall() {
    try {
      // End the browser-based call if active
      if (this.connection) {
        this.connection.disconnect();
        this.connection = null;
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Error ending call:', error);
      return false;
    }
  }
  
  toggleMute(mute: boolean) {
    try {
      if (this.connection) {
        if (mute) {
          this.connection.mute();
        } else {
          this.connection.unmute();
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling mute:', error);
      return false;
    }
  }
  
  toggleSpeaker(speakerOn: boolean) {
    try {
      // This is only relevant for mobile browsers that support audio output selection
      if (this.connection && typeof this.connection.setSinkId === 'function') {
        const sinkId = speakerOn ? 'speaker' : 'earpiece'; 
        this.connection.setSinkId(sinkId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling speaker:', error);  
      return false;
    }
  }
  
  cleanup() {
    // Clean up resources when component unmounts
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
    }
    
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Close audio stream tracks
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
  }
  
  // New method to test audio output
  async testAudioOutput() {
    try {
      if (!this.audioContext) {
        await this.initializeAudioContext();
      }
      
      if (this.audioContext) {
        // Create a simple oscillator to test audio output
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4 note
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime); // Low volume
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        console.log("Playing test tone...");
        
        // Stop after 1 second
        setTimeout(() => {
          oscillator.stop();
          oscillator.disconnect();
          gainNode.disconnect();
          console.log("Test tone complete");
        }, 1000);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error testing audio output:", error);
      return false;
    }
  }
}

export const twilioService = new TwilioService();
