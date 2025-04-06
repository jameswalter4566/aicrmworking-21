
/**
 * Twilio service to handle browser-based calls
 */

import { toast } from '@/components/ui/use-toast';
import { connectToStreamingWebSocket, closeWebSocketConnection, getWebSocketStatus } from '@/utils/webSocketManager';
import { testAudioOutput } from '@/utils/audioProcessing';

// Twilio Device instance
let device: any = null;
let activeCall: any = null;
let isInitialized = false;
let microphoneActive = false;
let audioOutputDevices: MediaDeviceInfo[] = [];
let currentAudioDevice = '';

/**
 * Initialize the Twilio Device
 * @returns Promise resolving to boolean indicating success
 */
export const initializeTwilioDevice = async (): Promise<boolean> => {
  try {
    // Check if Twilio Client is loaded
    if (typeof window.Twilio === 'undefined' || !window.Twilio.Device) {
      console.error('Twilio Client SDK not loaded');
      return false;
    }
    
    // Get token from edge function
    const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get Twilio token: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.token) {
      throw new Error('No token received from server');
    }
    
    console.log('Got Twilio token, initializing device...');
    
    // Clean up existing device if any
    if (device) {
      try {
        device.destroy();
      } catch (err) {
        console.warn('Error destroying existing device:', err);
      }
    }
    
    // Create new Twilio Device with options
    device = new window.Twilio.Device(data.token, {
      codecPreferences: ['opus', 'pcmu'],
      fakeLocalDTMF: true,
      enableRingingState: true,
      debug: true
    });
    
    // Setup event handlers
    device.on('ready', () => {
      console.log('Twilio Device is ready for calls');
      isInitialized = true;
    });
    
    device.on('error', (error: any) => {
      console.error('Twilio Device Error:', error);
      toast({
        title: "Phone Error",
        description: error.message || "An error occurred with the phone system",
        variant: "destructive"
      });
    });
    
    device.on('connect', (conn: any) => {
      activeCall = conn;
      console.log('Call connected');
      
      // Connect WebSocket for audio streaming
      connectToStreamingWebSocket().catch(err => {
        console.error('Failed to connect WebSocket for streaming:', err);
      });
    });
    
    device.on('disconnect', () => {
      console.log('Call disconnected');
      activeCall = null;
      
      // Close WebSocket connection
      closeWebSocketConnection();
    });
    
    // Register the device
    await device.register();
    
    console.log('Twilio device initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Twilio device:', error);
    return false;
  }
};

/**
 * Initialize audio context and request microphone access
 * @returns Promise resolving to boolean indicating success
 */
export const initializeAudioContext = async (): Promise<boolean> => {
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    microphoneActive = true;
    console.log('Microphone access granted');
    
    // Get audio output devices
    await getAudioOutputDevices();
    
    // Stop the stream - we'll request it again when making a call
    stream.getTracks().forEach(track => track.stop());
    
    return true;
  } catch (error) {
    console.error('Microphone access denied:', error);
    microphoneActive = false;
    return false;
  }
};

/**
 * Make a call
 * @param phoneNumber Phone number to call
 * @returns Promise resolving to call result
 */
export const makeCall = async (phoneNumber: string): Promise<{ 
  success: boolean; 
  callSid?: string; 
  error?: string;
  usingBrowser?: boolean;
}> => {
  if (!device || !isInitialized) {
    console.error('Twilio device not initialized');
    return { success: false, error: 'Phone system not initialized' };
  }
  
  try {
    // Clean up any existing call
    if (activeCall) {
      try {
        activeCall.disconnect();
        activeCall = null;
      } catch (err) {
        console.warn('Error disconnecting active call:', err);
      }
    }
    
    // Close any existing WebSocket connection
    closeWebSocketConnection();
    
    // Format the phone number
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    if (formattedNumber.length === 10) {
      formattedNumber = `+1${formattedNumber}`;
    } else if (!formattedNumber.startsWith('+')) {
      formattedNumber = `+${formattedNumber}`;
    }
    
    console.log(`Making call to ${formattedNumber}`);
    
    // First try with browser-based calling using Twilio Device
    try {
      // Connect with parameters - note enableMicrophone is a string to match Record<string, string> type
      const call = await device.connect({
        To: formattedNumber,
        enableMicrophone: "true"
      });
      
      activeCall = call;
      console.log('Browser-based call initiated');
      
      // Setup call event listeners
      call.on('accept', () => {
        console.log('Call accepted');
        
        // Connect WebSocket for audio streaming
        connectToStreamingWebSocket().catch(err => {
          console.error('Failed to connect WebSocket for streaming on call accept:', err);
        });
      });
      
      return { 
        success: true, 
        callSid: call.parameters.CallSid,
        usingBrowser: true
      };
    } catch (browserCallError) {
      console.error('Browser-based call failed:', browserCallError);
      
      // Fall back to REST API call
      console.log('Falling back to REST API call...');
      
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'makeCall',
          phoneNumber: formattedNumber
        })
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Call failed');
      }
      
      return {
        success: true,
        callSid: result.callSid,
        usingBrowser: false
      };
    }
  } catch (error) {
    console.error('Error making call:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error making call'
    };
  }
};

