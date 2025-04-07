
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
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private outputGainNode: GainNode | null = null;

  constructor() {
    this.connectionCheckInterval = window.setInterval(() => {
      if (this.webSocket && this.activeStreamSid && 
          this.webSocket.readyState !== WebSocket.OPEN) {
        console.warn('🔄 WebSocket connection lost, attempting to reconnect...');
        this.reconnect();
      }
      
      const now = Date.now();
      if (this.isProcessing && now - this.lastProcessedAudio > 5000) {
        console.warn('⚠️ No audio processed in last 5 seconds despite active processing');
        
        this.stopCapturingMicrophone();
        setTimeout(() => {
          if (this.activeStreamSid) {
            this.startCapturingMicrophone();
          }
        }, 1000);
      }
    }, 5000);
  }

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
        if (this.reconnectTimeout !== null) {
          window.clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }

        console.log('🎤 [AudioProcessing] Creating new WebSocket connection');
        this.webSocket = new WebSocket('wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream');
        
        this.webSocket.onopen = () => {
          console.log('🎤 [AudioProcessing] WebSocket connection established for bidirectional audio');
          
          this.sendToWebSocket({
            event: 'browser_connect',
            timestamp: Date.now()
          });
          
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

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.warn(`🎤 Maximum reconnect attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached`);
      return;
    }
    
    const delay = Math.min(30000, Math.pow(2, this.reconnectAttempts) * 1000);
    this.reconnectAttempts++;
    
    console.log(`🎤 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  private reconnect(): void {
    console.log('🎤 Attempting to reconnect WebSocket...');
    
    this.cleanup(false);
    
    this.connect(this.options).catch(err => {
      console.error('🎤 Failed to reconnect:', err);
      this.scheduleReconnect();
    });
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.event) {
        case 'streamStart':
          console.log(`🎤 [AudioProcessing] Stream started: ${data.streamSid} (Call: ${data.callSid})`, data);
          this.activeStreamSid = data.streamSid;
          this.inboundAudioCount = 0;
          this.outboundAudioCount = 0;
          
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
          
          if (data.activeStreams && data.activeStreams.length > 0) {
            console.log(`🎤 [AudioProcessing] Found ${data.activeStreams.length} active streams to join`);
            const stream = data.activeStreams[0];
            this.activeStreamSid = stream.streamSid;
            
            if (this.options.onStreamStarted) {
              this.options.onStreamStarted(stream.streamSid, stream.callSid);
            }
            
            this.startCapturingMicrophone();
          }
          break;
          
        case 'pong':
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
      console.error('🎤 [AudioProcessing] Error processing WebSocket message:', err);
    }
  }

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
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000
      });
      
      console.log('🎤 [AudioProcessing] Audio context created', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state
      });
      
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
      
      this.microphoneSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
      
      // Create gain node for output control
      this.outputGainNode = this.audioContext.createGain();
      this.outputGainNode.gain.value = 1.0; // Full volume
      this.outputGainNode.connect(this.audioContext.destination);
      
      this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);
      
      this.processorNode.onaudioprocess = this.processAudio.bind(this);
      
      this.microphoneSource.connect(this.processorNode);
      this.processorNode.connect(this.outputGainNode);
      
      this.isProcessing = true;
      console.log('🎤 [AudioProcessing] Microphone audio capture started');
      
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

  private processAudio(e: AudioProcessingEvent): void {
    if (!this.webSocket || 
        this.webSocket.readyState !== WebSocket.OPEN || 
        !this.activeStreamSid) {
      return;
    }
    
    this.lastProcessedAudio = Date.now();
    
    const inputBuffer = e.inputBuffer;
    const inputData = inputBuffer.getChannelData(0);
    
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sum / inputData.length);
    
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
    
    // Send audio packets more frequently when sound is detected
    // Also send periodic packets even during silence to maintain the connection
    const shouldSend = rms > 0.005 || (this.outboundAudioCount % 10 === 0);
    
    if (shouldSend) {
      const buffer = new ArrayBuffer(inputData.length * 2);
      const view = new DataView(buffer);
      
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      
      try {
        const base64Audio = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
        
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

  private async playAudio(base64Audio: string): Promise<void> {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🎤 Created new audio context for playback:', {
          sampleRate: this.audioContext.sampleRate,
          state: this.audioContext.state
        });
        
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        
        // Create gain node
        this.outputGainNode = this.audioContext.createGain();
        this.outputGainNode.gain.value = 1.0;
        this.outputGainNode.connect(this.audioContext.destination);
      } catch (err) {
        console.error('🎤 Error creating audio context for playback:', err);
        return;
      }
    }
    
    try {
      const binary = atob(base64Audio);
      const buffer = new ArrayBuffer(binary.length);
      const bytes = new Uint8Array(buffer);
      
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      if (this.inboundAudioCount <= 5) {
        console.log('🎤 [AudioProcessing] First audio chunk details:', {
          bufferSize: buffer.byteLength,
          sampleBytes: new Array(Math.min(20, buffer.byteLength)).fill(0).map((_, i) => bytes[i])
        });
      }
      
      // Add to the queue
      this.audioQueue.push(buffer);
      
      // Start playback if not already playing
      if (!this.isPlaying) {
        this.playNextAudio();
      }
    } catch (err) {
      console.error('🎤 [AudioProcessing] Error processing incoming audio:', err);
    }
  }

  private async playNextAudio(): Promise<void> {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }
    
    this.isPlaying = true;
    
    try {
      const buffer = this.audioQueue.shift()!;
      const decodedData = await this.decodeAudioData(buffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = decodedData;
      
      // Connect through gain node
      source.connect(this.outputGainNode!);
      
      source.start(0);
      
      // When this chunk finishes, play the next one
      source.onended = () => {
        this.playNextAudio();
      };
      
      if (this.inboundAudioCount % 100 === 0) {
        console.log('🎤 [AudioProcessing] Playing received audio', {
          sampleRate: decodedData.sampleRate,
          duration: decodedData.duration,
          numberOfChannels: decodedData.numberOfChannels,
          bufferLength: decodedData.length,
          queueLength: this.audioQueue.length
        });
      }
    } catch (err) {
      console.error('🎤 [AudioProcessing] Error playing audio chunk:', err);
      // Continue with next audio chunk
      this.playNextAudio();
    }
  }

  private decodeAudioData(buffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      if (!this.audioContext) {
        reject(new Error('No audio context available'));
        return;
      }
      
      if (this.audioContext.decodeAudioData.length === 1) {
        this.audioContext.decodeAudioData(buffer).then(resolve).catch(reject);
      } else {
        this.audioContext.decodeAudioData(
          buffer, 
          (decodedData) => resolve(decodedData),
          (err) => reject(err)
        );
      }
    });
  }

  public stopCapturingMicrophone(): void {
    try {
      if (this.processorNode && this.audioContext) {
        this.processorNode.disconnect();
        this.processorNode = null;
      }
      
      if (this.microphoneSource) {
        this.microphoneSource.disconnect();
        this.microphoneSource = null;
      }
      
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

  private sendToWebSocket(data: any): boolean {
    try {
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.send(JSON.stringify(data));
        return true;
      } else {
        if (data.event !== 'ping') {
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

  public connectToStream(streamSid: string): boolean {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      console.error('🎤 [AudioProcessing] Cannot connect to stream: WebSocket not connected');
      return false;
    }
    
    this.activeStreamSid = streamSid;
    console.log(`🎤 [AudioProcessing] Manually connected to stream: ${streamSid}`);
    
    this.startCapturingMicrophone();
    
    return true;
  }

  public cleanup(closeSocket: boolean = true): void {
    this.stopCapturingMicrophone();
    
    if (this.pingInterval !== null) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (err) {
        console.warn('🎤 [AudioProcessing] Error closing audio context:', err);
      }
      this.audioContext = null;
      this.outputGainNode = null;
    }
    
    this.audioQueue = [];
    this.isPlaying = false;
    
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
      lastProcessedAudio: this.lastProcessedAudio ? (Date.now() - this.lastProcessedAudio) / 1000 + 's ago' : 'never',
      audioQueueLength: this.audioQueue.length,
      isPlaying: this.isPlaying
    };
  }
  
  // Add a method to test the audio output
  public async testAudio(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        await this.initAudioContext();
      }
      
      if (!this.audioContext) {
        return false;
      }
      
      // Generate a test tone
      const oscillator = this.audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // 440 Hz (A4)
      
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime); // Low volume
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.start();
      
      // Play for 0.5 seconds
      setTimeout(() => {
        oscillator.stop();
        oscillator.disconnect();
        gainNode.disconnect();
      }, 500);
      
      return true;
    } catch (err) {
      console.error('🎤 [AudioProcessing] Error testing audio output:', err);
      return false;
    }
  }
  
  private async initAudioContext(): Promise<AudioContext | null> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          latencyHint: 'interactive',
          sampleRate: 48000
        });
        
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        
        this.outputGainNode = this.audioContext.createGain();
        this.outputGainNode.gain.value = 1.0;
        this.outputGainNode.connect(this.audioContext.destination);
      }
      
      return this.audioContext;
    } catch (err) {
      console.error('🎤 [AudioProcessing] Error initializing audio context:', err);
      return null;
    }
  }
  
  // Add method to set output volume
  public setVolume(volume: number): void {
    if (this.outputGainNode) {
      const safeVolume = Math.max(0, Math.min(1, volume));
      this.outputGainNode.gain.value = safeVolume;
      console.log(`🎤 [AudioProcessing] Output volume set to ${safeVolume}`);
    }
  }
}

export const audioProcessing = new AudioProcessingService();
