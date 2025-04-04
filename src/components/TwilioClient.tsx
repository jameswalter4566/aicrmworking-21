import React, { useState, useEffect, useCallback, useRef } from "react";
import { Device } from "@twilio/voice-sdk";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Phone, Loader2 } from "lucide-react";

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
  const [showSetupButton, setShowSetupButton] = useState(false);
  const [audioContextInitialized, setAudioContextInitialized] = useState(false);
  const { toast } = useToast();
  
  const deviceInitializedRef = useRef(false);
  const errorNotifiedRef = useRef(false);
  const setupAttemptsRef = useRef(0);
  const MAX_SETUP_ATTEMPTS = 3;
  const tokenRef = useRef<string | null>(null);

  const fetchToken = useCallback(async () => {
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
      
      console.log("Successfully received Twilio token, length:", 
                 data.token ? data.token.length : 0, 
                 "identity:", data.identity || "unknown");
      
      tokenRef.current = data.token;
      return data.token;
    } catch (error) {
      console.error("Failed to fetch token:", error);
      toast({
        variant: "destructive",
        title: "Token Error",
        description: "Failed to get required authentication token. Please try again.",
      });
      throw error;
    }
  }, [toast]);

  const initializeAudioContext = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(err => {
            console.warn("Failed to resume AudioContext:", err);
          });
        }
        console.log("AudioContext initialized successfully:", audioContext.state);
        setAudioContextInitialized(true);
        return true;
      }
    } catch (audioError) {
      console.warn("Could not initialize AudioContext:", audioError);
    }
    return false;
  }, []);

  const setupDeviceAfterInteraction = useCallback(async () => {
    if (isInitializing) {
      console.log("Device initialization already in progress, skipping");
      return null;
    }
    
    if (!audioContextInitialized) {
      const success = initializeAudioContext();
      if (!success) {
        toast({
          variant: "destructive",
          title: "Audio Error",
          description: "Failed to initialize audio. Please check your browser permissions.",
        });
        return null;
      }
    }
    
    setIsInitializing(true);
    
    try {
      const token = tokenRef.current || await fetchToken();
      
      if (device) {
        console.log("Destroying existing device before creating new one");
        try {
          device.destroy();
        } catch (e) {
          console.warn("Error destroying existing device:", e);
        }
      }

      console.log("Creating new Twilio device with token");
      const newDevice = new Device(token, {
        codecPreferences: ['pcmu', 'opus'],
        maxAverageBitrate: 16000,
        forceAggressiveIceNomination: true
      });

      errorNotifiedRef.current = false;

      newDevice.on("ready", () => {
        console.log("Twilio device is ready");
        setStatus("ready");
        setIsInitializing(false);
        setupAttemptsRef.current = 0;
        setShowSetupButton(false);
        
        if (!deviceInitializedRef.current) {
          deviceInitializedRef.current = true;
          if (onDeviceReady) onDeviceReady(newDevice);
          toast({
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
        
        let errorMessage = "An error occurred with the phone";
        if (err && err.message) {
          if (err.message.includes("token")) {
            errorMessage = "Authentication error. Please refresh the page and try again.";
          } else if (err.message.includes("microphone") || err.message.includes("audio")) {
            errorMessage = "Microphone access error. Please check your browser permissions.";
          } else {
            errorMessage = err.message;
          }
        }
        
        if (!errorNotifiedRef.current) {
          errorNotifiedRef.current = true;
          
          toast({
            variant: "destructive",
            title: "Call Error",
            description: errorMessage,
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
        toast({
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
        toast({
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
  }, [device, status, isInitializing, audioContextInitialized, fetchToken, initializeAudioContext, onCallConnect, onCallDisconnect, onDeviceReady, onError, toast]);

  const makeCall = useCallback(
    async (phoneNumber: string) => {
      try {
        let currentDevice = device;
        if (!currentDevice || status !== "ready") {
          currentDevice = await setupDeviceAfterInteraction();
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

        toast({
          title: "Calling...",
          description: `Dialing ${phoneNumber}`,
        });
      } catch (err: any) {
        console.error("Error making call:", err);
        if (onError) onError(err);
        
        if (!errorNotifiedRef.current) {
          errorNotifiedRef.current = true;
          toast({
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
    [device, status, setupDeviceAfterInteraction, onError, toast]
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
    if (!tokenRef.current) {
      try {
        await fetchToken();
      } catch (err) {
        console.error("Failed to fetch token in wrapper:", err);
      }
    }
    
    if (!audioContextInitialized) {
      setShowSetupButton(true);
    } else {
      await setupDeviceAfterInteraction();
    }
  }, [fetchToken, audioContextInitialized, setupDeviceAfterInteraction]);

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
      initializeAudioContext();
      
      const timer = setTimeout(() => {
        setupDeviceWrapper().catch(err => {
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
  }, [device, connection, status, makeCall, hangupCall, setupDeviceWrapper, isReady, initializeAudioContext]);

  if (showSetupButton) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          onClick={() => setupDeviceAfterInteraction()}
          className="flex items-center bg-primary"
        >
          <Phone className="h-4 w-4 mr-2" />
          Initialize Phone System
        </Button>
      </div>
    );
  }

  return null;
};

export default TwilioClient;
