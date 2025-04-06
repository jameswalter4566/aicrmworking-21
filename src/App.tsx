
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import People from "./pages/People";
import Deals from "./pages/Deals";
import PowerDialer from "./pages/PowerDialer";
import AIDialer from "./pages/AIDialer";
import SMSCampaign from "./pages/SMSCampaign";
import NotFound from "./pages/NotFound";
import TwilioScript from "./components/TwilioScript";
import { useEffect } from "react";
import { audioProcessing } from "./services/audioProcessing";
import { twilioService } from "./services/twilio";

const queryClient = new QueryClient();

const AudioDiagnosticLogger = () => {
  useEffect(() => {
    // Create an interval to log diagnostic information
    const interval = setInterval(() => {
      if (window.location.pathname === '/power-dialer') {
        console.group('🎤 Audio Streaming Diagnostics');
        console.log('Audio Processing:', audioProcessing.getDiagnostics());
        
        // Check if Twilio is available
        const twilioAvailable = !!(window.Twilio && window.Twilio.Device);
        console.log('Twilio available:', twilioAvailable, window.Twilio ? {
          version: window.Twilio.VERSION || 'unknown',
          hasDevice: !!window.Twilio.Device
        } : 'Not loaded');
        
        // Check audio context support
        const hasAudioContext = typeof window.AudioContext !== 'undefined' || 
          typeof (window as any).webkitAudioContext !== 'undefined';
        console.log('Audio Context available:', hasAudioContext);
        
        // Check if microphone is permitted
        navigator.permissions.query({ name: 'microphone' as PermissionName })
          .then(permissionStatus => {
            console.log('Microphone permission:', permissionStatus.state);
          })
          .catch(() => console.log('Could not query microphone permission'));
          
        console.groupEnd();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <TwilioScript 
        onLoad={() => console.log("Twilio SDK loaded and ready!")}
        onError={(error) => console.error("Error loading Twilio SDK:", error)}
      />
      <AudioDiagnosticLogger />
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

export default App;
