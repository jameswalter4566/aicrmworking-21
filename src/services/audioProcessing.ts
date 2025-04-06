import { toast } from '@/components/ui/use-toast';

interface AudioStreamingOptions {
  onStreamStarted?: (streamSid: string, callSid: string) => void;
  onStreamStopped?: () => void;
  onAudioReceived?: (track: string, payload: string) => void;
  onConnectionStatus?: (connected: boolean) => void;
}

class AudioProcessingService {
  private webSocket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private microphoneStream: MediaStream | null = null;
  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private activeStreamSid: string | null = null;
  private options: AudioStreamingOptions = {};
  private isProcessing: boolean = false;
  private connectionCheckInterval: number | null = null;
  private pingInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts: number = 0;
  private MAX_RECONNECT_ATTEMPTS = 5;

  constructor() {
    // Initialize connection check interval
    this.connectionCheckInterval = window.setInterval(() => {
      if (this.webSocket && this.activeStreamSid && 
          this.webSocket.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket connection lost, attempting to reconnect...');
        this.reconnect();
      }
    }, 5000);
  }

  /**
   * Connect to the streaming WebSocket
   */
  public connect(options: AudioStreamingOptions = {}): Promise<boolean> {
    this.options = options;
    
    return new Promise((resolve, reject) => {
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        resolve(true);
        return;
      }
      
      try {
        // Clear any existing reconnect timeouts
        if (this.reconnectTimeout !== null) {
          window.clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }

        // Create WebSocket connection to Supabase streaming endpoint
        this.webSocket = new WebSocket('wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream');
        
        this.webSocket.onopen = () => {
          console.log('WebSocket connection established for bidirectional audio');
          
          // Send initial browser connect message
          this.sendToWebSocket({
            event: 'browser_connect',
            timestamp: Date.now()
          });
          
          // Set up ping interval to keep connection alive
          if (this.pingInterval) {
            window.clearInterval(this.pingInterval);
          }
          
          this.pingInterval = window.setInterval(() => {
            if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
              this.sendToWebSocket({
                event: 'ping',
                timestamp: Date.now()
              });
            }
          }, 30000);
          
          if (this.options.onConnectionStatus) {
            this.options.onConnectionStatus(true);
          }
          
          // Reset reconnect attempts on successful connection
          this.reconnectAttempts = 0;
          
          resolve(true);
        };
        
        this.webSocket.onmessage = this.handleWebSocketMessage.bind(this);
        
        this.webSocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.options.onConnectionStatus) {
            this.options.onConnectionStatus(false);
          }
          reject(error);
        };
        
        this.webSocket.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          this.activeStreamSid = null;
          
          if (this.options.onConnectionStatus) {
            this.options.onConnectionStatus(false);
          }
          
          if (this.options.onStreamStopped) {
            this.options.onStreamStopped();
          }
          
