
/**
 * TwilioAudioHandler - A dedicated service for handling Twilio audio device management
 * using the Twilio Device.audio API for proper audio routing and device selection
 */
class TwilioAudioHandler {
  private twilioDevice: any = null;
  private availableOutputDevices: Map<string, MediaDeviceInfo> = new Map();
  private availableInputDevices: Map<string, MediaDeviceInfo> = new Map();
  private currentOutputDeviceId: string = 'default';
  private currentInputDeviceId: string = 'default';
  private audioEnabled: boolean = false;
  private deviceChangeHandlers: Function[] = [];
  private audioContextInitialized: boolean = false;

  /**
   * Initialize the Twilio audio system
   */
  public initialize(device: any): boolean {
    if (!device || !device.audio) {
      console.error('Twilio device or device.audio not available');
      return false;
    }

    this.twilioDevice = device;
    
    // Setup event listeners for device changes
    this.setupEventListeners();
    
    // Initialize audio context to ensure permissions are granted
    this.initializeAudioContext();
    
    // Get initial device lists
    this.refreshDeviceLists();
    
    console.log('Twilio Audio Handler initialized successfully');
    return true;
  }
  
  /**
   * Initialize the audio context to ensure permissions
   */
  private async initializeAudioContext(): Promise<boolean> {
    if (this.audioContextInitialized) {
      return true;
    }

    try {
      // Request microphone access to trigger permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioContext = new AudioContext();
        
        // Create a test tone to initialize audio
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 440; // A4 note
        gainNode.gain.value = 0.01; // Very quiet
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play a very short, quiet tone
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          
          // Stop tracks from getUserMedia
          stream.getTracks().forEach(track => track.stop());
          
          this.audioContextInitialized = true;
          console.log('Audio context initialized successfully');
        }, 100);
        
