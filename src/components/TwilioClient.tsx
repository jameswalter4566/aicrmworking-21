import React, { useState, useEffect, useCallback, useRef } from "react";
import { Device, Call } from "@twilio/voice-sdk";
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
      makeCall: (number: string) => Promise<Call | void>;
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
  const deviceRef = useRef<Device | null>(null);

  // Track call quality metrics
  const [callQuality, setCallQuality] = useState<{
    mos: number | null;
    jitter: number | null;
    packetsLost: number | null;
    rtt: number | null;
  }>({
    mos: null,
    jitter: null,
    packetsLost: null,
    rtt: null,
  });

  const fetchToken = useCallback(async () => {
    try {
      console.log("Fetching Twilio token...");
      const { data, error } = await supabase.functions.invoke("twilio-token", {
        method: "POST",
        body: { identity: `user${Math.floor(Math.random() * 10000)}` },
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
                 "identity:", data.identity || "unknown",
                 "type:", data.tokenType || "unknown");
      
      tokenRef.current = data.token;
      return data.token;
    } catch (error: any) {
      console.error("Failed to fetch token:", error);
      toast({
        variant: "destructive",
        title: "Token Error",
        description: "Failed to get authentication token. Please try again.",
      });
      throw error;
    }
  }, [toast]);

  const initializeAudioContext = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioContext = new AudioContext();
        console.log("AudioContext initialized successfully:", audioContext.state);
        
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(err => {
            console.warn("Failed to resume AudioContext:", err);
          });
        }
        
        setAudioContextInitialized(true);
        return true;
      }
    } catch (audioError) {
      console.warn("Could not initialize AudioContext:", audioError);
    }
    return false;
  }, []);

  const handleCallSample = useCallback((sample: any) => {
    // Update call quality metrics based on WebRTC sample data
    setCallQuality({
      mos: sample.mos || null,
      jitter: sample.jitter || null,
      packetsLost: sample.packetsLost || null,
      rtt: sample.rtt || null,
    });
    
    console.log("Call quality sample:", {
      mos: sample.mos,
      jitter: sample.jitter,
      packetsLost: sample.packetsLost,
      rtt: sample.rtt,
    });
  }, []);

  const handleCallWarning = useCallback((warningName: string, warningData: any) => {
    console.warn("Call quality warning:", warningName, warningData);
    
    if (warningName === 'low-mos') {
      toast({
        variant: "default",
        title: "Call Quality Issue",
        description: "Poor call quality detected. You may experience degraded audio.",
      });
    } else if (warningName === 'high-jitter' || warningName === 'high-packet-loss') {
      toast({
        variant: "default",
        title: "Network Issue",
        description: "Network instability detected. Call quality may be affected.",
      });
    } else if (warningName === 'high-rtt') {
      toast({
        variant: "default",
        title: "Connection Delay",
        description: "High latency detected. There may be delays in the conversation.",
      });
    }
  }, [toast]);

  const handleWarningCleared = useCallback((warningName: string) => {
    console.log("Call quality warning cleared:", warningName);
    
    toast({
      title: "Call Quality Improved",
      description: "The previously detected audio issue has been resolved.",
    });
  }, [toast]);

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
      // Always fetch a fresh token to avoid any potential token expiration issues
      const token = await fetchToken();
      tokenRef.current = token;
      
      if (deviceRef.current) {
        console.log("Destroying existing device before creating new one");
        try {
          deviceRef.current.destroy();
        } catch (e) {
          console.warn("Error destroying existing device:", e);
        }
      }

      console.log("Creating new Twilio device with token");
      
      const newDevice = new Device(token, {
        enableIceGatheringTimeout: false, // Add this new option
        maxAverageBitrate: 16000,
        forceAggressiveIceNomination: true,
        edge: ['ashburn', 'tokyo', 'sydney'],
        enableImprovedSignalingErrorPrecision: true,
        closeProtection: true,
        codecPreferences: ['opus', 'pcmu'],
        appName: "PowerDialer",
        appVersion: "1.0.0",
        debug: true // Enable debug mode to get more info in console
      });

      deviceRef.current = newDevice;
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
        if (err && typeof err === 'object' && err.message) {
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
        
        // Setup call quality monitoring
        conn.on('sample', handleCallSample);
        conn.on('warning', handleCallWarning);
        conn.on('warning-cleared', handleWarningCleared);
        
        // When the call is accepted (media session set up)
        conn.on('accept', () => {
          console.log("Call accepted, media session established");
          console.log("Call parameters:", conn.parameters);
          console.log("Call direction:", conn.direction);
          
          if (conn.callerInfo && conn.callerInfo.isVerified === true) {
            toast({
              title: "Verified Caller",
              description: "This call is from a verified source.",
            });
          }
        });
        
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
      } catch (registerError: any) {
        console.error("Error registering Twilio device:", registerError);
        setIsInitializing(false);
        
        const errorMsg = registerError && typeof registerError === 'object' && registerError.message 
          ? registerError.message 
          : "Failed to register device";
        
        throw new Error(`Error registering device: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error("Error setting up Twilio device:", err);
      setStatus("error");
      setIsInitializing(false);
      
      if (onError) onError(err);
      
      if (setupAttemptsRef.current >= MAX_SETUP_ATTEMPTS) {
        setShowSetupButton(true);
      }
      
      const errorMsg = err && typeof err === 'object' && err.message 
        ? err.message 
        : "Failed to set up the phone";
      
      if (!errorNotifiedRef.current) {
        errorNotifiedRef.current = true;
        toast({
          variant: "destructive",
          title: "Setup Error",
          description: errorMsg,
        });
        
        setTimeout(() => {
          errorNotifiedRef.current = false;
        }, 5000);
      }
      
      return null;
    } finally {
      setIsInitializing(false);
    }
  }, [device, status, isInitializing, audioContextInitialized, fetchToken, handleCallSample, handleCallWarning, handleWarningCleared, initializeAudioContext, onCallConnect, onCallDisconnect, onDeviceReady, onError, toast]);

  const makeCall = useCallback(
    async (phoneNumber: string): Promise<Call | void> => {
      try {
        let currentDevice = deviceRef.current;
        
        if (!currentDevice || status !== "ready") {
          currentDevice = await setupDeviceAfterInteraction();
        }

        if (!currentDevice) {
          throw new Error("Phone device is not ready. Try again.");
        }

        const call = await currentDevice.connect({
          params: { 
            To: phoneNumber 
          }
        });
        
        setConnection(call);
        
        toast({
          title: "Calling...",
          description: `Dialing ${phoneNumber}`,
        });
        
        // Add handling for ringing state
        call.on('ringing', (hasEarlyMedia) => {
          console.log("Call is ringing, early media available:", hasEarlyMedia);
          toast({
            title: "Ringing",
            description: "Call is ringing...",
          });
        });
        
        return call;
      } catch (error: any) {
        console.error("Error making call:", error);
        
        if (onError) onError(error);
        
        if (!errorNotifiedRef.current) {
          errorNotifiedRef.current = true;
          toast({
            variant: "destructive",
            title: "Call Failed",
            description: error?.message || "Failed to make the call",
          });
          
          setTimeout(() => {
            errorNotifiedRef.current = false;
          }, 3000);
        }
        
        throw error;
      }
    },
    [status, setupDeviceAfterInteraction, onError, toast]
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

  const sendDigits = useCallback((digits: string) => {
    if (connection) {
      try {
        console.log("Sending DTMF digits:", digits);
        connection.sendDigits(digits);
        toast({
          title: "Sent Digits",
          description: `Sent DTMF tones: ${digits}`,
        });
      } catch (e) {
        console.error("Error sending DTMF digits:", e);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to send DTMF tones",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "No Active Call",
        description: "Cannot send digits: no active call",
      });
    }
  }, [connection, toast]);

  const toggleMute = useCallback((shouldMute?: boolean) => {
    if (connection) {
      try {
        const currentlyMuted = connection.isMuted();
        const newMuteState = shouldMute !== undefined ? shouldMute : !currentlyMuted;
        
        connection.mute(newMuteState);
        
        toast({
          title: newMuteState ? "Muted" : "Unmuted",
          description: newMuteState ? "Your microphone is now muted" : "Your microphone is now unmuted",
        });
        
        return newMuteState;
      } catch (e) {
        console.error("Error toggling mute:", e);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to change mute status",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "No Active Call",
        description: "Cannot toggle mute: no active call",
      });
    }
    return false;
  }, [connection, toast]);

  const isReady = useCallback(() => {
    return device !== null && status === "ready";
  }, [device, status]);

  const setupDeviceWrapper = useCallback(async (): Promise<void> => {
    // Always fetch a fresh token
    try {
      await fetchToken();
    } catch (err) {
      console.error("Failed to fetch token in wrapper:", err);
    }
    
    if (!audioContextInitialized) {
      setShowSetupButton(true);
    } else {
      await setupDeviceAfterInteraction();
    }
  }, [fetchToken, audioContextInitialized, setupDeviceAfterInteraction]);

  useEffect(() => {
    if (device) {
      const handleTokenWillExpire = async () => {
        console.log("Token will expire soon, refreshing...");
        try {
          const newToken = await fetchToken();
          device.updateToken(newToken);
          console.log("Token refreshed successfully");
        } catch (error) {
          console.error("Failed to refresh token:", error);
        }
      };
      
      device.on('tokenWillExpire', handleTokenWillExpire);
      
      return () => {
        device.off('tokenWillExpire', handleTokenWillExpire);
      };
    }
  }, [device, fetchToken]);

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

    (window.twilioClient as any).sendDigits = sendDigits;
    (window.twilioClient as any).toggleMute = toggleMute;
    (window.twilioClient as any).callQuality = callQuality;

    if (!deviceInitializedRef.current && !device) {
      initializeAudioContext();
      
      const timer = setTimeout(() => {
        setupDeviceWrapper().catch(err => {
          console.error("Failed to setup device in initial effect:", err);
          setupAttemptsRef.current++;
          
          if (setupAttemptsRef.current >= MAX_SETUP_ATTEMPTS) {
            setShowSetupButton(true);
          }
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
  }, [device, connection, status, callQuality, makeCall, hangupCall, sendDigits, toggleMute, setupDeviceWrapper, isReady, initializeAudioContext]);

  if (showSetupButton) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          onClick={() => {
            setShowSetupButton(false);
            setupDeviceAfterInteraction();
          }}
          className="flex items-center bg-primary"
          disabled={isInitializing}
        >
          {isInitializing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Initializing...
            </>
          ) : (
            <>
              <Phone className="h-4 w-4 mr-2" />
              Initialize Phone System
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
};

export default TwilioClient;
