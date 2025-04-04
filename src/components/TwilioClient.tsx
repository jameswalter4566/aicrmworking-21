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
  
  const deviceInitializedRef = useRef(false);
  const errorNotifiedRef = useRef(false);
  const setupAttemptsRef = useRef(0);
  const MAX_SETUP_ATTEMPTS = 3;

  const setupDevice = useCallback(async () => {
    if (isInitializing) {
      console.log("Device initialization already in progress, skipping");
      return null;
    }
    
    if (device && status === "ready") {
      console.log("Device already initialized and ready");
      return device;
    }

    if (setupAttemptsRef.current >= MAX_SETUP_ATTEMPTS) {
      console.log(`Maximum setup attempts (${MAX_SETUP_ATTEMPTS}) reached, aborting`);
      if (!errorNotifiedRef.current) {
        errorNotifiedRef.current = true;
        toast.toast({
          variant: "destructive",
          title: "Setup Error",
          description: "Failed to set up the phone after multiple attempts. Please refresh the page and try again.",
        });
      }
      return null;
    }
    
    setupAttemptsRef.current += 1;
    setIsInitializing(true);
    
    try {
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

      if (device) {
        console.log("Destroying existing device before creating new one");
        try {
          device.destroy();
        } catch (e) {
          console.warn("Error destroying existing device:", e);
        }
      }

      const newDevice = new Device(data.token, {
        codecPreferences: ['opus', 'pcmu'] as any[],
        disableAudioContextSounds: false,
        maxAverageBitrate: 16000,
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }
        ]
      });

      errorNotifiedRef.current = false;

      newDevice.on("ready", () => {
        console.log("Twilio device is ready");
        setStatus("ready");
        setIsInitializing(false);
        setupAttemptsRef.current = 0;
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
        
        if (!errorNotifiedRef.current) {
          errorNotifiedRef.current = true;
          toast.toast({
            variant: "destructive",
            title: "Call Error",
            description: err?.message || "An error occurred with the phone",
          });
          
          setTimeout(() => {
            errorNotifiedRef.current = false;
          }, 5000);
        }
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
        console.log("Twilio device registered successfully");
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
      
      if (!errorNotifiedRef.current) {
        errorNotifiedRef.current = true;
        toast.toast({
          variant: "destructive",
          title: "Setup Error",
          description: err?.message || "Failed to set up the phone",
        });
        
        setTimeout(() => {
          errorNotifiedRef.current = false;
        }, 5000);
      }
      return null;
    }
  }, [device, status, isInitializing, onCallConnect, onCallDisconnect, onDeviceReady, onError, toast]);

  const makeCall = useCallback(
    async (phoneNumber: string) => {
      try {
        let currentDevice = device;
        if (!currentDevice || status !== "ready") {
          currentDevice = await setupDevice();
        }

        if (!currentDevice) {
          throw new Error("Phone device is not ready. Try again.");
        }

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
        
        if (!errorNotifiedRef.current) {
          errorNotifiedRef.current = true;
          toast.toast({
            variant: "destructive",
            title: "Call Error",
            description: err?.message || "Failed to make the call",
          });
          
          setTimeout(() => {
            errorNotifiedRef.current = false;
          }, 3000);
        }
      }
    },
    [device, status, setupDevice, onError, toast]
  );

  const hangupCall = useCallback(() => {
    if (connection) {
      try {
        connection.disconnect();
      } catch (e) {
        console.error("Error disconnecting call:", e);
      }
      setConnection(null);
      setStatus("ready");
    }
  }, [connection]);

  const isReady = useCallback(() => {
    return device !== null && status === "ready";
  }, [device, status]);

  const setupDeviceWrapper = useCallback(async (): Promise<void> => {
    await setupDevice();
  }, [setupDevice]);

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

    if (!deviceInitializedRef.current && !device) {
      console.log("Performing initial Twilio device setup");
      const timer = setTimeout(() => {
        setupDevice().catch(err => {
          console.error("Failed to setup device in initial effect:", err);
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }

    return () => {
      if (device) {
        console.log("Cleaning up Twilio device on unmount");
        try {
          device.destroy();
        } catch (e) {
          console.error("Error cleaning up device:", e);
        }
      }
      if (window.twilioClient) {
        window.twilioClient.device = null;
        window.twilioClient.connection = null;
      }
      deviceInitializedRef.current = false;
    };
  }, [device, connection, status, makeCall, hangupCall, setupDevice, setupDeviceWrapper, isReady]);

  return null;
};

export default TwilioClient;