        return true;
      }
      
      // Stop tracks from getUserMedia if audio context creation failed
      stream.getTracks().forEach(track => track.stop());
      return false;
    } catch (error) {
      console.error('Error initializing audio context:', error);
      return false;
    }
  }
  
  /**
   * Setup event listeners for device changes
   */
  private setupEventListeners(): void {
    if (!this.twilioDevice || !this.twilioDevice.audio) return;
    
    // Listen for device changes
    this.twilioDevice.audio.on('deviceChange', (lostActiveDevices: any[]) => {
      console.log('Twilio audio devices changed, refreshing device lists', { lostActiveDevices });
      this.refreshDeviceLists();
      
      // Notify handlers about device change
      this.deviceChangeHandlers.forEach(handler => {
        try {
          handler(lostActiveDevices);
        } catch (err) {
          console.error('Error in device change handler:', err);
        }
      });
    });
  }
  
  /**
   * Refresh the lists of available audio devices
   */
  public async refreshDeviceLists(): Promise<void> {
    if (!this.twilioDevice || !this.twilioDevice.audio) {
      console.warn('Twilio device or device.audio not available for device refresh');
      return;
    }
    
    try {
      // Ensure microphone permission is granted
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Stop tracks immediately
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
          console.warn('Failed to get microphone permission for device enumeration:', err);
        });
      
      // Get output devices using Twilio Device.audio
      this.availableOutputDevices = this.twilioDevice.audio.availableOutputDevices || new Map();
      
      // Get input devices using Twilio Device.audio
      this.availableInputDevices = this.twilioDevice.audio.availableInputDevices || new Map();
      
      console.log('Available output devices:', this.getOutputDevices());
      console.log('Available input devices:', this.getInputDevices());
      
      // Set default devices if needed
      if (this.availableOutputDevices.size > 0 && !this.currentOutputDeviceId) {
        this.currentOutputDeviceId = 'default';
      }
      
      if (this.availableInputDevices.size > 0 && !this.currentInputDeviceId) {
        this.currentInputDeviceId = 'default';
      }
    } catch (error) {
      console.error('Error refreshing audio device lists:', error);
    }
  }
  
  /**
   * Get array of available output devices
   */
  public getOutputDevices(): MediaDeviceInfo[] {
    return Array.from(this.availableOutputDevices.values());
  }
  
  /**
   * Get array of available input devices
   */
  public getInputDevices(): MediaDeviceInfo[] {
    return Array.from(this.availableInputDevices.values());
  }
  
  /**
   * Set the current output device
   */
  public async setOutputDevice(deviceId: string): Promise<boolean> {
    if (!this.twilioDevice || !this.twilioDevice.audio) {
      console.warn('Twilio device or device.audio not available for setOutputDevice');
      return false;
    }
    
    try {
      console.log(`Setting Twilio output device to: ${deviceId}`);
      
      // Use Twilio's speakerDevices.set method
      await this.twilioDevice.audio.speakerDevices.set(deviceId);
      
      // Also set ringtone devices for incoming calls
      await this.twilioDevice.audio.ringtoneDevices.set(deviceId);
      
      this.currentOutputDeviceId = deviceId;
      
      // Test the audio on the selected device
      await this.testAudioOutput();
      
      return true;
    } catch (error) {
      console.error('Error setting output device:', error);
      return false;
    }
  }
  
  /**
   * Set the current input device
   */
  public async setInputDevice(deviceId: string): Promise<boolean> {
    if (!this.twilioDevice || !this.twilioDevice.audio) {
      console.warn('Twilio device or device.audio not available for setInputDevice');
      return false;
    }
    
    try {
      console.log(`Setting Twilio input device to: ${deviceId}`);
      
      // Use Twilio's setInputDevice method
      await this.twilioDevice.audio.setInputDevice(deviceId);
      
      this.currentInputDeviceId = deviceId;
      return true;
    } catch (error) {
      console.error('Error setting input device:', error);
      return false;
    }
  }
  
  /**
   * Test audio output on current device
   */
  public async testAudioOutput(): Promise<boolean> {
    if (!this.twilioDevice || !this.twilioDevice.audio) {
      console.warn('Twilio device or device.audio not available for testing audio');
      return false;
    }
    
    try {
      // Use Twilio's test method on speakerDevices
      await this.twilioDevice.audio.speakerDevices.test('/sounds/dialtone.mp3');
      return true;
    } catch (error) {
      console.error('Error testing audio output:', error);
      
      // Fallback to standard Audio API if Twilio test fails
      try {
        const audio = new Audio('/sounds/dialtone.mp3');
        
        if ('setSinkId' in audio) {
          await (audio as any).setSinkId(this.currentOutputDeviceId);
        }
        
        audio.volume = 0.5;
        await audio.play();
        
        // Stop after 1 second
        setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
        }, 1000);
        
        return true;
      } catch (fallbackError) {
        console.error('Fallback audio test also failed:', fallbackError);
        return false;
      }
    }
  }
  
  /**
   * Add a handler for device change events
   */
  public onDeviceChange(handler: Function): void {
    this.deviceChangeHandlers.push(handler);
  }
  
  /**
   * Enable or disable the disconnect sound
   */
  public setDisconnectSound(enabled: boolean): boolean {
    if (!this.twilioDevice || !this.twilioDevice.audio) return false;
    
    return this.twilioDevice.audio.disconnect(enabled);
  }
  
  /**
   * Enable or disable the incoming sound
   */
  public setIncomingSound(enabled: boolean): boolean {
    if (!this.twilioDevice || !this.twilioDevice.audio) return false;
    
    return this.twilioDevice.audio.incoming(enabled);
  }
  
  /**
   * Enable or disable the outgoing sound
   */
  public setOutgoingSound(enabled: boolean): boolean {
    if (!this.twilioDevice || !this.twilioDevice.audio) return false;
    
    return this.twilioDevice.audio.outgoing(enabled);
  }
  
  /**
   * Set audio constraints for the microphone
   */
  public async setAudioConstraints(constraints: MediaTrackConstraints): Promise<boolean> {
    if (!this.twilioDevice || !this.twilioDevice.audio) return false;
    
    try {
      await this.twilioDevice.audio.setAudioConstraints(constraints);
      return true;
    } catch (error) {
      console.error('Error setting audio constraints:', error);
      return false;
    }
  }
  
  /**
   * Get the currently selected output device ID
   */
  public getCurrentOutputDeviceId(): string {
    return this.currentOutputDeviceId;
  }
  
  /**
   * Get the currently selected input device ID
   */
  public getCurrentInputDeviceId(): string {
    return this.currentInputDeviceId;
  }
  
  /**
   * Check if output device selection is supported in this browser
   */
  public isOutputSelectionSupported(): boolean {
    if (!this.twilioDevice || !this.twilioDevice.audio) return false;
    
    return this.twilioDevice.audio.isOutputSelectionSupported;
  }
  
  /**
   * Check if volume metering is supported in this browser
   */
  public isVolumeSupported(): boolean {
    if (!this.twilioDevice || !this.twilioDevice.audio) return false;
    
    return this.twilioDevice.audio.isVolumeSupported;
  }
}

export const twilioAudioHandler = new TwilioAudioHandler();
