// Create a simple audio processing service to handle audio streaming

interface AudioProcessingOptions {
  onConnectionStatus?: (connected: boolean) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: any) => void;
  onStreamStarted?: (streamSid: string, callSid: string) => void;
  onStreamEnded?: (streamSid: string) => void;
}

class AudioProcessingService {
  private webSocket: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private inboundAudioCount: number = 0;
  private outboundAudioCount: number = 0;
  private isProcessing: boolean = false;
  private streamSid: string | null = null;
  private callSid: string | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private lastProcessedTime: string = 'never';
  private audioContext: AudioContext | null = null;
  private audioDestination: AudioDestinationNode | null = null;
  private currentAudioDevice: string = 'default';
  private availableDevices: MediaDeviceInfo[] = [];
  private microphoneStream: MediaStream | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private connectionOptions: AudioProcessingOptions | null = null;
  private pingInterval: number | null = null;

  // Connect to the audio stream - making this more reliable
  async connect(options: AudioProcessingOptions = {}): Promise<boolean> {
    try {
      // Store options for reconnection attempts
      this.connectionOptions = options;
      
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        console.log("WebSocket already connected");
        return true;
      }

      console.log("Connecting to audio streaming WebSocket...");
      
      // Clear any existing connection first
      if (this.webSocket) {
        try {
          this.webSocket.close();
        } catch (err) {
          console.warn("Error closing existing WebSocket:", err);
        }
        this.webSocket = null;
      }
      
      // Use the full Supabase URL
      this.webSocket = new WebSocket('wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream');
      
      this.webSocket.onopen = () => {
        console.log("WebSocket connection opened for stream");
        this.isConnected = true;
        this.reconnectAttempts = 0; // Reset reconnect counter on successful connection
        
        // Register this client as a browser client immediately on connection
        this.webSocket?.send(JSON.stringify({
          event: 'browser_connect',
          timestamp: Date.now(),
          clientType: 'browser-audio-client'
        }));

        // If there are callbacks provided, call them
        if (options.onConnectionStatus) {
          options.onConnectionStatus(true);
        }
        
        if (options.onConnected) {
          options.onConnected();
        }
        
        // Set up regular ping to keep connection alive
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }
        
        this.pingInterval = window.setInterval(() => {
          if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
            this.webSocket.send(JSON.stringify({
              event: 'ping',
              timestamp: Date.now()
            }));
            console.log("Ping sent to server");
          }
        }, 15000); // Every 15 seconds
      };
      
      this.webSocket.onclose = () => {
        console.log("WebSocket connection closed");
        this.isConnected = false;
        
        // Clear ping interval
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        
        if (options.onConnectionStatus) {
          options.onConnectionStatus(false);
        }
        
        if (options.onDisconnected) {
          options.onDisconnected();
        }
        
        // Auto-reconnect after a delay with exponential backoff
        const delay = Math.min(30000, 1000 * Math.pow(1.5, this.reconnectAttempts));
        this.reconnectAttempts++;
        
        console.log(`Will attempt to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
          if (!this.isConnected) {
            console.log("Attempting to reconnect WebSocket...");
            // Use the stored options for reconnection
            this.connect(this.connectionOptions || {});
          }
        }, delay);
      };
      
      this.webSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        
        if (options.onError) {
          options.onError(error);
        }
      };
      
      this.webSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different event types
          switch (data.event) {
            case 'streamStart':
              this.streamSid = data.streamSid;
              this.callSid = data.callSid;
              this.isProcessing = true;
              this.inboundAudioCount = 0;
              this.outboundAudioCount = 0;
              
              console.log(`Stream started: ${this.streamSid}, Call: ${this.callSid}`);
              
              // Send a confirmation back to the server to establish bidirectional flow
              if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
                this.webSocket.send(JSON.stringify({
                  event: 'streamConnected',
                  streamSid: this.streamSid,
                  timestamp: Date.now()
                }));
              }
              
              if (options.onStreamStarted) {
                options.onStreamStarted(this.streamSid, this.callSid);
              }
              break;
            
            case 'streamStop':
              this.isProcessing = false;
              
              console.log(`Stream stopped: ${this.streamSid}`);
              
              if (options.onStreamEnded && this.streamSid) {
                options.onStreamEnded(this.streamSid);
              }
              
              this.streamSid = null;
              this.callSid = null;
              break;
              
            case 'audio':
              if (data.payload) {
                this.inboundAudioCount++;
                this.lastProcessedTime = new Date().toLocaleTimeString();
                
                // Log every 50th audio packet
                if (this.inboundAudioCount % 50 === 0) {
                  console.log(`Received audio packet ${this.inboundAudioCount}`);
                }
                
                // Use the global twilioAudioPlayer if available, otherwise fall back to internal method
                if (window.twilioAudioPlayer && window.twilioAudioPlayer.addAudioData) {
                  // Only send to the player if the stream SIDs match or global player has no streamSid
                  if (!window.twilioAudioPlayer.streamSid || 
                      window.twilioAudioPlayer.streamSid === this.streamSid || 
                      window.twilioAudioPlayer.streamSid === data.streamSid) {
                    window.twilioAudioPlayer.addAudioData(data.payload);
                  }
                } else {
                  // Fall back to internal playback method
                  this.playAudioFromBase64(data.payload);
                }
              }
              break;
              
            case 'media':
              if (data.media && data.media.payload) {
                this.inboundAudioCount++;
                this.lastProcessedTime = new Date().toLocaleTimeString();
                
                // Log every 50th audio packet
                if (this.inboundAudioCount % 50 === 0) {
                  console.log(`Received audio packet ${this.inboundAudioCount} from media event`);
                }
                
                // Use the global twilioAudioPlayer if available, otherwise fall back to internal method
                if (window.twilioAudioPlayer && window.twilioAudioPlayer.addAudioData) {
                  // Only send to the player if the stream SIDs match or global player has no streamSid
                  if (!window.twilioAudioPlayer.streamSid || 
                      window.twilioAudioPlayer.streamSid === this.streamSid || 
                      window.twilioAudioPlayer.streamSid === data.streamSid) {
                    window.twilioAudioPlayer.addAudioData(data.media.payload);
                  }
                } else {
                  // Fall back to internal playback method
                  this.playAudioFromBase64(data.media.payload);
                }
              }
              break;
              
            case 'pong':
              console.log("Received pong from server, connection is alive");
              break;
              
            case 'connection_established':
            case 'browser_connected':
              console.log(`WebSocket connection confirmed: ${data.event}`);
              break;
              
            default:
              // Handle any other event types
              console.log(`Received event: ${data.event}`);
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };
      
      // Enumerate available audio devices
      try {
        await this.getAudioDevices();
      } catch (err) {
        console.warn("Could not get audio devices:", err);
      }
      
      return true;
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
      
      if (options.onConnectionStatus) {
        options.onConnectionStatus(false);
      }
      
      if (options.onError) {
        options.onError(error);
      }
      
      return false;
    }
  }

  // Start capturing microphone input for streaming
  async startCapturingMicrophone(): Promise<boolean> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia not supported in this browser");
      return false;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log("Microphone access granted for streaming");
      this.microphoneStream = stream;
      
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const source = this.audioContext.createMediaStreamSource(stream);
      this.audioProcessor = this.audioContext.createScriptProcessor(1024, 1, 1);
      
      this.audioProcessor.onaudioprocess = (e) => {
        if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN && this.streamSid) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          
          if (rms > 0.005) {
            const buffer = new ArrayBuffer(inputData.length * 2);
            const view = new DataView(buffer);
            
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
            
            const base64Audio = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
            
            this.webSocket.send(JSON.stringify({
              event: 'browser_audio',
              streamSid: this.streamSid,
              payload: base64Audio
            }));
            
            this.outboundAudioCount++;
            
            // Log every 50th outbound audio packet
            if (this.outboundAudioCount % 50 === 0) {
              console.log(`Sent microphone audio chunk #${this.outboundAudioCount} to Twilio`);
            }
          }
        }
      };
      
      source.connect(this.audioProcessor);
      this.audioProcessor.connect(this.audioContext.destination);
      
      console.log("Microphone audio capture started for bidirectional streaming");
      
      return true;
    } catch (err) {
      console.error("Error accessing microphone for bidirectional streaming:", err);
      return false;
    }
  }

  // Stop capturing microphone input
  stopCapturingMicrophone(): void {
    if (this.audioProcessor && this.audioContext) {
      try {
        this.audioProcessor.disconnect();
        this.audioProcessor = null;
      } catch (err) {
        console.warn("Error disconnecting audio processor:", err);
      }
    }
    
    if (this.microphoneStream) {
      try {
        this.microphoneStream.getTracks().forEach(track => track.stop());
        this.microphoneStream = null;
      } catch (err) {
        console.warn("Error stopping microphone tracks:", err);
      }
    }
    
    console.log("Microphone audio capture stopped");
  }
  
  // Get available audio output devices
  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.warn("MediaDevices API not supported");
      return [];
    }
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter(device => device.kind === 'audiooutput');
      
      console.log("Available audio devices:", this.availableDevices);
      return this.availableDevices;
    } catch (error) {
      console.error("Error enumerating devices:", error);
      return [];
    }
  }
  
  // Set the current audio output device
  async setAudioDevice(deviceId: string): Promise<boolean> {
    try {
      console.log(`Setting audio output device to: ${deviceId}`);
      
      if (!('setSinkId' in HTMLMediaElement.prototype)) {
        console.warn("Audio output device selection not supported");
        return false;
      }
      
      // Initialize audio context if needed
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.audioDestination = this.audioContext.destination;
      }
      
      // Apply to all audio elements in the document
      const audioElements = document.querySelectorAll('audio');
      for (let i = 0; i < audioElements.length; i++) {
        try {
          await (audioElements[i] as any).setSinkId(deviceId);
          console.log(`Set audio element ${i} to device: ${deviceId}`);
        } catch (err) {
          console.warn(`Could not set device for audio element ${i}:`, err);
        }
      }
      
      this.currentAudioDevice = deviceId;
      return true;
    } catch (error) {
      console.error("Error setting audio device:", error);
      return false;
    }
  }
  
  // Play audio from base64 string - improved handling
  async playAudioFromBase64(base64Audio: string): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.audioDestination = this.audioContext.destination;
      }
      
      // Make sure audioContext is running
      if (this.audioContext.state !== 'running') {
        await this.audioContext.resume();
      }
      
      // Convert base64 to ArrayBuffer
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // Log first successful audio packet
      if (this.inboundAudioCount === 1) {
        console.log("First audio packet received and processed", bytes.length, "bytes");
      }
      
      if (this.inboundAudioCount % 100 === 0) {
        console.log(`Processed ${this.inboundAudioCount} audio packets`);
      }
      
      // Add to queue
      this.audioQueue.push(bytes.buffer);
      
      // If not already playing, start playing
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error("Error playing audio from base64:", error);
    }
  }
  
  // Private method to play the next audio in queue - with better error handling
  private async playNextInQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }
    
    this.isPlaying = true;
    
    try {
      const audioBuffer = this.audioQueue.shift();
      
      if (!audioBuffer || !this.audioContext) {
        this.playNextInQueue();
        return;
      }
      
      // Apply the current device before playing
      if (this.currentAudioDevice && this.currentAudioDevice !== 'default') {
        try {
          await this.setAudioDevice(this.currentAudioDevice);
        } catch (err) {
          console.warn("Could not set audio device before playback:", err);
        }
      }
      
      // Create a new Audio element for playing the sound
      try {
        const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        if (this.currentAudioDevice && 'setSinkId' in HTMLMediaElement.prototype) {
          try {
            await (audio as any).setSinkId(this.currentAudioDevice);
          } catch (err) {
            console.warn("Could not set sink ID:", err);
          }
        }
        
        audio.onended = () => {
          URL.revokeObjectURL(url);
          this.playNextInQueue();
        };
        
        audio.onerror = () => {
          console.warn("Error playing audio:", audio.error);
          URL.revokeObjectURL(url);
          this.playNextInQueue();
        };
        
        await audio.play();
      } catch (audioErr) {
        console.warn("Error with Audio element approach, falling back to AudioContext:", audioErr);
        
        // Fall back to AudioContext approach
        try {
          const decodedData = await this.audioContext.decodeAudioData(audioBuffer.slice(0));
          const source = this.audioContext.createBufferSource();
          source.buffer = decodedData;
          source.connect(this.audioContext.destination);
          
          source.onended = () => {
            this.playNextInQueue();
          };
          
          source.start(0);
        } catch (decodeErr) {
          console.error("Error decoding audio data:", decodeErr);
          this.playNextInQueue();
        }
      }
    } catch (error) {
      console.error("Error playing audio from queue:", error);
      this.isPlaying = false;
      // Try again after a short delay
      setTimeout(() => this.playNextInQueue(), 100);
    }
  }
  
  // Test audio output - enhancing this to use a tone that's more clear
  async testAudio(deviceId?: string): Promise<boolean> {
    try {
      if (deviceId) {
        await this.setAudioDevice(deviceId);
      }
      
      try {
        // Generate a simple, clear test tone
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 440; // A4 note
        gainNode.gain.value = 0.2; // Lower volume
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        
        // Play for 1 second
        setTimeout(() => {
          oscillator.stop();
          audioCtx.close();
        }, 1000);
        
        console.log("🔊 Test tone played successfully");
        return true;
      } catch (err) {
        console.warn("⚠️ AudioContext test failed:", err);
        
        // Fall back to playing an audio file
        const audio = new Audio('/sounds/dialtone.mp3');
        
        if (deviceId && 'setSinkId' in HTMLMediaElement.prototype) {
          try {
            await (audio as any).setSinkId(deviceId);
          } catch (sinkErr) {
            console.warn("⚠️ Could not set sink ID:", sinkErr);
          }
        }
        
        audio.volume = 0.3;
        await audio.play();
        
        // Stop after 1 second
        setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
        }, 1000);
        
        console.log("🔊 Test audio file played successfully");
        return true;
      }
    } catch (error) {
      console.error("❌ Error testing audio:", error);
      return false;
    }
  }
  
  // Clean up resources
  async cleanup(): Promise<void> {
    try {
      console.log("Cleaning up audio processing resources...");
      
      // Clear ping interval
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      
      // Close WebSocket if open
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        // Send a disconnect message before closing
        if (this.streamSid) {
          try {
            this.webSocket.send(JSON.stringify({
              event: 'browser_disconnect',
              streamSid: this.streamSid,
              timestamp: Date.now()
            }));
          } catch (err) {
            console.warn("Could not send disconnect message:", err);
          }
        }
        
        this.webSocket.close();
      }
      
      this.webSocket = null;
      this.isConnected = false;
      this.streamSid = null;
      this.callSid = null;
      
      // Stop any active microphone capture
      this.stopCapturingMicrophone();
      
      // Close AudioContext if exists
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }
      
      this.audioQueue = [];
      this.isPlaying = false;
      this.inboundAudioCount = 0;
      this.outboundAudioCount = 0;
      
      console.log("Audio processing resources cleaned up");
    } catch (error) {
      console.error("Error cleaning up audio resources:", error);
    }
  }
  
  // Get diagnostics for debugging
  getDiagnostics(): AudioDiagnostics {
    // Get a label for the current device
    let selectedDeviceLabel = 'default';
    const device = this.availableDevices.find(d => d.deviceId === this.currentAudioDevice);
    if (device && device.label) {
      selectedDeviceLabel = device.label;
    }
    
    return {
      isWebSocketConnected: this.isConnected,
      webSocketState: this.webSocket ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.webSocket.readyState] : 'disconnected',
      activeStreamSid: this.streamSid,
      isProcessing: this.isProcessing,
      inboundAudioCount: this.inboundAudioCount,
      outboundAudioCount: this.outboundAudioCount,
      microphoneActive: !!this.microphoneStream,
      audioContextState: this.audioContext ? this.audioContext.state : 'closed',
      reconnectAttempts: this.reconnectAttempts,
      lastProcessedAudio: this.lastProcessedTime,
      audioQueueLength: this.audioQueue.length,
      isPlaying: this.isPlaying,
      selectedDevice: selectedDeviceLabel,
      availableDevices: this.availableDevices.length
    };
  }
}

interface AudioDiagnostics {
  isWebSocketConnected: boolean;
  webSocketState: string;
  activeStreamSid: string | null;
  isProcessing: boolean;
  inboundAudioCount: number;
  outboundAudioCount: number;
  microphoneActive: boolean;
  audioContextState: string;
  reconnectAttempts: number;
  lastProcessedAudio: string;
  audioQueueLength: number;
  isPlaying: boolean;
  selectedDevice?: string;
  availableDevices?: number;
}

// Add TypeScript declarations
declare global {
  interface Window {
    twilioAudioPlayer?: {
      addAudioData: (base64Audio: string) => void;
      streamSid?: string | null;
    };
  }
}

export const audioProcessing = new AudioProcessingService();
