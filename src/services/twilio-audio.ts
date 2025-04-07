
/**
 * TwilioAudioService - Handles Twilio Device audio management
 * 
 * This service provides an interface to the Twilio.Device.audio API,
 * allowing control over audio devices, input/output selection, and audio processing.
 */

interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: string;
}

export class TwilioAudioService {
  private twilioDevice: any = null;
  private audioInitialized: boolean = false;
  private inputDeviceId: string | null = null;
  private outputDeviceId: string | null = null;
  private inputVolume: number = 0;
  private outputVolume: number = 0;
  private _inputVolumeListeners: ((volume: number) => void)[] = [];
  private _deviceChangeListeners: (() => void)[] = [];
  
  // Initialize with a Twilio Device instance
  public initialize(device: any): boolean {
    if (!device || !device.audio) {
      console.error("Invalid Twilio Device or no audio support");
      return false;
    }
    
    this.twilioDevice = device;
    this.audioInitialized = true;
    
    // Set up event listeners
    this.setupEventListeners();
    
    console.log("Twilio Audio service initialized");
    return true;
  }
  
  // Setup event listeners for device.audio
  private setupEventListeners(): void {
    if (!this.twilioDevice || !this.twilioDevice.audio) return;
    
    // Listen for input volume changes
    this.twilioDevice.audio.on('inputVolume', (volume: number) => {
      this.inputVolume = volume;
      this._inputVolumeListeners.forEach(listener => listener(volume));
    });
    
    // Listen for device changes
    this.twilioDevice.audio.on('deviceChange', (lostActiveDevices: any[]) => {
      console.log("Audio devices changed", { lostActiveDevices });
      this._deviceChangeListeners.forEach(listener => listener());
    });
  }
  
  // Get all available input devices
  public async getInputDevices(): Promise<AudioDeviceInfo[]> {
    if (!this.audioInitialized || !this.twilioDevice?.audio?.availableInputDevices) {
      return [];
    }
    
    try {
      // Ensure we have microphone permission before getting devices
      await this.requestMicrophonePermission();
      
      const devices: AudioDeviceInfo[] = [];
      this.twilioDevice.audio.availableInputDevices.forEach((device: any, id: string) => {
        devices.push({
          deviceId: id,
          label: device.label || `Input Device (${id.slice(0, 5)}...)`,
          kind: 'audioinput'
        });
      });
      
      return devices;
    } catch (error) {
      console.error("Error getting input devices:", error);
      return [];
    }
  }
  
  // Get all available output devices
  public async getOutputDevices(): Promise<AudioDeviceInfo[]> {
    if (!this.audioInitialized || !this.twilioDevice?.audio?.availableOutputDevices) {
      return [];
    }
    
    try {
      // We still need microphone permission to see labels
      await this.requestMicrophonePermission();
      
      const devices: AudioDeviceInfo[] = [];
      this.twilioDevice.audio.availableOutputDevices.forEach((device: any, id: string) => {
        devices.push({
          deviceId: id,
          label: device.label || `Output Device (${id.slice(0, 5)}...)`,
          kind: 'audiooutput'
        });
      });
      
      return devices;
    } catch (error) {
      console.error("Error getting output devices:", error);
      return [];
    }
  }
  
  // Set input device by device ID
  public async setInputDevice(deviceId: string): Promise<boolean> {
    if (!this.audioInitialized || !this.twilioDevice?.audio?.setInputDevice) {
      return false;
    }
    
    try {
      await this.twilioDevice.audio.setInputDevice(deviceId);
      this.inputDeviceId = deviceId;
      console.log(`Input audio device set to ${deviceId}`);
      return true;
    } catch (error) {
      console.error(`Error setting input device ${deviceId}:`, error);
      return false;
    }
  }
  
  // Set speaker devices by device ID
  public async setSpeakerDevice(deviceId: string): Promise<boolean> {
    if (!this.audioInitialized || 
        !this.twilioDevice?.audio?.speakerDevices ||
        !this.twilioDevice.audio.isOutputSelectionSupported) {
      console.warn("Speaker device selection is not supported in this browser");
      return false;
    }
    
    try {
      await this.twilioDevice.audio.speakerDevices.set(deviceId);
      this.outputDeviceId = deviceId;
      console.log(`Speaker device set to ${deviceId}`);
      return true;
    } catch (error) {
      console.error(`Error setting speaker device ${deviceId}:`, error);
      return false;
    }
  }
  
  // Set ringtone devices by device ID
  public async setRingtoneDevice(deviceId: string): Promise<boolean> {
    if (!this.audioInitialized || 
        !this.twilioDevice?.audio?.ringtoneDevices ||
        !this.twilioDevice.audio.isOutputSelectionSupported) {
      console.warn("Ringtone device selection is not supported in this browser");
      return false;
    }
    
    try {
      await this.twilioDevice.audio.ringtoneDevices.set(deviceId);
      console.log(`Ringtone device set to ${deviceId}`);
      return true;
    } catch (error) {
      console.error(`Error setting ringtone device ${deviceId}:`, error);
      return false;
    }
  }
  
