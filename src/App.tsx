
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TwilioScript from "./components/TwilioScript";
import { useEffect, useState } from "react";
import { audioProcessing } from "./services/audioProcessing";
import { twilioService } from "./services/twilio";
import { twilioAudioService } from "./services/twilio-audio";
import { GlobalAudioSettings } from "./components/GlobalAudioSettings";
import Index from "./pages/Index";
import People from "./pages/People";
import Deals from "./pages/Deals";
import PowerDialer from "./pages/PowerDialer";
import AIDialer from "./pages/AIDialer";
import SMSCampaign from "./pages/SMSCampaign";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

interface AudioDiagnostics {
  isWebSocketConnected: boolean;
  webSocketState: string;
  activeStreamSid: string | null;
  isProcessing: boolean;
  inboundAudioCount: number;
  outboundAudioCount: number;
  microphoneActive: boolean;
  audioContextState: string;
  reconnectAttempts: number;
  lastProcessedAudio: string;
  audioQueueLength: number;
  isPlaying: boolean;
  selectedDevice?: string;
  availableDevices?: number;
  twilioAudioAvailable?: boolean;
}

const AudioDiagnosticLogger = () => {
  const [audioContextState, setAudioContextState] = useState<string>("unknown");
  const [microphoneState, setMicrophoneState] = useState<string>("unknown");
  const [twilioAudioAvailable, setTwilioAudioAvailable] = useState<boolean>(false);

  useEffect(() => {
    // Check audio context support
    const hasAudioContext = typeof window.AudioContext !== 'undefined' || 
      typeof (window as any).webkitAudioContext !== 'undefined';
    
    console.log("🎤 Audio Context available:", hasAudioContext);
    
    // Log once on initial render
    console.log("🎛️ Audio System Diagnostic");
    console.log("🎤 Browser Audio Support:", {
      audioContextAvailable: hasAudioContext,
      mediaDevicesAvailable: !!navigator.mediaDevices,
      mediaDevicesEnumerateAvailable: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
      getUserMediaAvailable: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      userAgent: navigator.userAgent
    });
    
    // Check for Twilio audio availability
    const checkTwilioAudio = () => {
      const hasTwilioAudio = !!(window.Twilio && window.Twilio.Device && window.Twilio.Device.audio);
      setTwilioAudioAvailable(hasTwilioAudio);
      if (hasTwilioAudio) {
        console.log("🎤 Twilio.Device.audio is available");
      }
    };
    
    // Check immediately and after a delay in case Twilio loads later
    checkTwilioAudio();
    setTimeout(checkTwilioAudio, 3000);
    
    // Manually test audio context
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const testContext = new AudioContextClass();
        setAudioContextState(testContext.state);
        console.log("🎤 Audio Context test creation:", { 
          successful: true,
          state: testContext.state,
          sampleRate: testContext.sampleRate 
        });
        
        // Properly close the test context
        if (testContext.state !== 'closed') {
          testContext.close().catch(err => console.log("Error closing test audio context:", err));
        }
      }
    } catch (err) {
      console.error("🎤 Audio Context test creation failed:", err);
      setAudioContextState("error");
    }
    
    // Test microphone access
    const testMicAccess = async () => {
      try {
        console.log("🎤 Testing microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("🎤 Microphone access test:", { 
          granted: true, 
          tracks: stream.getAudioTracks().map(t => ({
            label: t.label,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState
          }))
        });
        setMicrophoneState("granted");
        
        // Stop all tracks immediately
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("🎤 Microphone access test failed:", err);
        setMicrophoneState("denied");
      }
    };
    
    testMicAccess();
    
    // Create an interval to log diagnostic information
    const interval = setInterval(async () => {
      if (window.location.pathname.includes('/power-dialer') || 
          window.location.pathname.includes('/ai-dialer')) {
        console.group('🎤 Audio Streaming Diagnostics');
        
        // Get detailed diagnostics from audio processing service
        const audioDiagnostics = audioProcessing.getDiagnostics() as AudioDiagnostics;
        
        // Add Twilio audio device information if available
        if (window.Twilio?.Device?.audio) {
          try {
            const outputDevices = await twilioAudioService.getOutputDevices();
            audioDiagnostics.availableDevices = outputDevices.length;
          } catch (err) {
            audioDiagnostics.availableDevices = 0;
          }
        }
        
        console.log('Audio Processing:', audioDiagnostics);
        
        // Test if WebSocket could be created
        try {
          const testWs = new WebSocket('wss://echo.websocket.org');
          testWs.onopen = () => {
            console.log('WebSocket test connection successful');
            testWs.close();
          };
          testWs.onerror = (err) => {
            console.log('WebSocket test connection failed:', err);
          };
        } catch (err) {
          console.error('Cannot create test WebSocket:', err);
        }
        
        // Check if Twilio is available
        const twilioAvailable = !!(window.Twilio && window.Twilio.Device);
        console.log('Twilio available:', twilioAvailable, window.Twilio ? {
          version: window.Twilio.VERSION || 'unknown',
          hasDevice: !!window.Twilio.Device,
          hasAudio: !!(window.Twilio.Device && window.Twilio.Device.audio)
        } : 'Not loaded');
        
        // Check audio context and microphone permission status
        console.log('Audio Context available:', audioContextState);
        console.log('Microphone permission:', microphoneState);
        
        // Check Twilio audio features if available
        if (window.Twilio?.Device?.audio) {
          console.log('Twilio audio features:', {
            isOutputSelectionSupported: window.Twilio.Device.audio.isOutputSelectionSupported,
            isVolumeSupported: window.Twilio.Device.audio.isVolumeSupported,
            hasInputDevice: !!window.Twilio.Device.audio.inputDevice,
            hasInputStream: !!window.Twilio.Device.audio.inputStream
          });
        }
        
        if (audioDiagnostics.isWebSocketConnected === false && audioDiagnostics.reconnectAttempts > 0) {
          console.warn('⚠️ WebSocket connection failed after multiple attempts. Check network and server status.');
        }
        
        console.groupEnd();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return null;
};

const App = () => {
  const [twilioLoaded, setTwilioLoaded] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <TwilioScript 
          onLoad={() => {
            console.log("🎉 Twilio SDK loaded and ready!");
            setTwilioLoaded(true);
            // Initialize Twilio Device and Audio
            if (window.Twilio?.Device) {
              twilioService.initializeTwilioDevice().then(success => {
                if (success && window.Twilio.Device.audio) {
                  console.log("🎤 Twilio Device audio is available");
                  // The audio service is initialized in the twilioService.initializeTwilioDevice method
                }
              });
            }
            // Immediately attempt to connect to the audio WebSocket
            audioProcessing.connect({
              onConnectionStatus: (connected) => {
                console.log(`🔌 Audio WebSocket connection status: ${connected ? 'connected' : 'disconnected'}`);
              }
            }).then(success => {
              console.log(`🎤 WebSocket initialization ${success ? 'successful' : 'failed'}`);
            }).catch(err => {
              console.error('🎤 WebSocket initialization error:', err);
            });
          }}
          onError={(error) => console.error("❌ Error loading Twilio SDK:", error)}
        />
        <AudioDiagnosticLogger />
        <div className="fixed top-16 right-4 z-50">
          <GlobalAudioSettings />
        </div>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/people" element={<People />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/power-dialer" element={<PowerDialer />} />
            <Route path="/ai-dialer" element={<AIDialer />} />
            <Route path="/sms-campaign" element={<SMSCampaign />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
