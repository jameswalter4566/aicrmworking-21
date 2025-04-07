/**
 * Enhanced AudioProcessing service for handling bidirectional audio streams
 * with Twilio WebSocket connections and proper audio queue management
 */
class AudioProcessingService {
  private socket: WebSocket | null = null;
  private connected: boolean = false;
  private audioContext: AudioContext | null = null;
  private audioQueue: Uint8Array[] = [];
  private isProcessingQueue: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private activeStreamSid: string | null = null;
  private activeCallSid: string | null = null;
  private pendingAudioChunks: number = 0;
  private microphoneStream: MediaStream | null = null;
  private audioDevices: MediaDeviceInfo[] = [];
  private currentDeviceId: string = 'default';
  private callbacks = {
    onConnectionStatus: (connected: boolean) => {},
    onStreamStarted: (streamSid: string, callSid: string) => {},
    onStreamEnded: (streamSid: string) => {},
  };

  /**
   * Connect to the Twilio audio streaming WebSocket
   */
  public connect(options?: {
    onConnectionStatus?: (connected: boolean) => void,
    onStreamStarted?: (streamSid: string, callSid: string) => void,
    onStreamEnded?: (streamSid: string) => void,
  }): boolean {
    if (this.socket && this.connected) {
      console.log("WebSocket already connected");
      return true;
    }
    
    // Store callbacks if provided
    if (options) {
      if (options.onConnectionStatus) this.callbacks.onConnectionStatus = options.onConnectionStatus;
      if (options.onStreamStarted) this.callbacks.onStreamStarted = options.onStreamStarted;
      if (options.onStreamEnded) this.callbacks.onStreamEnded = options.onStreamEnded;
    }
    
    try {
      console.log("Connecting to audio streaming WebSocket...");
      
      // Create WebSocket connection to Supabase Edge Function
      this.socket = new WebSocket('wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream');
      
      this.socket.onopen = this.handleSocketOpen.bind(this);
      this.socket.onmessage = this.handleSocketMessage.bind(this);
      this.socket.onclose = this.handleSocketClose.bind(this);
      this.socket.onerror = this.handleSocketError.bind(this);
      
      // Initialize the audio context for processing
      this.initializeAudioContext();
      
      return true;
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      this.callbacks.onConnectionStatus(false);
      return false;
    }
  }

