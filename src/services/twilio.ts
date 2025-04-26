import { useToast } from "@/components/ui/use-toast";

const getTwilioToken = async () => {
  try {
    const response = await fetch('/api/get-twilio-token');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Failed to get Twilio token:", error);
    return null;
  }
};

// Initialize audio context
let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
let isMicrophoneActive = false;

export const initializeAudioContext = async (): Promise<boolean> => {
  if (audioContext) {
    console.log("Audio context already initialized");
    return isMicrophoneActive;
  }

  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(gainNode);
    isMicrophoneActive = true;
    console.log("Audio context initialized and microphone access granted");
    return true;
  } catch (error) {
    console.error("Error initializing audio context or accessing microphone:", error);
    isMicrophoneActive = false;
    return false;
  }
};

export const isAudioContextInitialized = (): boolean => {
    return !!audioContext;
};

export const isMicrophoneCurrentlyActive = (): boolean => {
    return isMicrophoneActive;
};

export const setVolume = (volume: number): void => {
  if (gainNode) {
    gainNode.gain.value = volume;
  }
};

export const isMicrophoneActive = (): boolean => {
  return isMicrophoneActive;
};

export const getAudioOutputDevices = async (): Promise<MediaDeviceInfo[]> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audiooutput');
  } catch (error) {
    console.error("Error getting audio output devices:", error);
    return [];
  }
};

export const setAudioOutputDevice = async (deviceId: string): Promise<boolean> => {
  if (!('setSinkId' in HTMLMediaElement.prototype)) {
    console.warn('Browser does not support setting audio output device');
    return false;
  }

  try {
    const audioElement = document.getElementById('audio-test') as HTMLAudioElement;
    if (audioElement) {
      await audioElement.setSinkId(deviceId);
      console.log(`Audio output device set to: ${deviceId}`);
      return true;
    } else {
      console.warn('Audio element not found');
      return false;
    }
  } catch (error) {
    console.error("Error setting audio output device:", error);
    return false;
  }
};

export const getCurrentAudioDevice = (): string => {
  try {
    const audioElement = document.getElementById('audio-test') as HTMLAudioElement;
    if (audioElement && 'sinkId' in audioElement) {
      return audioElement.sinkId;
    }
    return '';
  } catch (error) {
    console.error("Error getting current audio device:", error);
    return '';
  }
};

export const testAudioOutput = async (deviceId: string): Promise<boolean> => {
    try {
        const audioElement = document.getElementById('audio-test') as HTMLAudioElement;
        if (!audioElement) {
            console.warn('Audio element not found');
            return false;
        }

        // Ensure the audio is loaded before attempting to play
        if (audioElement.readyState < 3) {
            await new Promise((resolve) => {
                audioElement.addEventListener('loadeddata', () => {
                    resolve(true);
                }, { once: true });
            });
        }

        // Set the audio output device if specified
        if (deviceId && 'setSinkId' in audioElement) {
            await audioElement.setSinkId(deviceId);
        }

        // Play the audio
        await audioElement.play();

        // Resolve after a short delay to allow audio to play
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Pause the audio after playing
        audioElement.pause();
        audioElement.currentTime = 0;

        return true;
    } catch (error) {
        console.error("Error testing audio output:", error);
        return false;
    }
};

let twilioDevice: any = null;

export const initializeTwilioDevice = async (): Promise<boolean> => {
  try {
    const token = await getTwilioToken();
    
    if (!token) {
      console.error('Could not get Twilio token');
      return false;
    }
    
    // Ensure we have Twilio.Device available
    if (!window.Twilio?.Device) {
      console.error('Twilio.Device is not available');
      return false;
    }
    
    // Disconnect existing device if it exists
    if (twilioDevice) {
      console.log("Disconnecting existing Twilio device");
      twilioDevice.destroy();
      twilioDevice = null;
    }
    
    // Initialize the Twilio device
    twilioDevice = new window.Twilio.Device(token, {
      // Set any additional options here
      // Example:
      // closeProtection: true,
      // Set Opus as our preferred codec.
      codecPreferences: ["opus", "pcmu"],
      // Use fake DTMF tones client-side.
      fakeDTMF: false,
      // Use headphones for audio processing.
      // enalbeWebAudio: true,
      // Allow device to automatically select the best available codecs
      // autoAdjustCodecs: true
    });
    
    twilioDevice.on('error', (error: any) => {
      console.error('Twilio.Device error:', error);
    });
    
    twilioDevice.on('registered', () => {
      console.log('Twilio.Device registered');
    });
    
    twilioDevice.on('unregistered', () => {
      console.warn('Twilio.Device unregistered');
    });
    
    console.log('Twilio.Device initialized');
    return true;
  } catch (error) {
    console.error("Error initializing Twilio device:", error);
    return false;
  }
};

