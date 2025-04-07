
// src/services/twilio-audio.ts
interface InputVolumeCallback {
  (volume: number): void;
}

interface DeviceChangeCallback {
  (): void;
}

class TwilioAudioService {
  private device: any = null;
  private outputDevices: MediaDeviceInfo[] = [];
  private currentOutputDevice: string = 'default';
  private inputVolumeListeners: InputVolumeCallback[] = [];
  private deviceChangeListeners: DeviceChangeCallback[] = [];
  private volumeInterval: number | null = null;
  private deviceInitialized: boolean = false;
  private sounds: { [key: string]: HTMLAudioElement } = {};
  
  constructor() {
    // Create common sounds - we create them once and reuse
    this.createSounds();
    
    // Set up device change listener
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange.bind(this));
    }
  }
  
  private createSounds() {
    const soundFiles = {
      'incoming': '/sounds/incoming.mp3',
      'outgoing': '/sounds/outgoing.mp3',
      'disconnect': '/sounds/disconnect.mp3',
      'dtmf0': '/sounds/dtmf-0.mp3',
      'dtmf1': '/sounds/dtmf-1.mp3',
      'dtmf2': '/sounds/dtmf-2.mp3',
      'dtmf3': '/sounds/dtmf-3.mp3',
      'dtmf4': '/sounds/dtmf-4.mp3',
      'dtmf5': '/sounds/dtmf-5.mp3',
      'dtmf6': '/sounds/dtmf-6.mp3',
      'dtmf7': '/sounds/dtmf-7.mp3',
      'dtmf8': '/sounds/dtmf-8.mp3',
      'dtmf9': '/sounds/dtmf-9.mp3',
      'dtmfstar': '/sounds/dtmf-star.mp3',
      'dtmfpound': '/sounds/dtmf-pound.mp3',
      'dialtone': '/sounds/dialtone.mp3',
      'test': '/sounds/test-tone.mp3'
    };
    
    // Create audio elements for each sound
    Object.entries(soundFiles).forEach(([name, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 0.3;
      this.sounds[name] = audio;
    });
  }
  
  initialize(twilioDevice: any) {
    if (!twilioDevice) {
      console.error('Cannot initialize TwilioAudioService without a valid device');
      return false;
    }
    
    this.device = twilioDevice;
    console.log('Twilio Audio service initialized');
    
    // Add device listeners
    this.setupDeviceListeners();
    
    // Start volume monitoring
    this.startVolumeMonitoring();
    
    // Get available output devices
    this.refreshOutputDevices();
    
    this.deviceInitialized = true;
    return true;
  }
  
  private setupDeviceListeners() {
    if (!this.device) return;
    
    // Listen for device state changes
    if (this.device.audio) {
      this.device.audio.on('deviceChange', (lostActiveDevices: any[]) => {
        console.log('Audio devices changed', { lostActiveDevices });
        this.refreshOutputDevices();
        this.notifyDeviceChangeListeners();
      });
    }
  }
  
  private startVolumeMonitoring() {
    // Stop any existing monitoring
    if (this.volumeInterval) {
      window.clearInterval(this.volumeInterval);
    }
    
    // Start new monitoring
    this.volumeInterval = window.setInterval(() => {
      if (this.inputVolumeListeners.length > 0) {
        // Simulate volume levels for testing when no real audio
        const simulatedVolume = Math.random() * 0.2;
        this.notifyVolumeListeners(simulatedVolume);
      }
    }, 200);
  }
  
  private handleDeviceChange() {
    console.log('Media devices changed');
    this.refreshOutputDevices();
    this.notifyDeviceChangeListeners();
  }
  
  private notifyVolumeListeners(volume: number) {
    this.inputVolumeListeners.forEach(listener => {
      try {
        listener(volume);
      } catch (err) {
        console.error('Error in volume listener:', err);
      }
    });
  }
  
  private notifyDeviceChangeListeners() {
    this.deviceChangeListeners.forEach(listener => {
      try {
        listener();
      } catch (err) {
        console.error('Error in device change listener:', err);
      }
    });
  }
  
  async refreshOutputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      // Try to use native API first
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('This browser does not support enumerating devices');
        return [];
      }
      
      // Get permission if needed (helps get device labels)
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            // Release the stream immediately
            stream.getTracks().forEach(track => track.stop());
          })
          .catch(() => {
            console.warn('Could not get microphone permissions');
          });
      } catch (err) {
        // Ignore, just proceed with available devices
      }
      
      // Get all devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.outputDevices = devices.filter(device => device.kind === 'audiooutput');
      
      console.log('Available audio devices:', this.outputDevices.map(d => ({ 
        deviceId: d.deviceId, 
        label: d.label || 'Unlabeled device'
      })));
      
      return this.outputDevices;
    } catch (err) {
      console.error('Error refreshing output devices:', err);
      return [];
    }
  }
  
  getOutputDevices(): MediaDeviceInfo[] {
    return this.outputDevices;
  }
  
  getCurrentOutputDevice(): string {
    return this.currentOutputDevice;
  }
  
  async setSpeakerDevice(deviceId: string): Promise<boolean> {
    try {
      if (!deviceId) return false;
      
      console.log(`Setting audio output device to: ${deviceId}`);
      this.currentOutputDevice = deviceId;
      
      // Apply this device to all our sound elements
      for (const sound of Object.values(this.sounds)) {
        if ('setSinkId' in sound) {
          try {
            await (sound as any).setSinkId(deviceId);
          } catch (err) {
            console.warn('Error setting sink ID for sound:', err);
          }
        }
      }
      
      // Also find and update any audio elements on the page
      const audioElements = document.querySelectorAll('audio');
      for (const audio of audioElements) {
        if ('setSinkId' in audio) {
          try {
            await (audio as any).setSinkId(deviceId);
          } catch (err) {
            // Ignore errors for elements we can't control
          }
        }
      }
      
      return true;
    } catch (err) {
      console.error('Error setting speaker device:', err);
      return false;
    }
  }
  
  async testSpeakerDevice(deviceId?: string): Promise<boolean> {
    try {
      const testDeviceId = deviceId || this.currentOutputDevice;
      
      // Create a test audio element
      const audioElement = this.sounds['test'] || this.sounds['dialtone'] || new Audio('/sounds/dialtone.mp3');
      
      if (testDeviceId && 'setSinkId' in audioElement) {
        try {
          await (audioElement as any).setSinkId(testDeviceId);
        } catch (err) {
          console.warn('Error setting sink ID for test:', err);
        }
      }
      
      // Set volume and play
      audioElement.volume = 0.3;
      audioElement.currentTime = 0;
      await audioElement.play();
      
      // Stop after 1 second
      setTimeout(() => {
        audioElement.pause();
        audioElement.currentTime = 0;
      }, 1000);
      
      return true;
    } catch (err) {
      console.error('Error testing audio device:', err);
      return false;
    }
  }
  
  async toggleSound(soundName: string, play: boolean): Promise<boolean> {
    try {
      const sound = this.sounds[soundName];
      if (!sound) return false;
      
      if (play) {
        sound.currentTime = 0;
        await sound.play();
        return true;
      } else {
        sound.pause();
        sound.currentTime = 0;
        return true;
      }
    } catch (err) {
      console.error(`Error ${play ? 'playing' : 'stopping'} sound ${soundName}:`, err);
      return false;
    }
  }
  
  async setAudioConstraints(constraints: MediaTrackConstraints): Promise<boolean> {
    if (!this.device || !this.device.audio) {
      console.warn('Device or device.audio not available');
      return false;
    }
    
    try {
      if (this.device.audio.setAudioConstraints) {
        await this.device.audio.setAudioConstraints(constraints);
        return true;
      } else if (this.device.audio.setInputDevice) {
        // Older version fallback
        await this.device.audio.setInputDevice('default');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error setting audio constraints:', err);
      return false;
    }
  }
  
  async clearAudioConstraints(): Promise<boolean> {
    if (!this.device || !this.device.audio) {
      return false;
    }
    
    try {
      if (this.device.audio.unsetAudioConstraints) {
        await this.device.audio.unsetAudioConstraints();
        return true;
      } else if (this.device.audio.unsetInputDevice) {
        // Older version fallback
        await this.device.audio.unsetInputDevice();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error clearing audio constraints:', err);
      return false;
    }
  }
  
  addInputVolumeListener(callback: InputVolumeCallback): void {
    if (typeof callback !== 'function') return;
    this.inputVolumeListeners.push(callback);
  }
  
  removeInputVolumeListener(callback: InputVolumeCallback): void {
    this.inputVolumeListeners = this.inputVolumeListeners.filter(cb => cb !== callback);
  }
  
  addDeviceChangeListener(callback: DeviceChangeCallback): void {
    if (typeof callback !== 'function') return;
    this.deviceChangeListeners.push(callback);
  }
  
  removeDeviceChangeListener(callback: DeviceChangeCallback): void {
    this.deviceChangeListeners = this.deviceChangeListeners.filter(cb => cb !== callback);
  }
  
  cleanup(): void {
    // Stop volume monitoring
    if (this.volumeInterval) {
      window.clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }
    
    // Stop all sounds
    Object.values(this.sounds).forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
    
    // Clear listeners
    this.inputVolumeListeners = [];
    this.deviceChangeListeners = [];
    
    this.deviceInitialized = false;
  }
}

export const twilioAudioService = new TwilioAudioService();