  /**
   * Get available audio output devices
   */
  public async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('MediaDevices API not supported in this browser');
        return [];
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.audioDevices = devices.filter(device => device.kind === 'audiooutput');
      console.log("Available audio devices:", this.audioDevices);
      return this.audioDevices;
    } catch (error) {
      console.error("Failed to enumerate audio devices:", error);
      return [];
    }
  }

  /**
   * Set audio output device
   */
  public async setAudioDevice(deviceId: string): Promise<boolean> {
    try {
      this.currentDeviceId = deviceId;
      
      // Find audio elements to update
      const audioElements = document.querySelectorAll('audio');
      if (audioElements.length === 0) {
        console.log("No audio elements found to update device");
      }
      
      // Update each audio element to use the selected device
      for (const audioEl of audioElements) {
        if ('setSinkId' in audioEl) {
          try {
            await (audioEl as any).setSinkId(deviceId);
            console.log(`Set audio element to device: ${deviceId}`);
          } catch (err) {
            console.error(`Could not set sink ID for audio element:`, err);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error("Failed to set audio device:", error);
      return false;
    }
  }

  /**
   * Start capturing microphone audio for bidirectional streaming
   */
  public async startCapturingMicrophone(): Promise<boolean> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia not supported in this browser");
      return false;
    }
    
    try {
      if (this.microphoneStream) {
        // Already capturing
        return true;
      }
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      this.microphoneStream = stream;
      console.log("Microphone access granted for audio capture");
      return true;
    } catch (error) {
      console.error("Failed to access microphone:", error);
      return false;
    }
  }

  /**
   * Stop capturing microphone audio
   */
  public stopCapturingMicrophone(): void {
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => {
        track.stop();
      });
      
      this.microphoneStream = null;
      console.log("Microphone capture stopped");
    }
  }

  /**
   * Get diagnostic information about audio processing
   */
  public getDiagnostics(): object {
    return {
      isWebSocketConnected: this.connected,
      webSocketState: this.socket ? this.socket.readyState : 'disconnected',
      activeStreamSid: this.activeStreamSid,
      isProcessing: this.isProcessingQueue,
      inboundAudioCount: this.pendingAudioChunks,
      outboundAudioCount: 0,  // Placeholder
      microphoneActive: !!this.microphoneStream,
      audioContextState: this.audioContext ? this.audioContext.state : 'closed',
      reconnectAttempts: this.reconnectAttempts,
      lastProcessedAudio: this.pendingAudioChunks > 0 ? new Date().toISOString() : 'never',
      audioQueueLength: this.audioQueue.length,
      isPlaying: this.isProcessingQueue,
      selectedDevice: this.currentDeviceId,
      availableDevices: this.audioDevices.length
    };
  }

  /**
   * Initialize the AudioContext for processing audio
   */
  private initializeAudioContext(): void {
    try {
      // Create AudioContext if supported
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass({
          latencyHint: 'interactive',
          sampleRate: 48000
        });
        
        // Create initial silent sound to activate audio context
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.01; // Very quiet
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start(0);
        oscillator.stop(this.audioContext.currentTime + 0.001);
      }
    } catch (error) {
      console.error("Failed to initialize AudioContext:", error);
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleSocketOpen(): void {
    console.log("WebSocket connection established");
    this.connected = true;
    this.reconnectAttempts = 0;
    
    // Send browser_connect message
    this.socket?.send(JSON.stringify({
      event: 'browser_connect',
      timestamp: Date.now()
    }));
    
    // Start heartbeat to keep connection alive
    this.startHeartbeat();
    
    // Notify via callback
    this.callbacks.onConnectionStatus(true);
  }

  /**
   * Handle WebSocket message event
   */
  private handleSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.event) {
        case 'streamStart':
          this.handleStreamStart(data);
          break;
          
        case 'streamStop':
          this.handleStreamStop(data);
          break;
          
        case 'audio':
          this.handleAudioData(data);
          break;
          
        case 'browser_connected':
        case 'connection_established':
          console.log("WebSocket connection acknowledged by server");
          break;
          
        case 'pong':
          // Heartbeat response, nothing to do
          break;
          
        default:
          console.log("Received WebSocket message:", data.event);
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  }

  /**
   * Handle stream start event
   */
  private handleStreamStart(data: any): void {
    console.log("Stream started:", data);
    this.activeStreamSid = data.streamSid;
    this.activeCallSid = data.callSid;
    
    // Notify via callback
    this.callbacks.onStreamStarted(data.streamSid, data.callSid);
  }

  /**
   * Handle stream stop event
   */
  private handleStreamStop(data: any): void {
    console.log("Stream stopped:", data);
    
    // Notify via callback if we had an active stream
    if (this.activeStreamSid) {
      this.callbacks.onStreamEnded(this.activeStreamSid);
    }
    
    // Clear active stream IDs
    this.activeStreamSid = null;
    this.activeCallSid = null;
    
    // Clear audio queue
    this.audioQueue = [];
    this.pendingAudioChunks = 0;
  }

  /**
   * Handle incoming audio data
   */
  private handleAudioData(data: any): void {
    if (!data.payload) return;
    
    try {
      // Decode and queue audio data
      const binary = atob(data.payload);
      const bytes = new Uint8Array(binary.length);
      
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // Add to audio queue
      this.audioQueue.push(bytes);
      this.pendingAudioChunks++;
      
      // Process queue if not already processing
      if (!this.isProcessingQueue) {
        this.processAudioQueue();
      }
      
      // We periodically log audio chunk receipts to verify audio is coming through
      if (this.pendingAudioChunks % 50 === 0) {
        console.log(`Received ${this.pendingAudioChunks} audio chunks total`);
      }
    } catch (error) {
      console.error("Error processing audio data:", error);
    }
  }

  /**
   * Process the audio queue
   */
  private processAudioQueue(): void {
    if (this.audioQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      // Get next audio chunk
      const audioChunk = this.audioQueue.shift();
      
      if (!audioChunk) {
        this.isProcessingQueue = false;
        return;
      }
      
      // Play audio if we have an AudioContext
      if (this.audioContext) {
        this.playAudioChunk(audioChunk);
      } else {
        // Try to play using standard audio element as fallback
        this.playAudioFallback(audioChunk);
      }
      
      // Continue processing queue
      setTimeout(() => this.processAudioQueue(), 20);
    } catch (error) {
      console.error("Error processing audio queue:", error);
      this.isProcessingQueue = false;
    }
  }

  /**
   * Play audio chunk using AudioContext
   */
  private playAudioChunk(audioChunk: Uint8Array): void {
    if (!this.audioContext) return;
    
    try {
      // Create audio buffer
      const audioBuffer = this.audioContext.createBuffer(1, audioChunk.length / 2, 48000);
      const channelData = audioBuffer.getChannelData(0);
      
      // Convert to float audio data
      for (let i = 0; i < audioChunk.length / 2; i++) {
        const index = i * 2;
        const value = (audioChunk[index] & 0xff) | (audioChunk[index + 1] << 8);
        channelData[i] = value / 32768.0;
      }
      
      // Play audio
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.error("Error playing audio chunk:", error);
    }
  }

  /**
   * Play audio using standard audio element (fallback)
   */
  private playAudioFallback(audioChunk: Uint8Array): void {
    try {
      const blob = new Blob([audioChunk], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
      };
      
      audio.onerror = (err) => {
        console.error("Audio playback error:", err);
        URL.revokeObjectURL(url);
      };
      
      audio.play().catch(err => {
        console.error("Could not play audio:", err);
      });
    } catch (error) {
      console.error("Error with fallback audio playback:", error);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleSocketClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.connected = false;
    this.socket = null;
    
    // Clear active stream IDs
    this.activeStreamSid = null;
    this.activeCallSid = null;
    
    // Notify via callback
    this.callbacks.onConnectionStatus(false);
    
    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000 && event.code !== 1001) {
      this.attemptReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleSocketError(error: Event): void {
    console.error("WebSocket error:", error);
    
    // Socket will close after an error, which will trigger reconnect logic
  }

  /**
   * Attempt to reconnect to the WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Max reconnect attempts (${this.maxReconnectAttempts}) reached, giving up`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    console.log(`Will attempt to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      console.log("Attempting to reconnect WebSocket...");
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    const interval = setInterval(() => {
      if (this.socket && this.connected) {
        console.log("Ping sent to server");
        this.socket.send(JSON.stringify({
          event: 'ping',
          timestamp: Date.now()
        }));
      } else {
        clearInterval(interval);
      }
    }, 15000);
  }

  /**
   * Test audio playback with the specified device
   */
  public async testAudio(deviceId?: string): Promise<boolean> {
    try {
      const audio = new Audio('/sounds/dialtone.mp3');
      
      if (deviceId && 'setSinkId' in audio) {
        await (audio as any).setSinkId(deviceId);
      }
      
      audio.volume = 0.5;
      await audio.play();
      
      // Stop after 1 second
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 1000);
      
      return true;
    } catch (error) {
      console.error("Error testing audio:", error);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.connected = false;
    this.activeStreamSid = null;
    this.activeCallSid = null;
    this.audioQueue = [];
    this.pendingAudioChunks = 0;
    
    // Stop microphone capture if active
    this.stopCapturingMicrophone();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(err => {
        console.warn("Error closing audio context:", err);
      });
      this.audioContext = null;
    }
  }
}

export const audioProcessing = new AudioProcessingService();