/**
 * End current call
 * @param callSid Optional call SID to end
 * @returns Promise resolving to boolean indicating success
 */
export const endCall = async (callSid?: string): Promise<boolean> => {
  // End browser-based call if active
  if (activeCall) {
    try {
      activeCall.disconnect();
      activeCall = null;
      console.log('Ended browser-based call');
      
      // Close WebSocket connection
      closeWebSocketConnection();
      
      return true;
    } catch (error) {
      console.error('Error ending browser call:', error);
    }
  }
  
  // If callSid provided, end via REST API
  if (callSid) {
    try {
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'endCall',
          callSid
        })
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error('Error ending call via API:', error);
      return false;
    }
  }
  
  return true;
};

/**
 * Check call status
 * @param callSid Call SID to check
 * @returns Promise resolving to call status
 */
export const checkCallStatus = async (callSid: string): Promise<string> => {
  try {
    const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'checkStatus',
        callSid
      })
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result.status || 'unknown';
  } catch (error) {
    console.error('Error checking call status:', error);
    return 'error';
  }
};

/**
 * Toggle mute state
 * @param mute Whether to mute or unmute
 * @returns Boolean indicating success
 */
export const toggleMute = (mute: boolean): boolean => {
  if (!activeCall) {
    return false;
  }
  
  try {
    if (mute) {
      activeCall.mute();
    } else {
      activeCall.unmute();
    }
    return true;
  } catch (error) {
    console.error('Error toggling mute:', error);
    return false;
  }
};

/**
 * Toggle speaker state
 * @param speakerOn Whether to enable or disable speaker
 * @returns Boolean indicating success
 */
export const toggleSpeaker = (speakerOn: boolean): boolean => {
  if (!device) {
    return false;
  }
  
  try {
    if (speakerOn && device.audio) {
      device.audio.speakerVolume = 1.0;
    } else if (device.audio) {
      device.audio.speakerVolume = 0.5;
    }
    return true;
  } catch (error) {
    console.error('Error toggling speaker:', error);
    return false;
  }
};

/**
 * Get available audio output devices
 * @returns Promise resolving to array of audio output devices
 */
export const getAudioOutputDevices = async (): Promise<MediaDeviceInfo[]> => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.warn("This browser doesn't support device enumeration");
      return [];
    }
    
    // Ensure we have permission first
    await navigator.mediaDevices.getUserMedia({ audio: true })
      .catch(err => {
        console.warn("Could not get microphone access:", err);
      });
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
    
    console.log("Available audio output devices:", audioOutputs);
    audioOutputDevices = audioOutputs;
    
    // Set default device if none selected
    if (audioOutputs.length > 0 && !currentAudioDevice) {
      const defaultDevice = audioOutputs.find(d => d.deviceId === 'default') || audioOutputs[0];
      currentAudioDevice = defaultDevice.deviceId;
    }
    
    return audioOutputs;
  } catch (error) {
    console.error('Error getting audio devices:', error);
    return [];
  }
};

/**
 * Set audio output device
 * @param deviceId Device ID to set
 * @returns Promise resolving to boolean indicating success
 */
export const setAudioOutputDevice = async (deviceId: string): Promise<boolean> => {
  try {
    currentAudioDevice = deviceId;
    
    // If we have an active call, update its output device
    if (activeCall && activeCall.setSinkId) {
      await activeCall.setSinkId(deviceId);
    }
    
    // Test the audio output
    await testAudioOutput(deviceId);
    
    return true;
  } catch (error) {
    console.error('Error setting audio output device:', error);
    return false;
  }
};

/**
 * Get current audio device ID
 * @returns Current audio device ID
 */
export const getCurrentAudioDevice = (): string => {
  return currentAudioDevice;
};

/**
 * Check if microphone is active
 * @returns Boolean indicating if microphone is active
 */
export const isMicrophoneActive = (): boolean => {
  return microphoneActive;
};

/**
 * Handle browser cleanup
 */
export const cleanup = (): void => {
  // End any active call
  if (activeCall) {
    try {
      activeCall.disconnect();
      activeCall = null;
    } catch (err) {
      console.warn('Error disconnecting active call during cleanup:', err);
    }
  }
  
  // Destroy device
  if (device) {
    try {
      device.destroy();
      device = null;
    } catch (err) {
      console.warn('Error destroying device during cleanup:', err);
    }
  }
  
  // Close WebSocket
  closeWebSocketConnection();
  
  isInitialized = false;
};

// Export all functionality
export const twilioService = {
  initializeTwilioDevice,
  initializeAudioContext,
  makeCall,
  endCall,
  checkCallStatus,
  toggleMute,
  toggleSpeaker,
  getAudioOutputDevices,
  setAudioOutputDevice,
  getCurrentAudioDevice,
  isMicrophoneActive,
  testAudioOutput,
  cleanup
};
