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
  private currentAudioOutputDevice: string = 'default';
  
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
    
    // Initialize AudioContext for better browser compatibility
    this.initializeAudioContext().catch(err => {
      console.warn("Initial audio context setup failed:", err);
    });
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
      const wsUrl = `wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream`;
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log("WebSocket connection opened for audio streaming");
        this.startKeepAlive();
        
        if (this.socket) {
          this.socket.send(JSON.stringify({
            event: 'browser_connect',
            clientType: 'browser'
          }));
        }
      };
      
      this.socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === 'audio') {
            this.streamingActive = true;
            
            if (!this.audioContext) {
              await this.initializeAudioContext();
            }

            // Convert base64 audio data to array buffer
            const audioData = this.base64ToArrayBuffer(data.payload);
            const audioBuffer = await this.createAudioBufferFromPCM(audioData);
            
            if (audioBuffer && this.audioContext) {
              const source = this.audioContext.createBufferSource();
              source.buffer = audioBuffer;
              
              const gainNode = this.audioContext.createGain();
              gainNode.gain.value = 1.0;
              
              source.connect(gainNode);
              gainNode.connect(this.audioContext.destination);
              
              source.start();
            }
          } else if (data.event === 'streamStart') {
            console.log("Call audio stream started", data);
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
    if (!this.audioQueue.length) {
      this.isProcessingAudio = false;
      return;
    }
    
    this.isProcessingAudio = true;
    
    try {
      const chunk = this.audioQueue.shift();
      
      if (chunk && this.audioContext) {
        const audioData = this.base64ToArrayBuffer(chunk.payload);
        const audioBuffer = await this.createAudioBufferFromPCM(audioData);
        
        if (audioBuffer) {
          console.log(`Playing audio buffer - Duration: ${audioBuffer.duration.toFixed(2)}s`);
          
          const source = this.audioContext.createBufferSource();
          source.buffer = audioBuffer;
          
          const gainNode = this.audioContext.createGain();
          gainNode.gain.value = 1.0;
          
          source.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          
          source.start();
          
          await new Promise<void>((resolve) => {
            source.onended = () => resolve();
            setTimeout(() => resolve(), audioBuffer.duration * 1000 + 100);
          });
          
          console.log("Audio chunk finished playing");
        } else {
          console.error("Failed to create audio buffer");
        }
      }
    } catch (err) {
      console.error("Error processing audio queue:", err);
    } finally {
      if (this.audioQueue.length > 0) {
        this.processAudioQueue();
      } else {
        this.isProcessingAudio = false;
      }
    }
  }
  
  // Convert base64 to array buffer
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  
  // Create audio buffer from PCM data - CRITICAL FUNCTION FOR AUDIO PLAYBACK
  private async createAudioBufferFromPCM(pcmData: Uint8Array): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      console.error("AudioContext not initialized");
      await this.initializeAudioContext();
      if (!this.audioContext) {
        return null;
      }
    }
    
    try {
      const samples = new Int16Array(pcmData.buffer);
      
      const sampleRate = 8000;
      const audioBuffer = this.audioContext.createBuffer(1, samples.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      
      for (let i = 0; i < samples.length; i++) {
        channelData[i] = samples[i] / 32768;
      }
      
      console.log(`Created audio buffer: ${samples.length} samples, ${sampleRate}Hz`);
      return audioBuffer;
    } catch (err) {
      console.error("Error creating audio buffer:", err);
      return null;
    }
  }
  
  async initializeAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      if (!AudioContextClass) {
        console.error("AudioContext not supported in this browser");
        return false;
      }
      
      if (!this.audioContext) {
        this.audioContext = new AudioContextClass({
          sampleRate: 48000
        });
        
        console.log("AudioContext created successfully:", this.audioContext);
        console.log("AudioContext state:", this.audioContext.state);
        
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
          console.log("AudioContext resumed:", this.audioContext.state);
        }
      }
      
      console.log("Requesting microphone access...");
      try {
        // Explicitly request microphone with enhanced configuration for call quality
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            // Add explicit sample rate for better audio clarity
            sampleRate: 48000,
            // Ensure the microphone is prioritized
            channelCount: 1
          } 
        });
        
        console.log("Microphone access granted with stream:", stream);
        console.log("Audio tracks:", stream.getAudioTracks().length);
        console.log("Audio track settings:", stream.getAudioTracks()[0]?.getSettings());
        
        this.audioStream = stream;
        
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        this.microphone = this.audioContext.createMediaStreamSource(stream);
        this.microphone.connect(this.analyser);
        
        // Add explicit audio processor to monitor audio levels
        const processor = this.audioContext.createScriptProcessor(1024, 1, 1);
        this.microphone.connect(processor);
        processor.connect(this.audioContext.destination);
        
        processor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          let sum = 0;
          
          // Calculate RMS (root mean square) to get audio level
          for (let i = 0; i < input.length; i++) {
            sum += input[i] * input[i];
          }
          
          const rms = Math.sqrt(sum / input.length);
          if (rms > 0.01) {  // Only log when audio is detected
            console.log("Microphone audio level:", rms);
          }
        };
        
        await this.testAudioOutput();
        
        this.setupAudioWebSocket();
        
        this.microphoneInitialized = true;
        console.log("Audio context initialized successfully with enhanced audio settings");
        
        // Enumerate devices to check audio configuration
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
          const audioInputs = devices.filter(device => device.kind === 'audioinput');
          
          console.log(`Audio input devices available: ${audioInputs.length}`);
          audioInputs.forEach(device => {
            console.log(`- Input: ${device.label || 'Unnamed device'} (${device.deviceId})`);
          });
          
          console.log(`Audio output devices available: ${audioOutputs.length}`);
          audioOutputs.forEach(device => {
            console.log(`- Output: ${device.label || 'Unnamed device'} (${device.deviceId})`);
          });
          
          this.audioOutputInitialized = true;
        } catch (outputError) {
          console.warn("Could not enumerate audio devices:", outputError);
        }
        
        return true;
      } catch (micError) {
        console.error('Error accessing microphone:', micError);
        
        // Show a notification to the user about microphone issues
        if (micError.name === 'NotAllowedError') {
          alert('Please allow microphone access to make calls. Click the camera icon in your browser address bar and enable the microphone.');
        }
        
        this.microphoneInitialized = false;
        return false;
      }
    } catch (error) {
      console.error('Error initializing audio context:', error);
      this.microphoneInitialized = false;
      return false;
    }
  }
  
  isMicrophoneActive() {
    if (!this.analyser || !this.microphoneInitialized) return false;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    const hasAudioSignal = dataArray.some(value => value > 5);
    
    return hasAudioSignal;
  }
  
  isStreamingActive() {
    return this.streamingActive;
  }
  
  async initializeTwilioDevice() {
    try {
      // Ensure microphone is initialized first - critical for audio transmission
      if (!this.microphoneInitialized) {
        console.log("Microphone not initialized, initializing now...");
        const audioInitialized = await this.initializeAudioContext();
        if (!audioInitialized) {
          console.error("Failed to initialize audio context, cannot proceed with Twilio setup");
          return false;
        }
      }
      
      console.log("Fetching Twilio token...");
      const response = await fetch(`${this.supabaseUrl}/functions/v1/twilio-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'getToken' })
      });
      
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
      
      if (this.device) {
        console.log("Destroying existing Twilio device");
        this.device.destroy();
        this.device = null;
      }
      
      this.device = new Device();
      
      // Configure Twilio Device with explicit audio settings
      const deviceOptions = {
        debug: true,
        enableRingtone: true,
        // Ensure full audio quality settings
        audioConstraints: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          sampleRate: 48000
        },
        // Set higher outgoing volume
        outgoingSoundVolume: 1.0,
        // Set higher incoming volume
        incomingSoundVolume: 1.0,
        // Ensure sounds are played
        sounds: {
          incoming: '/sounds/incoming.mp3',
          outgoing: '/sounds/outgoing.mp3'
        }
      };
      
      this.device.on('ready', () => {
        console.log('Twilio device is ready for audio I/O');
        this.playSound('outgoing');
      });
      
      this.device.on('error', (error) => {
        console.error('Twilio device error:', error);
        alert(`Call error: ${error.message || 'Unknown error'}. Please check your microphone and try again.`);
      });
      
      this.device.on('connect', (conn) => {
        console.log('Call connected - audio channels established');
        this.connection = conn;
        this.callActive = true;
        
        try {
          // Ensure connection is not muted
          conn.mute(false);
          console.log("Connection un-muted explicitly");
          
          // Check if audio tracks are available
          if (this.audioStream && this.audioStream.getAudioTracks().length > 0) {
            console.log("Audio track enabled status:", this.audioStream.getAudioTracks()[0].enabled);
            // Ensure audio track is enabled
            this.audioStream.getAudioTracks()[0].enabled = true;
          }
        } catch (e) {
          console.warn('Could not unmute connection:', e);
        }
        
        // Resume audio context if suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().then(() => {
            console.log('Audio context resumed for active call');
          });
        }
        
        this.stopSound('ringtone');
        this.stopSound('outgoing');
        this.stopSound('dialtone');
        
        // Add volume monitor for debugging
        conn.volume((inputVolume: number, outputVolume: number) => {
          console.log(`Audio levels - Input: ${inputVolume.toFixed(2)}, Output: ${outputVolume.toFixed(2)}`);
          
          if (inputVolume < 0.01) {
            console.warn('Very low or no outgoing audio detected - check microphone');
          }
          
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
        
        this.stopSound('ringtone');
        this.stopSound('outgoing');
        this.stopSound('dialtone');
      });
      
      this.device.on('offline', () => {
        console.log('Twilio device is offline');
      });
      
      this.device.on('incoming', (conn: any) => {
        console.log('Incoming call detected');
        this.playSound('ringtone');
      });
      
      await this.device.setup(data.token, deviceOptions as any);
      
      await this.testAudioOutput();
      
      return true;
    } catch (error) {
      console.error('Error initializing Twilio device:', error);
      return false;
    }
  }
  
  private normalizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '';
    
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    } else if (digitsOnly.length > 10 && !digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    } else if (digitsOnly.length > 10 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }
    
    return digitsOnly ? `+${digitsOnly}` : '';
  }
  
  async makeCall(phoneNumber: string) {
    try {
      console.log(`Making Twilio call to ${phoneNumber}`);
      
      if (!phoneNumber) {
        console.error("Phone number is required");
        return { success: false, error: "Phone number is required" };
      }
      
      const formattedPhoneNumber = this.normalizePhoneNumber(phoneNumber);
      
      if (!formattedPhoneNumber) {
        console.error("Invalid phone number format");
        return { success: false, error: "Invalid phone number format" };
      }
      
      // Ensure microphone access and permissions before making call
      if (!this.audioStream || !this.audioStream.active) {
        console.log("Audio stream inactive or not initialized, requesting permission");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000
            }
          });
          
          this.audioStream = stream;
          console.log("New audio stream acquired:", stream);
          console.log("Audio tracks in stream:", stream.getAudioTracks().length);
          
          // Ensure tracks are enabled
          stream.getAudioTracks().forEach(track => {
            track.enabled = true;
            console.log("Audio track enabled:", track.enabled);
            console.log("Audio track settings:", track.getSettings());
          });
          
          // Create new audio context if needed
          if (!this.audioContext || this.audioContext.state === 'closed') {
            await this.initializeAudioContext();
          } else if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }
        } catch (micError) {
          console.error("Could not access microphone:", micError);
          alert("Microphone access is required to make calls. Please allow microphone access in your browser settings.");
          return { success: false, error: "Microphone access denied" };
        }
      }
      
      if (!this.device || this.device.status() !== 'ready') {
        console.log("Twilio device not ready, attempting to initialize...");
        const initialized = await this.initializeTwilioDevice();
        if (!initialized) {
          return { success: false, error: "Failed to initialize Twilio device" };
        }
      }
      
      this.playSound('dialtone');
      
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        this.setupAudioWebSocket();
      }
      
      this.audioQueue = [];
      
      try {
        console.log("Using Twilio Device for browser-based calling");
        
        if (this.audioContext && this.audioContext.state !== 'running') {
          console.log("Resuming audio context...");
          await this.audioContext.resume();
          console.log("Audio context state after resume:", this.audioContext.state);
        }
        
        console.log("Connecting with phone number:", formattedPhoneNumber);
        
        // Set up parameters with explicit audio options
        const params = {
          To: formattedPhoneNumber,
          // Force high quality audio
          audioConstraints: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };
        
        console.log("Call parameters:", params);
        
        this.connection = await this.device.connect(params);
        
        console.log("Call connection established:", this.connection?.parameters);
        this.callActive = true;
        
        // Set up volume monitoring for debugging
        this.connection.on('volume', (inputVol: number, outputVol: number) => {
          if (inputVol > 0.01 || outputVol > 0.01) {
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
        
        // Fallback to REST API call if Device fails
        console.log("Falling back to REST API call method");
        
        try {
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
            const errorData = await response.text();
            throw new Error(`API call failed: ${errorData}`);
          }
          
          const result = await response.json();
          
          if (result.success && result.callSid) {
            console.log("REST API call successful:", result);
            return { 
              success: true, 
              callSid: result.callSid,
              usingBrowser: false
            };
          } else {
            throw new Error(result.error || "Unknown API error");
          }
        } catch (apiError) {
          console.error("REST API call failed:", apiError);
          return { success: false, error: apiError.message || "Failed to connect call" };
        }
      }
    } catch (error: any) {
      console.error('Error making call:', error);
      return { success: false, error: error.message || "An unknown error occurred" };
    }
  }
  
  async checkCallStatus(callSid: string) {
    try {
      if (this.connection && this.connection.parameters.CallSid === callSid) {
        return this.connection.status();
      }
      
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
        console.log(`${mute ? 'Muting' : 'Unmuting'} microphone`);
        
        if (mute) {
          this.connection.mute();
        } else {
          this.connection.unmute();
          
          // Double-check mute status
          setTimeout(() => {
            if (this.connection) {
              try {
                this.connection.mute(false);  // Explicitly unmute again
                console.log("Re-confirming unmute state");
              } catch (e) {
                console.warn("Error in mute confirmation:", e);
              }
            }
          }, 500);
        }
        
        // Also set audio track enabled state directly if available
        if (this.audioStream && this.audioStream.getAudioTracks().length > 0) {
          this.audioStream.getAudioTracks()[0].enabled = !mute;
          console.log(`Audio track enabled set to ${!mute}`);
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
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
      this.socket = null;
    }
    
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
  
  async testAudioOutput(deviceId?: string) {
    try {
      if (!this.audioContext) {
        await this.initializeAudioContext();
      }
      
      if (this.audioContext) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        if (deviceId) {
          await this.setAudioOutputDevice(deviceId);
        }
        
        oscillator.start();
        console.log("Playing test tone...");
        
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
  
  async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    try {
      if (!deviceId) return false;
      
      this.currentAudioOutputDevice = deviceId;
      console.log(`Setting audio output device to: ${deviceId}`);
      
      const audioElements = [
        this.audioElement,
        document.getElementById('ringtone') as HTMLAudioElement,
        document.getElementById('outgoing') as HTMLAudioElement
