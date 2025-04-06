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
  private inboundAudioCount: number = 0;
  private outboundAudioCount: number = 0;
  private lastAudioLevelLog: number = 0;
  private logAudioInterval: number = 2000; // Log every 2 seconds

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
    console.log('[AudioProcessing] Attempting to connect to WebSocket stream', {
      hasExistingSocket: !!this.webSocket,
      existingSocketState: this.webSocket ? this.webSocket.readyState : 'none',
      hasActiveStream: !!this.activeStreamSid
    });
    
    return new Promise((resolve, reject) => {
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        console.log('[AudioProcessing] WebSocket already connected');
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
        console.log('[AudioProcessing] Creating new WebSocket connection');
        this.webSocket = new WebSocket('wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream');
        
        this.webSocket.onopen = () => {
          console.log('[AudioProcessing] WebSocket connection established for bidirectional audio');
          
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
          console.error('[AudioProcessing] WebSocket error:', error);
          if (this.options.onConnectionStatus) {
            this.options.onConnectionStatus(false);
          }
          reject(error);
        };
        
        this.webSocket.onclose = (event) => {
          console.log(`[AudioProcessing] WebSocket connection closed: ${event.code} ${event.reason}`);
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
        console.error('[AudioProcessing] Error connecting to WebSocket:', err);
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
          console.log(`[AudioProcessing] Stream started: ${data.streamSid} (Call: ${data.callSid})`, data);
          this.activeStreamSid = data.streamSid;
          this.inboundAudioCount = 0;
          this.outboundAudioCount = 0;
          
          // Start capturing microphone
          this.startCapturingMicrophone();
          
          if (this.options.onStreamStarted) {
            this.options.onStreamStarted(data.streamSid, data.callSid);
          }
          break;
          
        case 'streamStop':
          console.log('[AudioProcessing] Stream stopped', {
            streamSid: this.activeStreamSid,
            inboundAudioCount: this.inboundAudioCount,
            outboundAudioCount: this.outboundAudioCount,
            data: data
          });
          this.activeStreamSid = null;
          this.stopCapturingMicrophone();
          
          if (this.options.onStreamStopped) {
            this.options.onStreamStopped();
          }
          break;
          
        case 'audio':
          this.inboundAudioCount++;
          if (this.inboundAudioCount % 50 === 0) {
            console.log(`[AudioProcessing] Received audio chunk #${this.inboundAudioCount}, track: ${data.track || 'unknown'}`, {
              hasPayload: !!data.payload,
              payloadLength: data.payload ? data.payload.length : 0,
              streamSid: data.streamSid,
              sequence: data.sequence || 'none'
            });
          }
          
          if (data.payload && this.options.onAudioReceived) {
            this.options.onAudioReceived(data.track || 'unknown', data.payload);
            this.playAudio(data.payload);
          }
          break;
          
        case 'connection_established':
        case 'browser_connected':
          console.log(`[AudioProcessing] Connection established: ${data.connId || 'unknown'}`, data);
          break;
          
        case 'pong':
          // Ping response received, connection still alive
          break;
          
        case 'mark':
          console.log(`[AudioProcessing] Mark received: ${data.name || 'unnamed'}`, data);
          break;
          
        case 'dtmf':
          console.log(`[AudioProcessing] DTMF received: ${data.digit || ''}`, data);
          break;
          
        default:
          console.log(`[AudioProcessing] Unhandled WebSocket event: ${data.event}`, data);
      }
    } catch (err) {
      console.error('[AudioProcessing] Error processing WebSocket message:', err, event.data);
    }
  }

  /**
   * Start capturing microphone audio
   */
  public async startCapturingMicrophone(): Promise<boolean> {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      console.error('[AudioProcessing] Cannot start capturing: WebSocket not connected');
      return false;
    }
    
    if (this.isProcessing) {
      console.log('[AudioProcessing] Already capturing microphone audio');
      return true;
    }
    
    try {
      console.log('[AudioProcessing] Requesting microphone access...');
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
      
      console.log('[AudioProcessing] Microphone access granted', {
        tracks: this.microphoneStream.getAudioTracks().map(t => ({
          label: t.label,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState
        }))
      });
      
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('[AudioProcessing] Audio context created', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state
      });
      
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
      console.log('[AudioProcessing] Microphone audio capture started');
      
      return true;
    } catch (err) {
      console.error('[AudioProcessing] Error starting microphone capture:', err);
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
    
    // Log audio levels periodically
    const now = Date.now();
    if (now - this.lastAudioLevelLog > this.logAudioInterval) {
      console.log('[AudioProcessing] Microphone audio level:', {
        rms: rms,
        audioDetected: rms > 0.005,
        outboundAudioCount: this.outboundAudioCount,
        inboundAudioCount: this.inboundAudioCount,
        isWebSocketOpen: this.webSocket.readyState === WebSocket.OPEN,
        activeStreamSid: this.activeStreamSid
      });
      this.lastAudioLevelLog = now;
    }
    
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
      const result = this.sendToWebSocket({
        event: 'browser_audio',
        payload: base64Audio
      });
      
      if (result) {
        this.outboundAudioCount++;
        
        if (this.outboundAudioCount % 50 === 0) {
          console.log(`[AudioProcessing] Sent audio chunk #${this.outboundAudioCount} to WebSocket`, {
            payloadLength: base64Audio.length,
            rms: rms.toFixed(4)
          });
        }
      }
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
        
        if (this.inboundAudioCount % 100 === 0) {
          console.log('[AudioProcessing] Playing received audio', {
            sampleRate: decodedData.sampleRate,
            duration: decodedData.duration,
            numberOfChannels: decodedData.numberOfChannels,
            bufferLength: decodedData.length
          });
        }
      }, 
      (err) => {
        console.error('[AudioProcessing] Error decoding audio data:', err);
      });
    } catch (err) {
      console.error('[AudioProcessing] Error playing incoming audio:', err);
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
      } else {
        if (data.event !== 'ping') {  // Don't log ping failures
          console.warn('[AudioProcessing] Failed to send to WebSocket - connection not open', {
            readyState: this.webSocket ? this.webSocket.readyState : 'null',
            event: data.event
          });
        }
      }
    } catch (err) {
      console.error('[AudioProcessing] Error sending to WebSocket:', err);
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

  /**
   * Get diagnostic information about the current state
   */
  public getDiagnostics(): any {
    return {
      isWebSocketConnected: this.webSocket?.readyState === WebSocket.OPEN,
      webSocketState: this.webSocket ? this.webSocket.readyState : 'null',
      activeStreamSid: this.activeStreamSid,
      isProcessing: this.isProcessing,
      inboundAudioCount: this.inboundAudioCount,
      outboundAudioCount: this.outboundAudioCount,
      microphoneActive: !!this.microphoneStream && this.microphoneStream.getAudioTracks().some(t => t.enabled && !t.muted),
      audioContextState: this.audioContext ? this.audioContext.state : 'null',
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Export singleton instance
export const audioProcessing = new AudioProcessingService();
