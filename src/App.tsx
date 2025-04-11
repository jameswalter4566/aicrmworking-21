import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TwilioScript from "./components/TwilioScript";
import { useEffect, useState } from "react";
import { audioProcessing } from "./services/audioProcessing";
import { twilioService } from "./services/twilio";
import { twilioAudioService } from "./services/twilio-audio";
import { GlobalAudioSettings } from "./components/GlobalAudioSettings";
import { AuthProvider } from "./context/AuthContext";
import { IndustryProvider } from "./context/IndustryContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Index from "./pages/Index";
import People from "./pages/People";
import Deals from "./pages/Deals";
import Pipeline from "./pages/Pipeline";
import PowerDialer from "./pages/PowerDialer";
import AIDialer from "./pages/AIDialer";
import SMSCampaign from "./pages/SMSCampaign";
import Settings from "./pages/Settings";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AmortizationCalculator from "./pages/AmortizationCalculator";
import PitchDeckPro from "./pages/PitchDeckPro";
import PitchDeckBuilder from "./pages/PitchDeckBuilder";
import PitchDeckLandingPage from "./pages/PitchDeckLandingPage";
import YourHomeSolution from "./pages/YourHomeSolution";
import PredictiveDialer from "./pages/PredictiveDialer";
import AIRealtor from "./pages/AIRealtor";
import ListingPresentation from "./pages/ListingPresentation";
import LeadProfile from "./pages/LeadProfile";
import LoanApplicationViewer from "./pages/LoanApplicationViewer";
import ProcessorAssist from "./pages/ProcessorAssist";

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
    const hasAudioContext = typeof window.AudioContext !== 'undefined' || 
      typeof (window as any).webkitAudioContext !== 'undefined';
    
    console.log("🎤 Audio Context available:", hasAudioContext);
    
    console.log("🎛️ Audio System Diagnostic");
    console.log("🎤 Browser Audio Support:", {
      audioContextAvailable: hasAudioContext,
      mediaDevicesAvailable: !!navigator.mediaDevices,
      mediaDevicesEnumerateAvailable: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
      getUserMediaAvailable: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      userAgent: navigator.userAgent
    });
    
    const checkTwilioAudio = () => {
      const hasTwilioAudio = !!(window.Twilio && window.Twilio.Device && window.Twilio.Device.audio);
      setTwilioAudioAvailable(hasTwilioAudio);
      if (hasTwilioAudio) {
        console.log("🎤 Twilio.Device.audio is available");
      }
    };
    
    checkTwilioAudio();
    setTimeout(checkTwilioAudio, 3000);
    
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
        
        if (testContext.state !== 'closed') {
          testContext.close().catch(err => console.log("Error closing test audio context:", err));
        }
      }
    } catch (err) {
      console.error("🎤 Audio Context test creation failed:", err);
      setAudioContextState("error");
    }
    
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
        
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("🎤 Microphone access test failed:", err);
        setMicrophoneState("denied");
      }
    };
    
    testMicAccess();
    
    const interval = setInterval(async () => {
      if (window.location.pathname.includes('/poqwer-dialer') || 
          window.location.pathname.includes('/ai-dialer')) {
        console.group('🎤 Audio Streaming Diagnostics');
        
        const audioDiagnostics = audioProcessing.getDiagnostics() as AudioDiagnostics;
        
        if (window.Twilio?.Device?.audio) {
          try {
            const outputDevices = await twilioAudioService.getOutputDevices();
            audioDiagnostics.availableDevices = outputDevices.length;
          } catch (err) {
            audioDiagnostics.availableDevices = 0;
          }
        }
        
        console.log('Audio Processing:', audioDiagnostics);
        
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
        
        const twilioAvailable = !!(window.Twilio && window.Twilio.Device);
        console.log('Twilio available:', twilioAvailable, window.Twilio ? {
          version: window.Twilio.VERSION || 'unknown',
          hasDevice: !!window.Twilio.Device,
          hasAudio: !!(window.Twilio.Device && window.Twilio.Device.audio)
        } : 'Not loaded');
        
        console.log('Audio Context available:', audioContextState);
        console.log('Microphone permission:', microphoneState);
        
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

function App() {
  const [twilioLoaded, setTwilioLoaded] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <IndustryProvider>
            <Toaster />
            <Sonner />
            <TwilioScript 
              onLoad={() => {
                console.log("🎉 Twilio SDK loaded and ready!");
                setTwilioLoaded(true);
                if (window.Twilio?.Device) {
                  twilioService.initializeTwilioDevice().then(success => {
                    if (success && window.Twilio.Device.audio) {
                      console.log("🎤 Twilio Device audio is available");
                    }
                  });
                }
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
                <Route path="/landing" element={<PublicRoute><LandingPage /></PublicRoute>} />
                <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/people" element={<ProtectedRoute><People /></ProtectedRoute>} />
                <Route path="/lead/:id" element={<ProtectedRoute><LeadProfile /></ProtectedRoute>} />
                <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
                <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
                <Route path="/power-dialer" element={<PowerDialer />} />
                <Route path="/predictive-dialer" element={<PredictiveDialer />} />
                <Route path="/ai-dialer" element={<AIDialer />} />
                <Route path="/ai-realtor" element={<ProtectedRoute><AIRealtor /></ProtectedRoute>} />
                <Route path="/listing-presentation" element={<ProtectedRoute><ListingPresentation /></ProtectedRoute>} />
                <Route path="/sms-campaign" element={<SMSCampaign />} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                
                <Route path="/amortization" element={<ProtectedRoute><AmortizationCalculator /></ProtectedRoute>} />
                <Route path="/pitch-deck" element={<ProtectedRoute><PitchDeckPro /></ProtectedRoute>} />
                <Route path="/pitch-deck/builder/:id" element={<ProtectedRoute><PitchDeckBuilder /></ProtectedRoute>} />
                <Route path="/pitch-deck/builder" element={<ProtectedRoute><PitchDeckBuilder /></ProtectedRoute>} />
                <Route path="/processor" element={<ProtectedRoute><ProcessorAssist /></ProtectedRoute>} />
                
                {/* Original pitch deck landing page route */}
                <Route path="/pitch-deck/view/:slug" element={<PitchDeckLandingPage />} />
                
                {/* New consolidated and scalable solution */}
                <Route path="/your-home-solution/:id" element={<YourHomeSolution />} />
                
                {/* Legacy URL formats that will be redirected to the new format */}
                <Route path="/yourhomesolution/:id" element={<YourHomeSolution />} />
                <Route path="/yourhomesolution*" element={<YourHomeSolution />} />
                
                <Route path="/loan-application/:id" element={<ProtectedRoute><LoanApplicationViewer /></ProtectedRoute>} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </IndustryProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
