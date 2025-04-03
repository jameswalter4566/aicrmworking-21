
import React, { useEffect, useState, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";

interface TwilioClientProps {
  isActive: boolean;
  onCallStatusChange: (status: string) => void;
  onDeviceReady: (isReady: boolean) => void;
}

const TwilioClient: React.FC<TwilioClientProps> = ({ 
  isActive, 
  onCallStatusChange,
  onDeviceReady
}) => {
  const [device, setDevice] = useState<Device | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnCall, setIsOnCall] = useState(false);
  const activeCall = useRef<any>(null);

  useEffect(() => {
    if (isActive && !isInitialized) {
      initializeTwilioDevice();
    }

    return () => {
      if (device) {
        device.destroy();
      }
    };
  }, [isActive, isInitialized]);

  const generateUniqueIdentity = () => {
    return `agent-${Math.random().toString(36).substring(2, 15)}`;
  };

  const initializeTwilioDevice = async () => {
    try {
      // Generate a unique identity for this agent
      const identity = generateUniqueIdentity();
      
      // Get token from Supabase function
      const { data, error } = await supabase.functions.invoke('twilio-token', {
        body: { identity }
      });

      if (error) {
        throw new Error(`Error fetching token: ${error.message}`);
      }

      if (!data || !data.token) {
        throw new Error('No token received from server');
      }

      // Create a new Twilio Device
      const twilioDevice = new Device(data.token, {
        logLevel: 1, // Info
        codecPreferences: ['opus', 'pcmu']
      });

      // Set up event listeners
      twilioDevice.on('registered', () => {
        console.log('Twilio device registered');
        onDeviceReady(true);
      });

      twilioDevice.on('error', (error) => {
        console.error('Twilio device error:', error);
        toast.error(`Twilio error: ${error.message}`);
        onCallStatusChange('error');
      });

      twilioDevice.on('incoming', (call) => {
        activeCall.current = call;
        setIsOnCall(true);
        onCallStatusChange('incoming');
        
        call.on('accept', () => {
          onCallStatusChange('in-progress');
        });
        
        call.on('disconnect', () => {
          setIsOnCall(false);
          activeCall.current = null;
          onCallStatusChange('completed');
        });
        
        call.on('cancel', () => {
          setIsOnCall(false);
          activeCall.current = null;
          onCallStatusChange('canceled');
        });
      });

      twilioDevice.on('connect', (call) => {
        activeCall.current = call;
        setIsOnCall(true);
        onCallStatusChange('in-progress');
      });

      twilioDevice.on('disconnect', () => {
        setIsOnCall(false);
        activeCall.current = null;
        onCallStatusChange('completed');
      });

      // Register the device
      await twilioDevice.register();
      setDevice(twilioDevice);
      setIsInitialized(true);
      
      toast.success('Phone system initialized');
    } catch (error) {
      console.error('Failed to initialize Twilio:', error);
      toast.error(`Failed to initialize phone system: ${error.message}`);
      onDeviceReady(false);
    }
  };

  const makeCall = async (phoneNumber: string) => {
    if (!device || !device.isRegistered()) {
      toast.error('Phone system not ready');
      return false;
    }

    try {
      // The actual calling happens via the Twilio-dial function
      // This just prepares the device to receive the call
      toast.info(`Preparing to call ${phoneNumber}...`);
      onCallStatusChange('connecting');
      return true;
    } catch (error) {
      toast.error(`Call failed: ${error.message}`);
      onCallStatusChange('failed');
      return false;
    }
  };

  const hangUp = () => {
    if (activeCall.current) {
      activeCall.current.disconnect();
      activeCall.current = null;
      setIsOnCall(false);
      onCallStatusChange('completed');
      toast.info('Call ended');
    }
  };

  const toggleMute = () => {
    if (activeCall.current) {
      if (isMuted) {
        activeCall.current.mute(false);
        setIsMuted(false);
        toast.info('Microphone unmuted');
      } else {
        activeCall.current.mute(true);
        setIsMuted(true);
        toast.info('Microphone muted');
      }
    }
  };

  // Expose methods to parent component
  React.useEffect(() => {
    // @ts-ignore - Adding functions to window for debugging
    window.twilioClient = {
      makeCall,
      hangUp,
      toggleMute,
      getStatus: () => ({ isInitialized, isOnCall, isMuted })
    };
  }, [isInitialized, isOnCall, isMuted]);

  return null; // This is a non-UI component
};

export default TwilioClient;
