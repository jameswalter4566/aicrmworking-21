
import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const [isInitializing, setIsInitializing] = useState(false);
  const toast = useToast();
  
  // Use a ref to track if the device is already initialized
  const deviceInitializedRef = useRef(false);

  // Initialize the Twilio device
  const setupDevice = useCallback(async () => {
    // Prevent multiple initializations
    if (isInitializing) {
      console.log("Device initialization already in progress, skipping");
      return null;
    }
    
    // If device is already ready, return it
    if (device && status === "ready") {
      console.log("Device already initialized and ready");
      return device;
    }
    
    setIsInitializing(true);
    
    try {
      // Fetch a token from our Supabase function
      const { data, error } = await supabase.functions.invoke("twilio-token", {
        method: "POST",
      });

      if (error) {
        console.error("Error from twilio-token function:", error);
        throw new Error(`Error fetching token: ${error.message}`);
      }

      if (!data || !data.token) {
        console.error("Invalid response from twilio-token function:", data);
        throw new Error("No token received from server");
      }

      // Clean up existing device if it exists
      if (device) {
        console.log("Destroying existing device before creating new one");
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
        console.log("Twilio device is ready");
        setStatus("ready");
        setIsInitializing(false);
        
        // Only notify and call handler once
        if (!deviceInitializedRef.current) {
          deviceInitializedRef.current = true;
          if (onDeviceReady) onDeviceReady(newDevice);
          toast.toast({
            title: "Phone Ready",
            description: "Your phone is ready to make calls.",
          });
        }
      });

      newDevice.on("error", (err) => {
        console.error("Twilio device error:", err);
        setStatus("error");
        setIsInitializing(false);
        if (onError && err) onError(err);
        toast.toast({
          variant: "destructive",
          title: "Call Error",
          description: err?.message || "An error occurred with the phone",
        });
      });

      newDevice.on("disconnect", () => {
        console.log("Twilio call disconnected");
        setConnection(null);
        setStatus("ready");
        if (onCallDisconnect) onCallDisconnect();
        toast.toast({
          title: "Call Ended",
          description: "The call has ended.",
        });
      });

      newDevice.on("connect", (conn) => {
        console.log("Twilio call connected");
        setConnection(conn);
        setStatus("busy");
        if (onCallConnect) onCallConnect(conn);
      });

      try {
        console.log("Registering Twilio device");
        await newDevice.register();
        setDevice(newDevice);
        setStatus("ready");
        return newDevice;
      } catch (registerError) {
        console.error("Error registering Twilio device:", registerError);
        setIsInitializing(false);
        throw new Error(`Error registering device: ${registerError.message}`);
      }
    } catch (err: any) {
      console.error("Error setting up Twilio device:", err);
      setStatus("error");
      setIsInitializing(false);
      if (onError) onError(err);
      toast.toast({
        variant: "destructive",
        title: "Setup Error",
        description: err?.message || "Failed to set up the phone",
      });
      return null;
    }
  }, [device, status, isInitializing, onCallConnect, onCallDisconnect, onDeviceReady, onError, toast]);

  const makeCall = useCallback(
    async (phoneNumber: string) => {
      try {
        if (!device || status !== "ready") {
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
          description: err?.message || "Failed to make the call",
        });
      }
    },
    [device, status, setupDevice, onError, toast]
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
      setupDevice: setupDeviceWrapper,
      isReady,
    };

    // Initial setup - only do this once when the component mounts
    if (!deviceInitializedRef.current && !device) {
      console.log("Performing initial Twilio device setup");
      setupDevice().catch(err => {
        console.error("Failed to setup device in initial effect:", err);
      });
    }

    // Cleanup on unmount
    return () => {
      if (device) {
        console.log("Cleaning up Twilio device on unmount");
        device.destroy();
      }
      if (window.twilioClient) {
        window.twilioClient.device = null;
        window.twilioClient.connection = null;
      }
      deviceInitializedRef.current = false;
    };
  }, [device, connection, status, makeCall, hangupCall, setupDevice, setupDeviceWrapper, isReady]);

  // This component doesn't render anything visible
  return null;
};

export default TwilioClient;
