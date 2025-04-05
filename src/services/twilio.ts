// Importing any necessary dependencies
import { Device } from 'twilio-client';

class TwilioService {
  private device: Device | null = null;
  private connection: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private microphoneInitialized: boolean = false;
  private supabaseUrl: string = "https://imrmboyczebjlbnkgjns.supabase.co";
  
  async initializeAudioContext() {
    try {
      // Create audio context for microphone access
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContext();
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create analyzer to detect if microphone is active
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      // Connect microphone to analyzer
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      this.microphoneInitialized = true;
      console.log("Audio context initialized successfully");
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
    return dataArray.some(value => value > 0);
  }
  
  async initializeTwilioDevice() {
    try {
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
      
      // Set up the device
      this.device = new Device();
      
      // Set up event listeners
      this.device.on('ready', () => {
        console.log('Twilio device is ready');
      });
      
      this.device.on('error', (error) => {
        console.error('Twilio device error:', error);
      });
      
      this.device.on('connect', (conn) => {
        console.log('Call connected');
        this.connection = conn;
      });
      
      this.device.on('disconnect', () => {
        console.log('Call disconnected');
        this.connection = null;
      });
      
      // Initialize the device with the token
      await this.device.setup(data.token);
      
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
      
      // Method 1: Use Twilio Device in the browser if available
      if (this.device && this.device.status() === 'ready') {
        try {
          console.log("Using Twilio Device for browser-based calling");
          this.connection = await this.device.connect({
            To: formattedPhoneNumber
          });
          
          // Set up connection event listeners
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
          console.warn("Device connection failed, falling back to REST API call", deviceError);
        }
      }
      
      // Method 2: Fall back to Twilio REST API if browser Device is not available or fails
      console.log("Falling back to REST API for calling");
      
      // Call the twilio-voice function to make the call
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
      
      // Check if response is OK before trying to parse JSON
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
  }
}

export const twilioService = new TwilioService();