  // Enable or disable sounds
  public toggleSound(type: 'incoming' | 'outgoing' | 'disconnect', enable: boolean): boolean {
    if (!this.audioInitialized) return false;
    
    try {
      switch (type) {
        case 'incoming':
          return this.twilioDevice.audio.incoming(enable);
        case 'outgoing':
          return this.twilioDevice.audio.outgoing(enable);
        case 'disconnect':
          return this.twilioDevice.audio.disconnect(enable);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error toggling ${type} sound:`, error);
      return false;
    }
  }
  
  // Test speaker output
  public async testSpeakerDevice(deviceId?: string): Promise<boolean> {
    if (!this.audioInitialized || !this.twilioDevice?.audio?.speakerDevices) {
      return false;
    }
    
    try {
      // If deviceId is provided, first set the device
      if (deviceId) {
        await this.setSpeakerDevice(deviceId);
      }
      
      // Test the current speaker device with default outgoing sound
      await this.twilioDevice.audio.speakerDevices.test();
      return true;
    } catch (error) {
      console.error("Error testing speaker device:", error);
      return false;
    }
  }
  
  // Test ringtone output
  public async testRingtoneDevice(deviceId?: string): Promise<boolean> {
    if (!this.audioInitialized || !this.twilioDevice?.audio?.ringtoneDevices) {
      return false;
    }
    
    try {
      // If deviceId is provided, first set the device
      if (deviceId) {
        await this.setRingtoneDevice(deviceId);
      }
      
      // Test the current ringtone device with default outgoing sound
      await this.twilioDevice.audio.ringtoneDevices.test();
      return true;
    } catch (error) {
      console.error("Error testing ringtone device:", error);
      return false;
    }
  }
  
  // Set audio constraints for input devices
  public async setAudioConstraints(constraints: MediaTrackConstraints): Promise<boolean> {
    if (!this.audioInitialized || !this.twilioDevice?.audio?.setAudioConstraints) {
      return false;
    }
    
    try {
      await this.twilioDevice.audio.setAudioConstraints(constraints);
      console.log("Audio constraints set:", constraints);
      return true;
    } catch (error) {
      console.error("Error setting audio constraints:", error);
      return false;
    }
  }
  
  // Clear audio constraints
  public async clearAudioConstraints(): Promise<boolean> {
    if (!this.audioInitialized || !this.twilioDevice?.audio?.unsetAudioConstraints) {
      return false;
    }
    
    try {
      await this.twilioDevice.audio.unsetAudioConstraints();
      console.log("Audio constraints cleared");
      return true;
    } catch (error) {
      console.error("Error clearing audio constraints:", error);
      return false;
    }
  }
  
  // Request microphone permission to get device labels
  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      return false;
    }
  }
  
  // Add input volume listener
  public addInputVolumeListener(listener: (volume: number) => void): void {
    this._inputVolumeListeners.push(listener);
  }
  
  // Remove input volume listener
  public removeInputVolumeListener(listener: (volume: number) => void): void {
    const index = this._inputVolumeListeners.indexOf(listener);
    if (index !== -1) {
      this._inputVolumeListeners.splice(index, 1);
    }
  }
  
  // Add device change listener
  public addDeviceChangeListener(listener: () => void): void {
    this._deviceChangeListeners.push(listener);
  }
  
  // Remove device change listener
  public removeDeviceChangeListener(listener: () => void): void {
    const index = this._deviceChangeListeners.indexOf(listener);
    if (index !== -1) {
      this._deviceChangeListeners.splice(index, 1);
    }
  }
  
  // Get current input volume
  public getInputVolume(): number {
    return this.inputVolume;
  }
  
  // Check if output selection is supported
  public isOutputSelectionSupported(): boolean {
    if (!this.audioInitialized || !this.twilioDevice?.audio) {
      return false;
    }
    return this.twilioDevice.audio.isOutputSelectionSupported;
  }
  
  // Check if volume measurement is supported
  public isVolumeSupported(): boolean {
    if (!this.audioInitialized || !this.twilioDevice?.audio) {
      return false;
    }
    return this.twilioDevice.audio.isVolumeSupported;
  }
  
  // Get current active input device
  public getCurrentInputDevice(): string | null {
    return this.inputDeviceId;
  }
  
  // Get current active output device
  public getCurrentOutputDevice(): string | null {
    return this.outputDeviceId;
  }
  
  // Cleanup resources
  public cleanup(): void {
    if (!this.audioInitialized) return;
    
    try {
      // Unset input device to stop inputVolume polling
      if (this.twilioDevice?.audio?.unsetInputDevice) {
        this.twilioDevice.audio.unsetInputDevice();
      }
      
      // Clear all listeners
      this._inputVolumeListeners = [];
      this._deviceChangeListeners = [];
      
      this.audioInitialized = false;
      this.twilioDevice = null;
    } catch (error) {
      console.error("Error cleaning up audio service:", error);
    }
  }
}

// Create singleton instance
export const twilioAudioService = new TwilioAudioService();