          // Only attempt to reconnect if we didn't explicitly close it
          if (event.code !== 1000) {
            this.scheduleReconnect();
          }
        };
      } catch (err) {
        console.error('Error connecting to WebSocket:', err);
        reject(err);
      }
    });
  }

  /**
   * Schedule a reconnect attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    // Don't try to reconnect too many times
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.warn(`Maximum reconnect attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached`);
      return;
    }
    
    // Exponential backoff with 1s base (1s, 2s, 4s, 8s, 16s)
    const delay = Math.min(30000, Math.pow(2, this.reconnectAttempts) * 1000);
    this.reconnectAttempts++;
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect to the WebSocket
   */
  private reconnect(): void {
    console.log('Attempting to reconnect WebSocket...');
    
    // Clean up existing connection
    this.cleanup(false);
    
    // Try to reconnect
    this.connect(this.options).catch(err => {
      console.error('Failed to reconnect:', err);
      this.scheduleReconnect();
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Handle different event types
      switch (data.event) {
        case 'streamStart':
          console.log(`Stream started: ${data.streamSid} (Call: ${data.callSid})`);
          this.activeStreamSid = data.streamSid;
          
          // Start capturing microphone
          this.startCapturingMicrophone();
          
          if (this.options.onStreamStarted) {
            this.options.onStreamStarted(data.streamSid, data.callSid);
          }
          break;
          
        case 'streamStop':
          console.log('Stream stopped');
          this.activeStreamSid = null;
          this.stopCapturingMicrophone();
          
          if (this.options.onStreamStopped) {
            this.options.onStreamStopped();
          }
          break;
          
        case 'audio':
          if (data.payload && this.options.onAudioReceived) {
            this.options.onAudioReceived(data.track || 'unknown', data.payload);
            this.playAudio(data.payload);
          }
          break;
          
        case 'connection_established':
        case 'browser_connected':
          console.log(`Connection established: ${data.connId || 'unknown'}`);
          break;
          
        case 'pong':
          // Ping response received, connection still alive
          break;
          
        case 'mark':
          console.log(`Mark received: ${data.name || 'unnamed'}`);
          break;
          
        case 'dtmf':
          console.log(`DTMF received: ${data.digit || ''}`);
          break;
          
        default:
          console.log(`Unhandled WebSocket event: ${data.event}`);
      }
    } catch (err) {
      console.error('Error processing WebSocket message:', err);
    }
  }

  /**
   * Start capturing microphone audio
   */
  public async startCapturingMicrophone(): Promise<boolean> {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      console.error('Cannot start capturing: WebSocket not connected');
      return false;
    }
    
    if (this.isProcessing) {
      console.log('Already capturing microphone audio');
      return true;
    }
    
    try {
      // Request microphone access with optimized settings
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });
      
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create source from microphone stream
      this.microphoneSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
      
      // Create processor node for audio processing
      // Note: ScriptProcessorNode is deprecated but still works in most browsers
      // AudioWorklet would be the modern alternative but requires more setup
      this.processorNode = this.audioContext.createScriptProcessor(1024, 1, 1);
      
      // Process audio data
      this.processorNode.onaudioprocess = this.processAudio.bind(this);
      
      // Connect nodes
      this.microphoneSource.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
      
      this.isProcessing = true;
      console.log('Microphone audio capture started');
      
      return true;
    } catch (err) {
      console.error('Error starting microphone capture:', err);
      toast({
        title: "Microphone Error",
        description: "Could not access your microphone. Please check your browser permissions.",
        variant: "destructive",
      });
      return false;
    }
  }

  /**
   * Process audio from microphone for transmission
   */
  private processAudio(e: AudioProcessingEvent): void {
    if (!this.webSocket || 
        this.webSocket.readyState !== WebSocket.OPEN || 
        !this.activeStreamSid) {
      return;
    }
    
    // Get audio data
    const inputBuffer = e.inputBuffer;
    const inputData = inputBuffer.getChannelData(0);
    
    // Calculate audio level (RMS)
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sum / inputData.length);
    
    // Only send if audio level is high enough (avoid sending silence)
    if (rms > 0.005) {
      // Convert to format suitable for WebSocket transmission
      const buffer = new ArrayBuffer(inputData.length * 2);
      const view = new DataView(buffer);
      
      for (let i = 0; i < inputData.length; i++) {
        // Convert Float32 to Int16
        const s = Math.max(-1, Math.min(1, inputData[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      
      // Convert to base64
      const base64Audio = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
      
      // Send to WebSocket
      this.sendToWebSocket({
        event: 'browser_audio',
        payload: base64Audio
      });
    }
  }

  /**
   * Play incoming audio from the WebSocket
   */
  private async playAudio(base64Audio: string): Promise<void> {
    if (!this.audioContext) return;
    
    try {
      // Convert base64 to array buffer
      const binary = atob(base64Audio);
      const buffer = new ArrayBuffer(binary.length);
      const bytes = new Uint8Array(buffer);
      
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // Decode audio data
      // Note: We're using the deprecated callback pattern for wider browser support
      this.audioContext.decodeAudioData(buffer, (decodedData) => {
        // Create buffer source
        const source = this.audioContext!.createBufferSource();
        source.buffer = decodedData;
        
        // Connect to destination (speakers)
        source.connect(this.audioContext!.destination);
        
        // Play the audio
        source.start(0);
      }, 
      (err) => {
        console.error('Error decoding audio data:', err);
      });
    } catch (err) {
      console.error('Error playing incoming audio:', err);
    }
  }

  /**
   * Stop capturing microphone audio
   */
  public stopCapturingMicrophone(): void {
    try {
      // Disconnect processor node
      if (this.processorNode && this.audioContext) {
        this.processorNode.disconnect();
        this.processorNode = null;
      }
      
      // Disconnect source
      if (this.microphoneSource) {
        this.microphoneSource.disconnect();
        this.microphoneSource = null;
      }
      
      // Stop microphone tracks
      if (this.microphoneStream) {
        this.microphoneStream.getTracks().forEach(track => track.stop());
        this.microphoneStream = null;
      }
      
      this.isProcessing = false;
      console.log('Microphone audio capture stopped');
    } catch (err) {
      console.error('Error stopping microphone capture:', err);
    }
  }

  /**
   * Send data to WebSocket
   */
  private sendToWebSocket(data: any): boolean {
    try {
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.send(JSON.stringify(data));
        return true;
      }
    } catch (err) {
      console.error('Error sending to WebSocket:', err);
    }
    return false;
  }

  /**
   * Send browser audio to the WebSocket
   */
  public sendAudio(audioData: string): boolean {
    if (!this.activeStreamSid) {
      return false;
    }
    
    return this.sendToWebSocket({
      event: 'browser_audio',
      payload: audioData
    });
  }

  /**
   * Clean up all resources
   */
  public cleanup(closeSocket: boolean = true): void {
    // Stop audio processing
    this.stopCapturingMicrophone();
    
    // Clear intervals
    if (this.pingInterval !== null) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (err) {
        console.warn('Error closing audio context:', err);
      }
      this.audioContext = null;
    }
    
    // Close WebSocket connection
    if (closeSocket && this.webSocket) {
      try {
        if (this.webSocket.readyState === WebSocket.OPEN || 
            this.webSocket.readyState === WebSocket.CONNECTING) {
          this.webSocket.close(1000, "Normal closure");
        }
      } catch (err) {
        console.warn('Error closing WebSocket:', err);
      }
      this.webSocket = null;
    }
    
    this.activeStreamSid = null;
    this.isProcessing = false;
  }
}

// Export singleton instance
export const audioProcessing = new AudioProcessingService();
