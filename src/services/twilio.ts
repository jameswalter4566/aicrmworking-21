import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface TwilioCallResult {
  success: boolean;
  error?: string;
  callSid?: string;
  phoneNumber?: string;
  leadId?: string;
  callStatus?: string;
  phoneCallSid?: string;
  browserCallSid?: string;
  conferenceName?: string;
}

interface TwilioToken {
  token: string;
  identity: string;
  region?: string;
}

class TwilioService {
  private twilioDevice: any = null;
  private activeCall: any = null;
  private token: string | null = null;
  private audioContext: AudioContext | null = null;
  private audioStream: MediaStream | null = null;
  private audioInitialized: boolean = false;
  private microphoneActive: boolean = false;
  private audioDeviceId: string | null = null;
  private cachedDevices: MediaDeviceInfo[] = [];

  constructor() {
    this.initializeAudioContext();
  }

  async initializeAudioContext(): Promise<boolean> {
    if (this.audioContext) {
      return true;
    }

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContext();
      
      // Request microphone access to initialize audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioStream = stream;
        this.microphoneActive = true;
        this.audioInitialized = true;
        
        // Stop tracks immediately after initialization to not keep mic active permanently
        setTimeout(() => {
          if (stream && !this.activeCall) {
            stream.getTracks().forEach(track => track.stop());
          }
        }, 1000);
        
        return true;
      } catch (err) {
        console.error('Error initializing microphone:', err);
        this.microphoneActive = false;
        return false;
      }
    } catch (err) {
      console.error('Error initializing AudioContext:', err);
      return false;
    }
  }

  isMicrophoneActive(): boolean {
    return this.microphoneActive;
  }

  async fetchTwilioToken(): Promise<TwilioToken | null> {
    try {
      const { data, error } = await supabase.functions.invoke('twilio-token', {
        body: {}
      });
      
      if (error) {
        console.error('Error fetching Twilio token:', error);
        return null;
      }
      
      this.token = data.token;
      return data;
    } catch (err) {
      console.error('Failed to fetch Twilio token:', err);
      return null;
    }
  }

  async initializeTwilioDevice(): Promise<boolean> {
    if (!window.Twilio || !window.Twilio.Device) {
      console.error('Twilio SDK not loaded');
      toast.error('Phone system not initialized. Please refresh the page.');
      return false;
    }

    try {
      const tokenData = await this.fetchTwilioToken();
      if (!tokenData || !tokenData.token) {
        toast.error('Authentication error. Please login again.');
        return false;
      }
      
      this.token = tokenData.token;
      
      try {
        if (this.twilioDevice) {
          await this.twilioDevice.destroy();
          this.twilioDevice = null;
        }
        
        this.twilioDevice = new window.Twilio.Device(tokenData.token, {
          codecPreferences: ['opus', 'pcmu'],
          fakeLocalDtmf: true,
          enableRingingState: true,
          sounds: {
            incoming: '/sounds/incoming.mp3',
            outgoing: '/sounds/outgoing.mp3',
            disconnect: '/sounds/disconnect.mp3'
          }
        });
        
        this.setupTwilioEvents();
        
        await this.twilioDevice.register();
        console.log('Twilio device registered successfully.');
        
        return true;
      } catch (err) {
        console.error('Error initializing Twilio device:', err);
        toast.error('Failed to initialize phone system');
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize Twilio device:', error);
      toast.error('Failed to initialize phone system');
      return false;
    }
  }

  private setupTwilioEvents(): void {
    if (!this.twilioDevice) return;
    
    this.twilioDevice.on('registered', () => {
      console.log('Twilio device registered successfully.');
    });
    
    this.twilioDevice.on('error', (error: any) => {
      console.error('Twilio device error:', error);
      
      if (error.code === 31205) {
        toast.error('Authentication expired. Please refresh the page.');
      } else if (error.code === 31000) {
        toast.error('Microphone access denied. Please allow microphone access.');
      } else {
        toast.error(`Phone system error: ${error.message}`);
      }
    });
  }

  async makeCall(phoneNumber: string, leadId: string): Promise<TwilioCallResult> {
    if (!this.twilioDevice) {
      const initialized = await this.initializeTwilioDevice();
      if (!initialized) {
        toast.error('Phone system not initialized');
        return { success: false, error: 'Phone system not initialized' };
      }
    }
    
    try {
      // Ensure microphone is active before placing call
      await this.initializeAudioContext();
      
      if (!this.microphoneActive) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.audioStream = stream;
          this.microphoneActive = true;
        } catch (err) {
          console.error('Error accessing microphone:', err);
          toast.error('Microphone access required for calls');
          return { success: false, error: 'Microphone access required' };
        }
      }
      
      // Use Twilio browser-based calling
      try {
        toast('Dialing...', {
          description: `Calling ${phoneNumber}...`
        });
        
        const call = await this.twilioDevice.connect({
          params: {
            To: phoneNumber,
            leadId: leadId
          }
        });
        
        this.activeCall = call;
        
        console.log('Call initiated:', call);
        
        // Add event listeners to the call
        call.on('accept', () => {
          toast('Call Connected', {
            description: `Connected to ${phoneNumber}`
          });
        });
        
        call.on('disconnect', () => {
          this.activeCall = null;
          toast('Call Ended', {
            description: 'Call has been disconnected'
          });
        });
        
        call.on('error', (error: any) => {
          console.error('Call error:', error);
          toast.error(`Call error: ${error.message || 'Unknown error'}`);
        });
        
        return { 
          success: true, 
          callSid: 'browser-call', 
          phoneNumber,
          leadId
        };
      } catch (error: any) {
        console.error('Error making browser call:', error);
        toast.error(`Call failed: ${error.message || 'Unknown error'}`);
        return { success: false, error: error.message || 'Failed to place call' };
      }
    } catch (error: any) {
      console.error('Error making call:', error);
      toast.error(`Call failed: ${error.message || 'Unknown error'}`);
      return { success: false, error: error.message || 'Failed to place call' };
    }
  }

  async endCall(leadId?: string): Promise<boolean> {
    try {
      if (this.activeCall) {
        await this.activeCall.disconnect();
        this.activeCall = null;
        return true;
      }
      
      if (this.twilioDevice) {
        this.twilioDevice.disconnectAll();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error ending call:', error);
      return false;
    }
  }
  
  async hangupAllCalls(): Promise<boolean> {
    try {
      if (this.twilioDevice) {
        this.twilioDevice.disconnectAll();
        this.activeCall = null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error hanging up all calls:', error);
      return false;
    }
  }
  
  async checkCallStatus(leadId: string): Promise<string> {
    if (!this.activeCall) {
      return 'completed';
    }
    
    return this.activeCall.status();
  }
  
  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error('Media devices API not supported');
        return [];
      }
      
      // Ensure we have permission to access devices
      await this.initializeAudioContext();
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
      
      this.cachedDevices = audioOutputDevices;
      console.log('Available audio devices:', audioOutputDevices);
      
      return audioOutputDevices;
    } catch (err) {
      console.error('Error getting audio devices:', err);
      return [];
    }
  }
  
  async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    try {
      if (!this.twilioDevice) {
        console.warn('Twilio device not initialized');
        return false;
      }
      
      this.audioDeviceId = deviceId;
      
      try {
        // If we have an active call, change its output device
        if (this.activeCall && this.activeCall.getRemoteStream()) {
          const element = document.querySelector('.twilio-audio') as HTMLAudioElement;
          if (element && element.setSinkId) {
            await element.setSinkId(deviceId);
            toast.success('Audio output changed');
            return true;
          }
        }
        
        // Set for future calls
        if (this.twilioDevice.audio && this.twilioDevice.audio.speakerDevices) {
          await this.twilioDevice.audio.speakerDevices.set(deviceId);
          await this.twilioDevice.audio.ringtoneDevices.set(deviceId);
          toast.success('Audio output changed');
          return true;
        }
        
        return false;
      } catch (err) {
        console.error('Error setting audio output device:', err);
        toast.error('Could not change audio device');
        return false;
      }
    } catch (err) {
      console.error('Error setting audio output:', err);
      return false;
    }
  }
  
  async testAudio(deviceId: string): Promise<boolean> {
    try {
      const audio = new Audio('/sounds/test-tone.mp3');
      
      if (deviceId && audio.setSinkId) {
        await audio.setSinkId(deviceId);
      }
      
      audio.play();
      
      toast.success('Testing audio output');
      
      return true;
    } catch (err) {
      console.error('Error testing audio:', err);
      toast.error('Could not test audio output');
      return false;
    }
  }
  
  async getAuthToken(): Promise<string | null> {
    // If we don't have a token yet, fetch one
    if (!this.token) {
      const tokenData = await this.fetchTwilioToken();
      if (!tokenData) {
        return null;
      }
      return tokenData.token;
    }
    
    return this.token;
  }
}

export const twilioService = new TwilioService();
