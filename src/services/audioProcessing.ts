// Ensure this matches the existing imports and interface
import { twilioAudioService } from './twilio-audio';

interface ConnectionCallbacks {
  onConnectionStatus?: (connected: boolean) => void;
  onStreamStarted?: (streamSid: string, callSid: string) => void;
  onStreamEnded?: (streamSid: string) => void;
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
  twilioAudioAvailable?: boolean;
}

class AudioProcessingService {
  private webSocket: WebSocket | null = null;
  private isConnected: boolean = false;
  private activeStreamSid: string | null = null;
  private callSid: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 1000;
  private audioContext: AudioContext | null = null;
  private microphoneStream: MediaStream | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private lastPingTime: number = 0;
  private pingInterval: number | null = null;
  private inboundAudioCount: number = 0;
  private outboundAudioCount: number = 0;
  private lastProcessedAudio: string = '';
  private audioQueue: string[] = [];
  private isProcessing: boolean = false;
  private currentCallbacks: ConnectionCallbacks | null = null;
  private selectedAudioDevice: string = 'default';
  private isPlaying: boolean = false;

  // Method to connect to WebSocket for audio streaming
  async connect(callbacks?: ConnectionCallbacks): Promise<boolean> {
    console.log("Connecting to audio streaming WebSocket...");
    
    this.currentCallbacks = callbacks || null;
    
    if (this.webSocket && (this.webSocket.readyState === WebSocket.OPEN || this.webSocket.readyState === WebSocket.CONNECTING)) {
      console.log("WebSocket already connected or connecting");
      return true;
    }
    
    try {
      // First get list of audio devices for diagnostics
      const audioDevices = await this.getAudioDevices();
      console.log("Available audio devices:", audioDevices);
      
      // Create WebSocket connection
      this.webSocket = new WebSocket('wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream');
      
      this.webSocket.onopen = () => {
        console.log("WebSocket connection opened for stream");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send browser_connect message
        this.sendMessage({
          event: 'browser_connect',
          timestamp: Date.now()
        });
        
        // Start ping interval to keep connection alive
        this.startPingInterval();
        
        if (callbacks?.onConnectionStatus) {
          callbacks.onConnectionStatus(true);
        }
      };
      
      this.webSocket.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };
      
      this.webSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
      
      this.webSocket.onclose = () => {
        console.log("WebSocket connection closed");
        this.isConnected = false;
        this.cleanupAudioResources();
        
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        
        if (callbacks?.onConnectionStatus) {
          callbacks.onConnectionStatus(false);
        }
        
        // Attempt to reconnect
        this.attemptReconnection();
      };
      
      return true;
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      return false;
    }
  }
  
  // Handle WebSocket messages
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.event) {
        case 'streamStart':
          this.activeStreamSid = data.streamSid;
          this.callSid = data.callSid;
          console.log(`Stream started: ${data.streamSid}, Call: ${data.callSid}`);
          
          // Start capturing audio from microphone
          this.startCapturingMicrophone();
          
          if (this.currentCallbacks?.onStreamStarted) {
            this.currentCallbacks.onStreamStarted(data.streamSid, data.callSid);
          }
          break;
          
        case 'streamStop':
          console.log(`Stream stopped: ${data.streamSid}`);
          this.cleanupAudioResources();
          
          if (this.currentCallbacks?.onStreamEnded && this.activeStreamSid) {
            this.currentCallbacks.onStreamEnded(this.activeStreamSid);
          }
          
          this.activeStreamSid = null;
          this.callSid = null;
          break;
          
        case 'media':
          // Handle incoming audio data
          this.inboundAudioCount++;
          // Process audio data here if needed
          break;
          
        case 'connection_established':
          console.log("WebSocket connection confirmed: connection_established");
          break;
          
        case 'browser_connected':
          console.log("WebSocket connection confirmed: browser_connected");
          break;
          
        case 'pong':
          this.lastPingTime = Date.now();
          console.log("Received pong from server, connection is alive");
          break;
          
        default:
          // Unknown event type
          break;
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }
  
  // Start capturing microphone audio
  public async startCapturingMicrophone(): Promise<boolean> {
    // First try to use Twilio audio service if available
    if (twilioAudioService && window.Twilio?.Device?.audio) {
      try {
        // Set audio constraints via Twilio
        await twilioAudioService.setAudioConstraints({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        return true;
      } catch (err) {
        console.error("Error configuring Twilio audio:", err);
        // Fall back to default audio capture
      }
    }
    
    // Default audio capture
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia not supported in this browser");
      return false;
    }
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.microphoneStream = stream;
      
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create script processor for audio processing
      const source = this.audioContext.createMediaStreamSource(stream);
      this.audioProcessor = this.audioContext.createScriptProcessor(1024, 1, 1);
      
      // Process audio data
      this.audioProcessor.onaudioprocess = (e) => {
        if (!this.webSocket || 
            this.webSocket.readyState !== WebSocket.OPEN || 
            !this.activeStreamSid) {
          return;
        }
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Check for voice activity
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        
        if (rms > 0.01) {  // Voice activity detection threshold
          const buffer = new ArrayBuffer(inputData.length * 2);
          const view = new DataView(buffer);
          
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          }
          
          const base64Audio = btoa(
            String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer)))
          );
          
          this.sendAudioData(base64Audio);
        }
      };
      
      source.connect(this.audioProcessor);
      this.audioProcessor.connect(this.audioContext.destination);
      
      return true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      return false;
    }
  }
  
  // Stop capturing microphone audio
  public stopCapturingMicrophone(): void {
    // First try to use Twilio audio service if available
    if (twilioAudioService && window.Twilio?.Device?.audio) {
      twilioAudioService.clearAudioConstraints()
        .catch(err => console.error("Error clearing Twilio audio constraints:", err));
    }
    
    this.cleanupAudioResources();
  }
  
  // Clean up audio processing resources
  private cleanupAudioResources(): void {
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(err => {
        console.warn("Error closing AudioContext:", err);
      });
      this.audioContext = null;
    }
    
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
  }
  
  // Send audio data to the WebSocket
  private sendAudioData(base64Audio: string): void {
    if (!this.webSocket || 
        this.webSocket.readyState !== WebSocket.OPEN || 
        !this.activeStreamSid) {
      return;
    }
    
    this.sendMessage({
      event: 'media',
      streamSid: this.activeStreamSid,
      media: {
        payload: base64Audio
      }
    });
    
    this.outboundAudioCount++;
    this.lastProcessedAudio = base64Audio.substring(0, 20) + '...';
  }
  
  // Send a message to the WebSocket
  private sendMessage(message: any): void {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      this.webSocket.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending message to WebSocket:", error);
    }
  }
  
  // Start ping interval to keep connection alive
  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.lastPingTime = Date.now();
    
    this.pingInterval = window.setInterval(() => {
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        console.log("Ping sent to server");
        this.sendMessage({
          event: 'ping',
          timestamp: Date.now()
        });
      }
    }, 30000);  // Send ping every 30 seconds
  }
  
  // Try to reconnect after connection closed
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Maximum reconnection attempts reached");
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Will attempt to reconnect in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      console.log("Attempting to reconnect WebSocket...");
      this.connect(this.currentCallbacks);
    }, this.reconnectInterval);
  }
  
  // Clean up all resources
  public cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.cleanupAudioResources();
    
    if (this.webSocket && this.webSocket.readyState !== WebSocket.CLOSED) {
      this.webSocket.close();
      this.webSocket = null;
    }
    
    this.isConnected = false;
    this.activeStreamSid = null;
    this.callSid = null;
    this.reconnectAttempts = 0;
  }
  
  // Test audio output
  public async testAudio(deviceId?: string): Promise<boolean> {
    // First try to use Twilio audio service if available
    if (twilioAudioService && window.Twilio?.Device?.audio) {
      return twilioAudioService.testSpeakerDevice(deviceId);
    }
    
    try {
      this.isPlaying = true;
      
      const audio = new Audio('/sounds/dialtone.mp3');
      
      if (deviceId && 'setSinkId' in audio) {
        await (audio as any).setSinkId(deviceId);
        console.log(`Audio output device set to ${deviceId}`);
      }
      
      audio.volume = 0.3;
      await audio.play();
      
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        this.isPlaying = false;
      }, 1000);
      
      return true;
    } catch (error) {
      console.error("Error testing audio:", error);
      this.isPlaying = false;
      return false;
    }
  }
  
  // Get list of audio devices
  public async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    // First try to use Twilio audio service if available
    if (twilioAudioService && window.Twilio?.Device?.audio) {
      const outputDevices = await twilioAudioService.getOutputDevices();
      return outputDevices as MediaDeviceInfo[];
    }
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }
      
      // Request microphone access to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => {
          console.log("Could not get microphone permissions");
        });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audiooutput');
    } catch (error) {
      console.error("Error getting audio devices:", error);
      return [];
    }
  }
  
  // Set audio output device
  public async setAudioDevice(deviceId: string): Promise<boolean> {
    // First try to use Twilio audio service if available
    if (twilioAudioService && window.Twilio?.Device?.audio) {
      return twilioAudioService.setSpeakerDevice(deviceId);
    }
    
    try {
      this.selectedAudioDevice = deviceId;
      
      // Update all existing audio elements
      const audioElements = document.querySelectorAll('audio');
      for (let i = 0; i < audioElements.length; i++) {
        const audio = audioElements[i] as HTMLAudioElement;
        if ('setSinkId' in audio) {
          await (audio as any).setSinkId(deviceId);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error setting audio device:", error);
      return false;
    }
  }
  
  // Get diagnostic information
  public getDiagnostics(): AudioDiagnostics {
    return {
      isWebSocketConnected: this.isConnected,
      webSocketState: this.webSocket ? 
        ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.webSocket.readyState] : 'NONE',
      activeStreamSid: this.activeStreamSid,
      isProcessing: this.isProcessing,
      inboundAudioCount: this.inboundAudioCount,
      outboundAudioCount: this.outboundAudioCount,
      microphoneActive: !!this.microphoneStream,
      audioContextState: this.audioContext ? this.audioContext.state : 'none',
      reconnectAttempts: this.reconnectAttempts,
      lastProcessedAudio: this.lastProcessedAudio,
      audioQueueLength: this.audioQueue.length,
      isPlaying: this.isPlaying,
      selectedDevice: this.selectedAudioDevice,
      availableDevices: 0,  // Will be filled in by the caller
      twilioAudioAvailable: !!window.Twilio?.Device?.audio
    };
  }
}

export const audioProcessing = new AudioProcessingService();
