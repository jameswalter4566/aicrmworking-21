// Importing any necessary dependencies
import { Device } from 'twilio-client';

// Define interface for audio chunks in the queue
interface AudioChunk {
  track: string;
  timestamp: number;
  payload: string;
}

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
  private audioElement: HTMLAudioElement | null = null;
  private socket: WebSocket | null = null;
  private audioQueue: AudioChunk[] = [];
  private isProcessingAudio: boolean = false;
  private audioBufferArray: Float32Array[] = [];
  private callActive: boolean = false;
  private dialToneSound: HTMLAudioElement | null = null;
  private ringingSound: HTMLAudioElement | null = null;
  private streamingActive: boolean = false;
  private keepAliveInterval: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  constructor() {
    // Create audio element for output testing and call sounds
    this.audioElement = document.createElement('audio');
    this.audioElement.autoplay = true;
    document.body.appendChild(this.audioElement);
    
    // Add hidden audio elements for call sounds
    this.createHiddenAudio('ringtone', '/sounds/ringtone.mp3');
    this.createHiddenAudio('outgoing', '/sounds/outgoing.mp3');
    this.createHiddenAudio('dialtone', '/sounds/dialtone.mp3');
    
    // Initialize dial tone for immediate feedback when calling
    this.dialToneSound = document.getElementById('dialtone') as HTMLAudioElement;
    this.ringingSound = document.getElementById('outgoing') as HTMLAudioElement;
    
    // Setup WebSocket connection for audio streaming
    this.setupAudioWebSocket();
  }
  
  private createHiddenAudio(id: string, src: string) {
    const audio = document.createElement('audio');
    audio.id = id;
    audio.src = src;
    audio.preload = 'auto';
    document.body.appendChild(audio);
  }
  
  private playSound(soundId: string) {
    const sound = document.getElementById(soundId) as HTMLAudioElement;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(err => console.warn(`Error playing ${soundId} sound:`, err));
    }
  }
  
  private stopSound(soundId: string) {
    const sound = document.getElementById(soundId) as HTMLAudioElement;
    if (sound && !sound.paused) {
      sound.pause();
      sound.currentTime = 0;
    }
  }
  
  // Set up WebSocket for call audio streaming
  private setupAudioWebSocket() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return this.socket;
    }

    try {
      // Connect to audio streaming WebSocket endpoint
      const wsUrl = `wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream`;
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log("WebSocket connection opened for audio streaming");
        this.reconnectAttempts = 0; // Reset reconnect attempts
        
        // Start keep-alive pings
        this.startKeepAlive();
        
        // Identify as browser client
        if (this.socket) {
          this.socket.send(JSON.stringify({
            event: 'browser_connect',
            clientType: 'browser'
          }));
        }
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different event types
          if (data.event === 'audio') {
            // Set streaming status to active
            this.streamingActive = true;
            
            // Add audio chunk to processing queue
            this.audioQueue.push({
              track: data.track,
              timestamp: data.timestamp,
              payload: data.payload
            });
            
            // Start processing queue if not already doing so
            if (!this.isProcessingAudio) {
              this.processAudioQueue();
            }
          } else if (data.event === 'streamStart') {
            console.log("Call audio stream started", data);
            // Stop ringing/dialtone when stream starts
            this.stopSound('ringtone');
            this.stopSound('outgoing');
            this.stopSound('dialtone');
            this.streamingActive = true;
          } else if (data.event === 'streamStop') {
            console.log("Call audio stream stopped", data);
            this.streamingActive = false;
          } else if (data.event === 'browser_connected' || data.event === 'connection_established') {
            console.log("WebSocket connection confirmed: ", data);
          } else if (data.event === 'pong') {
            // Keep-alive pong received (silent)
          }
        } catch (err) {
          console.error("Error processing WebSocket message:", err);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.streamingActive = false;
      };
      
      this.socket.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        this.streamingActive = false;
        this.stopKeepAlive();
        
        // Attempt to reconnect if not closed intentionally
        if (this.callActive && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect WebSocket (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.setupAudioWebSocket(), 2000);
        }
        
        this.socket = null;
      };
      
      return this.socket;
    } catch (err) {
      console.error("Failed to set up WebSocket:", err);
      this.streamingActive = false;
      return null;
    }
  }
  
  // Keep the WebSocket connection alive with pings
  private startKeepAlive() {
    this.stopKeepAlive(); // Clear any existing interval
    
    this.keepAliveInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          event: 'ping',
          timestamp: Date.now()
        }));
      }
    }, 30000); // Send ping every 30 seconds
  }
  
  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }
  
  // Process audio chunks in the queue
  private async processAudioQueue() {
    if (!this.audioQueue.length || this.isProcessingAudio || !this.audioContext) {
      return;
    }
    
    this.isProcessingAudio = true;
    
    try {
      // Take a chunk from the queue
      const chunk = this.audioQueue.shift();
      
      if (chunk) {
        // Convert base64 to array buffer
        const audioData = this.base64ToArrayBuffer(chunk.payload);
        
        // Create audio buffer
        const audioBuffer = await this.createAudioBufferFromPCM(audioData);
        
        if (audioBuffer) {
          // Play the audio
          const source = this.audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(this.audioContext.destination);
          source.start();
          
          // Wait for audio to finish playing
          await new Promise<void>((resolve) => {
            source.onended = () => resolve();
            // Failsafe timeout - if onended doesn't fire
            setTimeout(() => resolve(), 500);
          });
        }
      }
    } catch (err) {
      console.error("Error processing audio queue:", err);
    } finally {
      this.isProcessingAudio = false;
      
      // If we have more chunks, continue processing
      if (this.audioQueue.length > 0) {
        this.processAudioQueue();
      }
    }
  }
  
  // Convert base64 to array buffer
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  
  // Create audio buffer from PCM data
  private async createAudioBufferFromPCM(pcmData: Uint8Array): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      console.error("AudioContext not initialized");
      return null;
    }
    
    try {
      // Convert PCM data to 16-bit samples
      const samples = new Int16Array(pcmData.buffer);
      const audioBuffer = this.audioContext.createBuffer(1, samples.length, 8000);
      const channelData = audioBuffer.getChannelData(0);
      
      // Convert Int16 to Float32 (WebAudio format)
      for (let i = 0; i < samples.length; i++) {
        channelData[i] = samples[i] / 32768;
      }
      
      return audioBuffer;
    } catch (err) {
      console.error("Error creating audio buffer:", err);
      return null;
    }
  }
  
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
      
      // Play a test tone to kickstart audio context
      await this.testAudioOutput();
      
      // Initialize WebSocket for audio streaming
      this.setupAudioWebSocket();
      
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
    
    return hasAudioSignal;
  }
  
  isStreamingActive() {
    return this.streamingActive;
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
      // Fetch token from backend - CRITICAL: NO AUTH HEADERS
      const response = await fetch(`${this.supabaseUrl}/functions/v1/twilio-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // IMPORTANT: NO Authorization headers - this causes 401 errors!
        },
        body: JSON.stringify({ action: 'getToken' })
      });
      
      // Check response
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching token: ${response.status} - ${errorText}`);
        return false;
      }
      
      const data = await response.json();
      console.log("Token response:", data);
      
      if (!data.token) {
        console.error('Failed to get Twilio token - no token in response');
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
      
      // Create simplified device options with focus on audio
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
        // Play a short confirmation sound when device is ready
        this.playSound('outgoing');
      });
      
      this.device.on('error', (error) => {
        console.error('Twilio device error:', error);
      });
      
      this.device.on('connect', (conn) => {
        console.log('Call connected - audio channels established');
        this.connection = conn;
        this.callActive = true;
        
        // Force unmute to ensure audio is flowing
        try {
          conn.mute(false);
        } catch (e) {
          console.warn('Could not unmute connection:', e);
        }
        
        // Ensure audio input and output are working
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().then(() => {
            console.log('Audio context resumed for active call');
          });
        }
        
        // Stop all feedback sounds when call connects
        this.stopSound('ringtone');
        this.stopSound('outgoing');
        this.stopSound('dialtone');
        
        // Monitor incoming and outgoing audio
        conn.volume((inputVolume: number, outputVolume: number) => {
          console.log(`Audio levels - Input: ${inputVolume.toFixed(2)}, Output: ${outputVolume.toFixed(2)}`);
          
          if (outputVolume < 0.01) {
            console.warn('Very low or no incoming audio detected');
          }
        });
        
        conn.on('warning', (warning: any) => {
          console.warn('Connection warning:', warning.message);
        });
      });
      
      this.device.on('disconnect', () => {
        console.log('Call disconnected - audio channels closed');
        this.connection = null;
        this.callActive = false;
        
        // Stop all feedback sounds when call disconnects
        this.stopSound('ringtone');
        this.stopSound('outgoing');
        this.stopSound('dialtone');
      });
      
      // Log additional debug information
      this.device.on('offline', () => {
        console.log('Twilio device is offline');
      });
      
      this.device.on('incoming', (conn: any) => {
        console.log('Incoming call detected');
        this.playSound('ringtone');
      });
      
      // Initialize the device with the token
      await this.device.setup(data.token, deviceOptions as any);
      
      // Play a startup sound to verify audio works
      await this.testAudioOutput();
      
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
      
      // Play a dialing sound to indicate call is starting
      this.playSound('dialtone');
      
      // Ensure WebSocket is connected for audio streaming
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        this.setupAudioWebSocket();
      }
      
      // Clear any previous audio queue
      this.audioQueue = [];
      
      // CRITICAL CHANGE: Always use the Twilio Device in browser to make the call
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
        
        // Connect to Twilio with enhanced logging
        console.log("Connecting with phone number:", formattedPhoneNumber);
        
        // Use the Twilio Device to make the call (BROWSER-INITIATED CALL)
        this.connection = await this.device.connect({
          To: formattedPhoneNumber
        });
        
        console.log("Call connection established:", this.connection?.parameters);
        this.callActive = true;
        
        // Start monitoring for streaming status
        setTimeout(() => {
          if (!this.streamingActive && this.callActive) {
            console.log("No audio stream detected - making fallback API call to enable streaming");
            
            // Send fallback request to ensure media streaming is enabled
            fetch(`${this.supabaseUrl}/functions/v1/twilio-voice`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'enableStreaming',
                callSid: this.connection?.parameters?.CallSid
              })
            }).catch(err => console.error("Error in fallback streaming request:", err));
          }
        }, 5000); // Check after 5 seconds
        
        // Set up connection event listeners for audio monitoring
        this.connection.on('volume', (inputVol: number, outputVol: number) => {
          if (outputVol > 0.01) {
            console.log(`AUDIO ACTIVE - Input: ${inputVol.toFixed(2)}, Output: ${outputVol.toFixed(2)}`);
          }
        });
        
        this.connection.on('warning', (warning: any) => {
          console.warn('Connection warning:', warning.message);
        });
        
        this.connection.on('disconnect', () => {
          this.connection = null;
          this.callActive = false;
          this.streamingActive = false;
          console.log('Call ended');
        });
        
        return { 
          success: true, 
          callSid: this.connection.parameters.CallSid,
          usingBrowser: true 
        };
      } catch (deviceError) {
        console.error("Browser connection failed, details:", deviceError);
        return { success: false, error: deviceError.message || "Failed to connect call" };
      }
    } catch (error: any) {
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
        this.callActive = false;
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
    
    // Close WebSocket if open
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
      this.socket = null;
    }
    
    // Remove audio elements
    if (this.audioElement) {
      document.body.removeChild(this.audioElement);
      this.audioElement = null;
    }
    
    const soundIds = ['ringtone', 'outgoing', 'dialtone'];
    soundIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) document.body.removeChild(element);
    });
    
    this.callActive = false;
    this.audioQueue = [];
  }
  
  // Improved audio test function to kickstart audio
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
        
        // Stop after 500ms - just enough to test but not disruptive
        setTimeout(() => {
          oscillator.stop();
          oscillator.disconnect();
          gainNode.disconnect();
          console.log("Test tone complete");
        }, 500);
        
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
