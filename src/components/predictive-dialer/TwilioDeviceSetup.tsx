
import React, { useEffect, useState } from 'react';
import { Device } from '@twilio/voice-sdk';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneCall } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TwilioDeviceSetupProps {
  onDeviceReady: (device: Device) => void;
}

const TwilioDeviceSetup: React.FC<TwilioDeviceSetupProps> = ({ onDeviceReady }) => {
  const [device, setDevice] = useState<Device | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<string>('initializing');
  const { toast } = useToast();
  
  useEffect(() => {
    let twilioDevice: Device | null = null;

    const setupDevice = async () => {
      try {
        // Get token from Supabase Edge Function - public endpoint, no auth required
        const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}) // Empty body is fine
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Twilio token: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.token) {
          throw new Error(data.error || 'No token in response');
        }

        console.log("Successfully retrieved Twilio token");
        
        // Initialize Twilio device with correct codec types
        twilioDevice = new Device(data.token, {
          codecPreferences: ["opus", "pcmu"],
          disableAudioContextSounds: false,
          logLevel: 'info'
        });

        // Set up event listeners
        twilioDevice.on('registered', () => {
          setDeviceStatus('ready');
          toast({
            title: "Phone System Ready",
            description: "You can now receive and make calls.",
          });
        });

        twilioDevice.on('error', (error) => {
          console.error('Twilio device error:', error);
          setDeviceStatus('error');
          toast({
            title: "Phone Error",
            description: error.message || "An error occurred with the phone system.",
            variant: "destructive",
          });
        });

        // Register the device to receive incoming calls
        await twilioDevice.register();
        setDevice(twilioDevice);
        onDeviceReady(twilioDevice);
      } catch (error) {
        console.error('Error setting up Twilio device:', error);
        setDeviceStatus('error');
        toast({
          title: "Setup Error",
          description: "Failed to set up the phone system. Please refresh and try again.",
          variant: "destructive",
        });
      }
    };

    setupDevice();

    // Cleanup function
    return () => {
      if (twilioDevice) {
        twilioDevice.destroy();
      }
    };
  }, [onDeviceReady, toast]);

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
      <PhoneCall className={`h-5 w-5 ${
        deviceStatus === 'ready' ? 'text-green-500' : 
        deviceStatus === 'error' ? 'text-red-500' : 'text-amber-500'
      }`} />
      
      <Badge className={`${
        deviceStatus === 'ready' ? 'bg-green-500' : 
        deviceStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'
      }`}>
        {deviceStatus === 'ready' ? 'Phone Ready' : 
         deviceStatus === 'error' ? 'Connection Error' : 
         'Connecting...'}
      </Badge>
      
      {deviceStatus === 'error' && (
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-2 text-xs"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      )}
    </div>
  );
};

export default TwilioDeviceSetup;
