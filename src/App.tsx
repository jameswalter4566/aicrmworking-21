
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <TwilioScript 
        onLoad={() => console.log("Twilio SDK loaded and ready!")}
        onError={(error) => console.error("Error loading Twilio SDK:", error)}
      />
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