export const hangupAllCalls = async () => {
  try {
    // Check if Twilio.Device is available and initialized
    if (!window.Twilio?.Device || !twilioDevice) {
      console.warn('Twilio.Device is not available or initialized');
      return { success: false, error: 'Twilio.Device is not available or initialized' };
    }
    
    // Disconnect all active calls
    twilioDevice.disconnectAll();
    
    console.log('Attempting to hang up all active calls');
    return { success: true, message: 'All calls ended' };
  } catch (error) {
    console.error('Error hanging up all calls:', error);
    return { success: false, error: 'Failed to hang up all calls' };
  }
};

// Add or update the makeCall method in the twilioService to include the originalLeadId parameter
export const makeCall = async (phoneNumber: string, leadId: string | number, originalLeadId?: string | number) => {
  try {
    const token = await getTwilioToken();
    
    if (!token) {
      return { success: false, error: "Could not get Twilio token" };
    }
    
    // Ensure we have Twilio.Device available
    if (!window.Twilio?.Device) {
      console.error('Twilio.Device is not available');
      return { success: false, error: "Twilio SDK not loaded" };
    }
    
    // Connect to Twilio with the token
    const device = new window.Twilio.Device(token);
    
    // Make the call with parameters including the originalLeadId
    const call = await device.connect({
      params: {
        phoneNumber: phoneNumber,
        leadId: leadId,
        originalLeadId: originalLeadId || leadId  // Use originalLeadId if provided, otherwise fallback to leadId
      }
    });
    
    console.log('Call connected with parameters:', {
      phoneNumber,
      leadId,
      originalLeadId: originalLeadId || leadId,
      callSid: call.parameters.CallSid
    });
    
    return { 
      success: true, 
      callSid: call.parameters.CallSid,
      browserCallSid: `browser-call-${Date.now()}`,
      // Include the originalLeadId in the response for additional tracking
      originalLeadId: originalLeadId || leadId,
      conferenceName: call.parameters.conferenceName,
      phoneCallSid: call.parameters.phoneCallSid,
      browserCallSid: call.parameters.browserCallSid
    };
  } catch (error) {
    console.error("Error making call:", error);
    return { success: false, error: error.message };
  }
};

export const endCall = async (leadId: string) => {
  try {
    // Check if Twilio.Device is available and initialized
    if (!window.Twilio?.Device || !twilioDevice) {
      console.warn('Twilio.Device is not available or initialized');
      return { success: false, error: 'Twilio.Device is not available or initialized' };
    }
    
    // Disconnect all active calls
    twilioDevice.disconnectAll();
    
    console.log(`Attempting to hang up call for lead ID: ${leadId}`);
    return { success: true, message: 'Call ended' };
  } catch (error) {
    console.error('Error hanging up call:', error);
    return { success: false, error: 'Failed to hang up call' };
  }
};

export const checkCallStatus = async (leadId: string): Promise<string> => {
  try {
    // Fetch the call status from your server
    // Replace '/api/call-status' with your actual endpoint
    const response = await fetch(`/api/call-status?leadId=${leadId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.status;
  } catch (error) {
    console.error("Error checking call status:", error);
    return 'unknown';
  }
};

export const toggleMute = (mute: boolean): boolean => {
  try {
    if (!twilioDevice) {
      console.warn('Twilio.Device is not available or initialized');
      return false;
    }
    
    if (mute) {
      twilioDevice.audio.mute();
    } else {
      twilioDevice.audio.unmute();
    }
    
    console.log(`Microphone ${mute ? 'muted' : 'unmuted'}`);
    return true;
  } catch (error) {
    console.error("Error toggling mute:", error);
    return false;
  }
};

export const toggleSpeaker = (speakerOn: boolean): boolean => {
  try {
    // This is a placeholder - Twilio.js does not directly control the speaker
    // You would typically use browser APIs or a third-party library to manage audio output
    console.log(`Speaker ${speakerOn ? 'on' : 'off'}`);
    return true;
  } catch (error) {
    console.error("Error toggling speaker:", error);
    return false;
  }
};

export const cleanup = () => {
  console.log("Cleaning up Twilio service");
  
  if (twilioDevice) {
    try {
      twilioDevice.destroy();
      console.log("Twilio device destroyed");
    } catch (e) {
      console.warn("Error destroying Twilio device:", e);
    }
    twilioDevice = null;
  }
  
  if (audioContext) {
    try {
      audioContext.close();
      console.log("Audio context closed");
    } catch (e) {
      console.warn("Error closing audio context:", e);
    }
    audioContext = null;
  }
  
  gainNode = null;
  isMicrophoneActive = false;
};

export const twilioService = {
    getTwilioToken,
    initializeAudioContext,
    isAudioContextInitialized,
    isMicrophoneCurrentlyActive,
    setVolume,
    isMicrophoneActive,
    getAudioOutputDevices,
    setAudioOutputDevice,
    getCurrentAudioDevice,
    testAudioOutput,
    initializeTwilioDevice,
    hangupAllCalls,
    makeCall,
    endCall,
    checkCallStatus,
    toggleMute,
    toggleSpeaker,
    cleanup
};
