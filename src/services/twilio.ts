
import { supabase } from '@/lib/supabase';

interface TwilioCallOptions {
  phoneNumber: string;
  identity?: string;
  params?: Record<string, string>;
}

interface TwilioCallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

class TwilioService {
  private device: any = null;
  private token: string = '';
  private tokenExpiry: Date | null = null;
  private initialized: boolean = false;
  private activeCallSids: Map<string, string> = new Map();
  private twilioPhoneNumber: string = '';

  constructor() {
    // Initialize in browser environment only
    if (typeof window !== 'undefined') {
      this.initializeTwilioDevice();
    }
  }

  async initializeTwilioDevice(): Promise<boolean> {
    try {
      // Only initialize once
      if (this.initialized) {
        console.log('Twilio device already initialized');
        return true;
      }

      // Check if Twilio.Device is available globally
      if (!window.Twilio || !window.Twilio.Device) {
        console.error('Twilio.Device is not available globally');
        return false;
      }

      console.log('Initializing Twilio device');

      // Get configuration from the server
      await this.getConfig();

      // Get a token
      const token = await this.getToken();
      if (!token) return false;

      // Create the device
      this.device = new window.Twilio.Device(token, {
        debug: true,
        closeProtection: true,
        codecPreferences: ['opus', 'pcmu'],
        disableAudioContextSounds: false,
        maxCallSignalingTimeoutMs: 30000,
      });

      // Set up device event handlers
      this.setupDeviceListeners();

      this.initialized = true;
      console.log('Twilio device initialized successfully');
      
      // Register device to receive incoming calls
      await this.device.register();
      console.log('Twilio device registered for incoming calls');

      return true;
    } catch (error) {
      console.error('Error initializing Twilio device:', error);
      return false;
    }
  }

  private setupDeviceListeners() {
    if (!this.device) return;

    this.device.on('registered', () => {
      console.log('Twilio device registered');
    });

    this.device.on('error', (error: any) => {
      console.error('Twilio device error:', error);
    });

    this.device.on('incoming', (call: any) => {
      console.log('Incoming call received:', call);
    });

    this.device.on('cancel', () => {
      console.log('Call was canceled');
    });

    this.device.on('connect', (call: any) => {
      console.log('Call connected:', call);
    });

    this.device.on('disconnect', (call: any) => {
      console.log('Call disconnected:', call);
    });
  }

  async getToken(): Promise<string> {
    try {
      // Check if we have a valid token
      if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
        return this.token;
      }

      // Generate a unique identity based on browser
      const identity = `browser-refresh-${Date.now()}`;

      // Get a token from our edge function
      const response = await supabase.functions.invoke('twilio-token', {
        body: {
          refreshRequest: true,
          identity: identity,
        },
      });

      if (!response.data?.token) {
        console.error('Failed to get Twilio token:', response);
        return '';
      }

      this.token = response.data.token;
      
      // Set token expiry to 23 hours from now to be safe
      this.tokenExpiry = new Date();
      this.tokenExpiry.setHours(this.tokenExpiry.getHours() + 23);

      return this.token;
    } catch (error) {
      console.error('Error getting Twilio token:', error);
      return '';
    }
  }

  async getConfig(): Promise<boolean> {
    try {
      const response = await supabase.functions.invoke('twilio-voice', {
        body: {
          action: 'getConfig',
        },
      });

      if (!response.data?.success) {
        console.error('Failed to get Twilio configuration:', response);
        return false;
      }

      this.twilioPhoneNumber = response.data.twilioPhoneNumber;
      return true;
    } catch (error) {
      console.error('Error getting Twilio configuration:', error);
      return false;
    }
  }

  async makeCall(phoneNumber: string, leadId: string = ''): Promise<TwilioCallResult> {
    try {
      // Initialize if needed
      if (!this.initialized) {
        const initialized = await this.initializeTwilioDevice();
        if (!initialized) {
          return { success: false, error: 'Twilio device failed to initialize' };
        }
      }

      // Clean up the phone number - ensure it has a + and contains only digits
      let formattedNumber = phoneNumber;
      if (!formattedNumber.startsWith('+')) {
        formattedNumber = '+' + formattedNumber.replace(/\D/g, '');
      }

      console.log(`Making call to ${formattedNumber}`);

      // Get current identity from token
      const identity = this.getIdentityFromToken();
      
      // Use our edge function to make the call
      const response = await supabase.functions.invoke('twilio-voice', {
        body: {
          action: 'makeCall',
          phoneNumber: formattedNumber,
          browserClientName: identity || undefined, // Send the browser client name for conference
        },
      });

      if (!response.data?.success) {
        console.error('Failed to make call:', response);
        return { success: false, error: response.error?.message || 'Failed to make call' };
      }

      const callSid = response.data.callSid;
      console.log(`Call initiated with SID: ${callSid}`);

      // Store the callSid for this lead
      if (leadId) {
        this.activeCallSids.set(leadId, callSid);
      }

      return { success: true, callSid };
    } catch (error: any) {
      console.error('Error making call:', error);
      return { success: false, error: error.message || 'Unknown error making call' };
    }
  }

  async checkCallStatus(leadId: string): Promise<string> {
    try {
      const callSid = this.activeCallSids.get(leadId) || 'pending-sid';
      
      const response = await supabase.functions.invoke('twilio-voice', {
        body: {
          action: 'checkStatus',
          callSid,
        },
      });

      if (!response.data?.success) {
        console.error('Failed to check call status:', response);
        return 'unknown';
      }

      return response.data.status;
    } catch (error) {
      console.error('Error checking call status:', error);
      return 'error';
    }
  }

  async endCall(leadId: string): Promise<boolean> {
    try {
      const callSid = this.activeCallSids.get(leadId);
      if (!callSid) {
        console.warn(`No active call found for lead ${leadId}`);
        return false;
      }

      const response = await supabase.functions.invoke('twilio-voice', {
        body: {
          action: 'endCall',
          callSid,
        },
      });

      if (!response.data?.success) {
        console.error('Failed to end call:', response);
        return false;
      }

      // Remove from active calls
      this.activeCallSids.delete(leadId);
      
      return true;
    } catch (error) {
      console.error('Error ending call:', error);
      return false;
    }
  }
  
  async endAllCalls(): Promise<boolean> {
    try {
      const promises: Promise<boolean>[] = [];
      
      this.activeCallSids.forEach((_, leadId) => {
        promises.push(this.endCall(leadId));
      });
      
      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      console.error('Error ending all calls:', error);
      return false;
    }
  }
  
  private getIdentityFromToken(): string | null {
    try {
      if (!this.token) return null;
      
      // JWT tokens are in the format header.payload.signature
      const parts = this.token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      return payload.sub || payload.identity || null;
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
}

export const twilioService = new TwilioService();
