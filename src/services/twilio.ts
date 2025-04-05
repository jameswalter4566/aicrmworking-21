
import { supabase } from '@/integrations/supabase/client';

// Audio context and processing nodes
let audioContext: AudioContext | null = null;
let microphoneStream: MediaStream | null = null;
let twilioDevice: any = null;
let activeConnection: any = null;

// Load Twilio script dynamically
const loadTwilioScript = async () => {
  if ((window as any).Twilio) {
    console.log("Twilio already loaded");
    return (window as any).Twilio;
  }

  console.log("Loading Twilio script...");
  return new Promise<any>((resolve, reject) => {
    try {
      const script = document.createElement('script');
      script.src = 'https://sdk.twilio.com/js/client/v1.14/twilio.min.js';
      script.async = true;
      script.onload = () => {
        console.log("Twilio script loaded successfully");
        if (!(window as any).Twilio) {
          console.error("Twilio not found in window even after script load");
          reject(new Error('Twilio not found in window after script load'));
          return;
        }
        resolve((window as any).Twilio);
      };
      script.onerror = (e) => {
        console.error("Failed to load Twilio script", e);
        reject(new Error('Failed to load Twilio script'));
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error("Error during Twilio script loading:", error);
      reject(error);
    }
  });
};

// Initialize audio context for the browser
const initializeAudioContext = async () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Request microphone access
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("Microphone access granted");
    return true;
  } catch (error) {
    console.error('Error accessing microphone:', error);
    return false;
  }
};

// Initialize Twilio device for making browser calls
const initializeTwilioDevice = async () => {
  try {
    console.log("Starting Twilio device initialization...");
    
    // Load Twilio script first - this needs to happen before anything else
    const Twilio = await loadTwilioScript();
    
    if (!Twilio) {
      console.error("Failed to load Twilio script");
      throw new Error('Failed to load Twilio script');
    }
    
    if (!Twilio.Device) {
      console.error("Twilio.Device is not available");
      throw new Error('Twilio Device not available');
    }
    
    console.log("Twilio script loaded successfully, now generating token");
    
    // Generate token from our edge function - using the dedicated twilio-token function
    console.log("Invoking twilio-token function for token generation");
    const { data, error } = await supabase.functions.invoke('twilio-token', {
      body: {},
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      console.error("Error invoking twilio-token function:", error);
      throw new Error(error.message || 'Failed to invoke function');
    }
    
    if (!data || !data.token) {
      console.error("No token returned from twilio-token function:", data);
      throw new Error('Failed to get token');
    }

    console.log("Successfully obtained Twilio token");
    
    // Create Twilio device
    twilioDevice = new Twilio.Device();
    
    // Set up the device with our token
    console.log("Setting up Twilio device with token");
    await twilioDevice.setup(data.token, {
      debug: true,
      codecPreferences: ['opus', 'pcmu'],
      enableIceRestart: true,
    });

    // Set up event listeners
    twilioDevice.on('ready', () => {
      console.log('Twilio device is ready for calls');
    });

    twilioDevice.on('error', (error: any) => {
      console.error('Twilio device error:', error);
    });

    twilioDevice.on('connect', (conn: any) => {
      console.log('Call established');
      activeConnection = conn;
    });

    twilioDevice.on('disconnect', () => {
      console.log('Call ended');
      activeConnection = null;
    });

    console.log("Twilio device initialized successfully");
    return true;
  } catch (error) {
    console.error('Error initializing Twilio device:', error);
    return false;
  }
};

// Make a call to a phone number using Twilio
const makeCall = async (phoneNumber: string) => {
  try {
    console.log(`Attempting to call ${phoneNumber}...`);
    
    if (!twilioDevice) {
      console.error("Twilio device not initialized");
      throw new Error('Twilio device not initialized');
    }
    
    if (!twilioDevice.ready) {
      console.error("Twilio device not ready");
      throw new Error('Twilio device not ready');
    }

    // Format phone number correctly if needed
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+1${phoneNumber.replace(/\D/g, '')}`;

    // Use our edge function to make the outbound call
    console.log(`Invoking twilio-voice function to call ${formattedPhone}`);
    const { data, error } = await supabase.functions.invoke('twilio-voice', {
      body: {
        action: 'makeCall',
        phoneNumber: formattedPhone,
        callbackUrl: window.location.origin,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log("Response from twilio-voice:", data, error);

    if (error) {
      console.error("Error invoking makeCall:", error);
      throw error;
    }
    
    if (!data || !data.callSid) {
      console.error("No callSid returned:", data);
      throw new Error(data?.error || 'Call failed to connect');
    }
    
    console.log(`Call initialized with SID: ${data.callSid}`);
    return { success: true, callSid: data.callSid };
  } catch (error) {
    console.error('Error making call:', error);
    return { success: false, error: (error as Error).message };
  }
};

// End the current call
const endCall = async () => {
  try {
    if (activeConnection) {
      console.log("Disconnecting active call");
      activeConnection.disconnect();
      activeConnection = null;
      return true;
    } else if (twilioDevice) {
      console.log("No active connection found, disconnecting device");
      twilioDevice.disconnectAll();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error ending call:", error);
    return false;
  }
};

// Check the status of a call
const checkCallStatus = async (callSid: string) => {
  try {
    console.log(`Checking status for call: ${callSid}`);
    const { data, error } = await supabase.functions.invoke('twilio-voice', {
      body: {
        action: 'getCallStatus',
        callSid,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      console.error("Error checking call status:", error);
      throw error;
    }
    
    console.log(`Call status: ${data?.status || 'unknown'}`);
    return data?.status || 'unknown';
  } catch (error) {
    console.error('Error checking call status:', error);
    return 'unknown';
  }
};

// Clean up resources
const cleanup = () => {
  try {
    if (microphoneStream) {
      console.log("Cleaning up microphone stream");
      microphoneStream.getTracks().forEach(track => track.stop());
      microphoneStream = null;
    }

    if (twilioDevice) {
      console.log("Destroying Twilio device");
      twilioDevice.destroy();
      twilioDevice = null;
    }

    activeConnection = null;
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
};

// Check if device is ready
const isDeviceReady = () => {
  return !!twilioDevice && twilioDevice.ready;
};

export const twilioService = {
  initializeAudioContext,
  initializeTwilioDevice,
  makeCall,
  endCall,
  checkCallStatus,
  cleanup,
  isDeviceReady,
};
