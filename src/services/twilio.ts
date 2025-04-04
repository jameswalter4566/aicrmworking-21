
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://imrmboyczebjlbnkgjns.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltcm1ib3ljemViamxibmtnam5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2Njg1MDQsImV4cCI6MjA1OTI0NDUwNH0.scafe8itFDyN5mFcCiyS1uugV5-7s9xhaKoqYuXGJwQ";
const supabase = createClient(supabaseUrl, supabaseKey);

// Audio context and processing nodes
let audioContext: AudioContext | null = null;
let microphoneStream: MediaStream | null = null;
let twilioDevice: any = null;
let activeConnection: any = null;

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
    // Generate token from our edge function
    const { data, error } = await supabase.functions.invoke('twilio-voice', {
      body: { action: 'generateToken' },
    });

    if (error) throw new Error(error.message);
    if (!data.token) throw new Error('Failed to get token');

    // Check for Twilio in window object (for browser-based script)
    if (!(window as any).Twilio || !(window as any).Twilio.Device) {
      // If not found, add script to the page
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://sdk.twilio.com/js/client/releases/1.14.0/twilio.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Twilio script'));
        document.body.appendChild(script);
      });
    }
    
    // Now we should have Twilio available in the window object
    if (!(window as any).Twilio || !(window as any).Twilio.Device) {
      throw new Error('Twilio not available after script loaded');
    }
    
    // Create Twilio device
    twilioDevice = new (window as any).Twilio.Device();
    
    // Set up the device with our token
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
