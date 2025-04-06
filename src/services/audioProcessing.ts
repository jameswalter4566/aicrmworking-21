
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
  private lastProcessedAudio: number = 0;

  constructor() {
    // Initialize connection check interval
    this.connectionCheckInterval = window.setInterval(() => {
      if (this.webSocket && this.activeStreamSid && 
          this.webSocket.readyState !== WebSocket.OPEN) {
        console.warn('🔄 WebSocket connection lost, attempting to reconnect...');
        this.reconnect();
      }
      
      // Check if we've processed audio recently (within last 5 seconds)
      const now = Date.now();
      if (this.isProcessing && now - this.lastProcessedAudio > 5000) {
        console.warn('⚠️ No audio processed in last 5 seconds despite active processing');
        
        // Try to restart audio processing
        this.stopCapturingMicrophone();
        setTimeout(() => {
          if (this.activeStreamSid) {
            this.startCapturingMicrophone();
          }
        }, 1000);
      }
    }, 5000);
  }

  /**
   * Connect to the streaming WebSocket
   */
  public connect(options: AudioStreamingOptions = {}): Promise<boolean> {
    this.options = options;
    console.log('🎤 [AudioProcessing] Attempting to connect to WebSocket stream', {
      hasExistingSocket: !!this.webSocket,
      existingSocketState: this.webSocket ? this.webSocket.readyState : 'none',
      hasActiveStream: !!this.activeStreamSid,
      userAgent: navigator.userAgent
    });
    
    return new Promise((resolve, reject) => {
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        console.log('🎤 [AudioProcessing] WebSocket already connected');
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
        console.log('🎤 [AudioProcessing] Creating new WebSocket connection');
        this.webSocket = new WebSocket('wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream');
        
        this.webSocket.onopen = () => {
          console.log('🎤 [AudioProcessing] WebSocket connection established for bidirectional audio');
          
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
          console.error('🎤 [AudioProcessing] WebSocket error:', error);
          if (this.options.onConnectionStatus) {
            this.options.onConnectionStatus(false);
          }
          reject(error);
        };
        
        this.webSocket.onclose = (event) => {
          console.log(`🎤 [AudioProcessing] WebSocket connection closed: ${event.code} ${event.reason}`);
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
        console.error('🎤 [AudioProcessing] Error connecting to WebSocket:', err);
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
      console.warn(`🎤 Maximum reconnect attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached`);
      return;
    }
    
    // Exponential backoff with 1s base (1s, 2s, 4s, 8s, 16s)
    const delay = Math.min(30000, Math.pow(2, this.reconnectAttempts) * 1000);
    this.reconnectAttempts++;
    
    console.log(`🎤 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect to the WebSocket
   */
  private reconnect(): void {
    console.log('🎤 Attempting to reconnect WebSocket...');
    
    // Clean up existing connection
    this.cleanup(false);
    
    // Try to reconnect
    this.connect(this.options).catch(err => {
      console.error('🎤 Failed to reconnect:', err);
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
          console.log(`🎤 [AudioProcessing] Stream started: ${data.streamSid} (Call: ${data.callSid})`, data);
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
          console.log('🎤 [AudioProcessing] Stream stopped', {
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
            console.log(`🎤 [AudioProcessing] Received audio chunk #${this.inboundAudioCount}, track: ${data.track || 'unknown'}`, {
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
          console.log(`🎤 [AudioProcessing] Connection established:`, data);
          
          // Check if there are any active streams we should join
          if (data.activeStreams && data.activeStreams.length > 0) {
            console.log(`🎤 [AudioProcessing] Found ${data.activeStreams.length} active streams to join`);
            const stream = data.activeStreams[0]; // Just join the first one for now
            this.activeStreamSid = stream.streamSid;
            
            // Notify as if we received a streamStart event
            if (this.options.onStreamStarted) {
              this.options.onStreamStarted(stream.streamSid, stream.callSid);
            }
            
            // Start capturing microphone
            this.startCapturingMicrophone();
          }
          break;
          
        case 'pong':
          // Ping response received, connection still alive
          break;
          
        case 'mark':
          console.log(`🎤 [AudioProcessing] Mark received: ${data.name || 'unnamed'}`, data);
          break;
          
        case 'dtmf':
          console.log(`🎤 [AudioProcessing] DTMF received: ${data.digit || ''}`, data);
          break;
          
        default:
          console.log(`🎤 [AudioProcessing] Unhandled WebSocket event: ${data.event}`, data);
      }
    } catch (err) {
      console.error('🎤 [AudioProcessing] Error processing WebSocket message:', err, event.data);
    }
  }

  /**
   * Start capturing microphone audio
   */
  public async startCapturingMicrophone(): Promise<boolean> {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      console.error('🎤 [AudioProcessing] Cannot start capturing: WebSocket not connected');
      return false;
    }
    
    if (this.isProcessing) {
      console.log('🎤 [AudioProcessing] Already capturing microphone audio');
      return true;
    }
    
    try {
      console.log('🎤 [AudioProcessing] Requesting microphone access...');
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
      
      console.log('🎤 [AudioProcessing] Microphone access granted', {
        tracks: this.microphoneStream.getAudioTracks().map(t => ({
          label: t.label,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
          constraints: t.getConstraints ? t.getConstraints() : 'not available'
        }))
      });
      
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🎤 [AudioProcessing] Audio context created', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state
      });
      
      // Resume the audio context if it's suspended (autoplay policy)
      if (this.audioContext.state === 'suspended') {
        console.log('🎤 [AudioProcessing] Audio context suspended, attempting to resume...');
        try {
          await this.audioContext.resume();
          console.log('🎤 [AudioProcessing] Audio context resumed:', this.audioContext.state);
        } catch (err) {
          console.error('🎤 [AudioProcessing] Error resuming audio context:', err);
          toast({
            title: "Audio Error",
            description: "Could not start audio processing. Try clicking on the page.",
            variant: "destructive",
          });
        }
      }
      
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
      console.log('🎤 [AudioProcessing] Microphone audio capture started');
      
      // Diagnostic: After 1 second, check if we're getting audio
      setTimeout(() => {
        if (this.isProcessing && this.outboundAudioCount === 0) {
          console.warn('🎤 [AudioProcessing] No audio packets sent after 1 second');
        }
      }, 1000);
      
      return true;
    } catch (err) {
      console.error('🎤 [AudioProcessing] Error starting microphone capture:', err);
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
    
    this.lastProcessedAudio = Date.now();
    
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
      console.log('🎤 [AudioProcessing] Microphone audio level:', {
        rms: rms.toFixed(4),
        audioDetected: rms > 0.005,
        outboundAudioCount: this.outboundAudioCount,
        inboundAudioCount: this.inboundAudioCount,
        isWebSocketOpen: this.webSocket.readyState === WebSocket.OPEN,
        activeStreamSid: this.activeStreamSid
      });
      this.lastAudioLevelLog = now;
    }
    
    // Always send some audio data, even if quiet (needed for stream)
    // Just less frequently if quiet
    const shouldSend = rms > 0.005 || (this.outboundAudioCount % 10 === 0);
    
    if (shouldSend) {
      // Convert to format suitable for WebSocket transmission
      const buffer = new ArrayBuffer(inputData.length * 2);
      const view = new DataView(buffer);
      
      for (let i = 0; i < inputData.length; i++) {
        // Convert Float32 to Int16
        const s = Math.max(-1, Math.min(1, inputData[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      
      try {
        // Convert to base64
        const base64Audio = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
        
        // Send to WebSocket
        const result = this.sendToWebSocket({
          event: 'browser_audio',
          payload: base64Audio,
          timestamp: Date.now(),
          streamSid: this.activeStreamSid
        });
        
        if (result) {
          this.outboundAudioCount++;
          
          if (this.outboundAudioCount % 50 === 0) {
            console.log(`🎤 [AudioProcessing] Sent audio chunk #${this.outboundAudioCount} to WebSocket`, {
              payloadLength: base64Audio.length,
              rms: rms.toFixed(4),
              streamSid: this.activeStreamSid
            });
          }
        }
      } catch (err) {
        console.error('🎤 [AudioProcessing] Error encoding/sending audio:', err);
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
      
      // Log the first few audio chunks in detail
      if (this.inboundAudioCount <= 5) {
        console.log('🎤 [AudioProcessing] First audio chunk details:', {
          bufferSize: buffer.byteLength,
          sampleBytes: new Array(Math.min(20, buffer.byteLength)).fill(0).map((_, i) => bytes[i])
        });
      }
      
      // Decode audio data
      // Note: We're using the deprecated callback pattern for wider browser support
      try {
        this.audioContext.decodeAudioData(buffer, (decodedData) => {
          // Create buffer source
          const source = this.audioContext!.createBufferSource();
          source.buffer = decodedData;
          
          // Connect to destination (speakers)
          source.connect(this.audioContext!.destination);
          
          // Play the audio
          source.start(0);
          
          if (this.inboundAudioCount % 100 === 0) {
            console.log('🎤 [AudioProcessing] Playing received audio', {
              sampleRate: decodedData.sampleRate,
              duration: decodedData.duration,
              numberOfChannels: decodedData.numberOfChannels,
              bufferLength: decodedData.length
            });
          }
        }, 
        (err) => {
          console.error('🎤 [AudioProcessing] Error decoding audio data:', err);
          
          // Log detailed info for troubleshooting
          if (this.inboundAudioCount <= 10) {
            console.log('🎤 [AudioProcessing] Audio decoding error details:', {
              bufferSize: buffer.byteLength,
              isAudioContextActive: this.audioContext?.state,
              audioSample: base64Audio.substring(0, 30) + "..."
            });
          }
        });
      } catch (err) {
        console.error('🎤 [AudioProcessing] Error in decodeAudioData:', err);
      }
    } catch (err) {
      console.error('🎤 [AudioProcessing] Error processing incoming audio:', err);
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
      console.log('🎤 [AudioProcessing] Microphone audio capture stopped');
    } catch (err) {
      console.error('🎤 [AudioProcessing] Error stopping microphone capture:', err);
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
          console.warn('🎤 [AudioProcessing] Failed to send to WebSocket - connection not open', {
            readyState: this.webSocket ? this.webSocket.readyState : 'null',
            event: data.event
          });
        }
      }
    } catch (err) {
      console.error('🎤 [AudioProcessing] Error sending to WebSocket:', err);
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
      payload: audioData,
      timestamp: Date.now()
    });
  }

  /**
   * Force connect to existing stream
   */
  public connectToStream(streamSid: string): boolean {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      console.error('🎤 [AudioProcessing] Cannot connect to stream: WebSocket not connected');
      return false;
    }
    
    this.activeStreamSid = streamSid;
    console.log(`🎤 [AudioProcessing] Manually connected to stream: ${streamSid}`);
    
    // Start capturing microphone
    this.startCapturingMicrophone();
    
    return true;
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
        console.warn('🎤 [AudioProcessing] Error closing audio context:', err);
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
        console.warn('🎤 [AudioProcessing] Error closing WebSocket:', err);
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
      reconnectAttempts: this.reconnectAttempts,
      lastProcessedAudio: this.lastProcessedAudio ? (Date.now() - this.lastProcessedAudio) / 1000 + 's ago' : 'never'
    };
  }
}

// Export singleton instance
export const audioProcessing = new AudioProcessingService();
