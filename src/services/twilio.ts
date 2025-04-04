
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Import twilio client using dynamic import to prevent prototype errors
let Device: any = null;

// Audio context and processing nodes
let audioContext: AudioContext | null = null;
let microphoneStream: MediaStream | null = null;
let twilioDevice: any = null;
let activeConnection: any = null;

// Load the Twilio Device class dynamically
const loadTwilioDevice = async () => {
  try {
    const twilioModule = await import('twilio-client');
    Device = twilioModule.Device;
    return true;
  } catch (error) {
    console.error('Error loading Twilio client:', error);
    return false;
  }
};

// Initialize audio context for the browser
const initializeAudioContext = async () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  try {
    // Request microphone access
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch (error) {
    console.error('Error accessing microphone:', error);
    return false;
  }
};

// Initialize Twilio device for making browser calls
const initializeTwilioDevice = async () => {
  try {
    // First ensure Device class is loaded
    const deviceLoaded = await loadTwilioDevice();
    if (!deviceLoaded) {
      throw new Error('Failed to load Twilio Device class');
    }
    
    // Generate token from our edge function
    const { data, error } = await supabase.functions.invoke('twilio-voice', {
      body: { action: 'generateToken' },
    });

    if (error) throw new Error(error.message);
    if (!data.token) throw new Error('Failed to get token');

    // Create Twilio device
    if (Device) {
      twilioDevice = new Device();
      await twilioDevice.setup(data.token, {
        debug: true,
        codecPreferences: ['opus', 'pcmu'],
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

      return true;
    } else {
      throw new Error('Twilio Device class not loaded properly');
    }
  } catch (error) {
    console.error('Error initializing Twilio device:', error);
    return false;
  }
};

// Make a call to a phone number using Twilio
const makeCall = async (phoneNumber: string) => {
  try {
    if (!twilioDevice) {
      throw new Error('Twilio device not initialized');
    }

    // Use our edge function to make the outbound call
    const { data, error } = await supabase.functions.invoke('twilio-voice', {
      body: {
        action: 'makeCall',
        phoneNumber,
        callbackUrl: window.location.hostname, // For WebSocket communication
      },
    });

    if (error) throw error;
    
    return { success: true, callSid: data.callSid };
  } catch (error) {
    console.error('Error making call:', error);
    return { success: false, error: (error as Error).message };
  }
};

// End the current call
const endCall = async () => {
  if (activeConnection) {
    activeConnection.disconnect();
    activeConnection = null;
  }

  return true;
};

// Check the status of a call
const checkCallStatus = async (callSid: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('twilio-voice', {
      body: {
        action: 'getCallStatus',
        callSid,
      },
    });

    if (error) throw error;
    return data.status;
  } catch (error) {
    console.error('Error checking call status:', error);
    return 'unknown';
  }
};

// Clean up resources
const cleanup = () => {
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
  }

  if (twilioDevice) {
    twilioDevice.destroy();
    twilioDevice = null;
  }

  activeConnection = null;
};

export const twilioService = {
  initializeAudioContext,
  initializeTwilioDevice,
  makeCall,
  endCall,
  checkCallStatus,
  cleanup,
};
