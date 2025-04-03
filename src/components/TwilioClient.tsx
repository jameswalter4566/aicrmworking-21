
import React, { useState, useEffect, useCallback } from "react";
import { Device } from "@twilio/voice-sdk";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TwilioClientProps {
  onCallConnect?: (connection: any) => void;
  onCallDisconnect?: () => void;
  onDeviceReady?: (device: any) => void;
  onError?: (error: any) => void;
}

// Declare global window interface extension
declare global {
  interface Window {
    twilioClient: {
      device: Device | null;
      connection: any;
      status: string;
      makeCall: (number: string) => Promise<void>;
      hangupCall: () => void;
      setupDevice: () => Promise<void>;
      isReady: () => boolean;
    };
  }
}

/**
 * TwilioClient component for handling voice calls
 * This component doesn't render anything but provides the Twilio functionality
 * to the application through a global window object
 */
const TwilioClient: React.FC<TwilioClientProps> = ({
  onCallConnect,
  onCallDisconnect,
  onDeviceReady,
  onError,
}) => {
  const [device, setDevice] = useState<Device | null>(null);
  const [connection, setConnection] = useState<any>(null);
  const [status, setStatus] = useState<string>("offline");
  const toast = useToast();

  // Initialize the Twilio device
  const setupDevice = useCallback(async () => {
    try {
      // Fetch a token from our Supabase function
      const { data, error } = await supabase.functions.invoke("twilio-token", {
        method: "POST",
      });

      if (error) {
        throw new Error(`Error fetching token: ${error.message}`);
      }

      if (!data || !data.token) {
        throw new Error("No token received from server");
      }

      // Clean up existing device if it exists
      if (device) {
        device.destroy();
      }

      // Create a new device with the token
      // Fix for the codec types - use an array type assertion
      const newDevice = new Device(data.token, {
        codecPreferences: ["opus", "pcmu"] as any,
        maxAverageBitrate: 16000,
      });

      // Setup event listeners
      newDevice.on("ready", () => {
        setStatus("ready");
        if (onDeviceReady) onDeviceReady(newDevice);
        toast.toast({
          title: "Phone Ready",
          description: "Your phone is ready to make calls.",
        });
      });

      newDevice.on("error", (err) => {
        console.error("Twilio device error:", err);
        setStatus("error");
        if (onError) onError(err);
        toast.toast({
          variant: "destructive",
          title: "Call Error",
          description: err.message || "An error occurred with the phone",
        });
      });

      newDevice.on("disconnect", () => {
        setConnection(null);
        setStatus("ready");
        if (onCallDisconnect) onCallDisconnect();
        toast.toast({
          title: "Call Ended",
          description: "The call has ended.",
        });
      });

      newDevice.on("connect", (conn) => {
        setConnection(conn);
        setStatus("busy");
        if (onCallConnect) onCallConnect(conn);
      });

      await newDevice.register();
      setDevice(newDevice);
      setStatus("ready");
      return newDevice;
    } catch (err: any) {
      console.error("Error setting up Twilio device:", err);
      setStatus("error");
      if (onError) onError(err);
      toast.toast({
        variant: "destructive",
        title: "Setup Error",
        description: err.message || "Failed to set up the phone",
      });
      return null;
    }
  }, [device, onCallConnect, onCallDisconnect, onDeviceReady, onError, toast]);

  const makeCall = useCallback(
    async (phoneNumber: string) => {
      try {
        if (!device || !device.register) {
          await setupDevice();
        }

        // Check if device is ready
        if (!device) {
          throw new Error("Phone device is not ready. Try again.");
        }

        // Call the Supabase function to initiate the call
        const { data, error } = await supabase.functions.invoke("twilio-dial", {
          method: "POST",
          body: { phoneNumber },
        });

        if (error) {
          throw new Error(`Error initiating call: ${error.message}`);
        }

        if (!data || !data.success) {
          throw new Error(data?.message || "Failed to initiate call");
        }

        toast.toast({
          title: "Calling...",
          description: `Dialing ${phoneNumber}`,
        });
      } catch (err: any) {
        console.error("Error making call:", err);
        if (onError) onError(err);
        toast.toast({
          variant: "destructive",
          title: "Call Error",
          description: err.message || "Failed to make the call",
        });
      }
    },
    [device, setupDevice, onError, toast]
  );

  const hangupCall = useCallback(() => {
    if (connection) {
      connection.disconnect();
      setConnection(null);
      setStatus("ready");
    }
  }, [connection]);

  const isReady = useCallback(() => {
    return device !== null && status === "ready";
  }, [device, status]);

  // Fix return type mismatch by creating a wrapper function that doesn't return anything
  const setupDeviceWrapper = useCallback(async (): Promise<void> => {
    await setupDevice();
    // No return value needed
  }, [setupDevice]);

  // Set up global access to Twilio functionality
  useEffect(() => {
    window.twilioClient = {
      device,
      connection,
      status,
      makeCall,
      hangupCall,
      setupDevice: setupDeviceWrapper, // Use the wrapper function here
      isReady,
    };

    // Initial setup
    if (!device) {
      setupDevice();
    }

    // Cleanup on unmount
    return () => {
      if (device) {
        device.destroy();
      }
      if (window.twilioClient) {
        window.twilioClient.device = null;
        window.twilioClient.connection = null;
      }
    };
  }, [device, connection, status, makeCall, hangupCall, setupDevice, setupDeviceWrapper, isReady]);

  // This component doesn't render anything visible
  return null;
};

export default TwilioClient;
