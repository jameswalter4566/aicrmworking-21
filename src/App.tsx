import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import Index from "@/pages/Index";
import LandingPage from "@/pages/LandingPage";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import People from "@/pages/People";
import Deals from "@/pages/Deals";
import Pipeline from "@/pages/Pipeline";
import Processor from "@/pages/Processor";
import LeadProfile from "@/pages/LeadProfile";
import PitchDeckBuilder from "@/pages/PitchDeckBuilder";
import PitchDeckLandingPage from "@/pages/PitchDeckLandingPage";
import PitchDeckPro from "@/pages/PitchDeckPro";
import LoanApplicationViewer from "@/pages/LoanApplicationViewer";
import NotFound from "@/pages/NotFound";
import AIRealtor from "@/pages/AIRealtor";
import AIDialer from "@/pages/AIDialer";
import PowerDialer from "@/pages/PowerDialer";
import PredictiveDialer from "@/pages/PredictiveDialer";
import SMSCampaign from "@/pages/SMSCampaign";
import YourHomeSolution from "@/pages/YourHomeSolution";
import Settings from "@/pages/Settings";
import ListingPresentation from "@/pages/ListingPresentation";
import { AuthProvider } from "@/context/AuthContext";
import { IndustryProvider } from "@/context/IndustryContext";
import AmortizationCalculator from "@/pages/AmortizationCalculator";
import MortgageApplication from "@/pages/MortgageApplication";

function App() {
  useEffect(() => {
    // Check if the current URL contains the auth callback
    if (window.location.hash.includes('access_token')) {
      // Extract the access token from the URL
      const accessToken = window.location.hash.split('&')[0].split('=')[1];

      // Store the access token in localStorage
      localStorage.setItem('supabase.auth.token', accessToken);

      // Redirect the user to the desired page
      window.location.href = '/';
    }
  }, []);

  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={0}>
        <AuthProvider>
          <IndustryProvider>
            <Routes>
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/people" element={<ProtectedRoute><People /></ProtectedRoute>} />
              <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
              <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
              <Route path="/processor" element={<ProtectedRoute><Processor /></ProtectedRoute>} />
              <Route path="/lead-profile/:id" element={<ProtectedRoute><LeadProfile /></ProtectedRoute>} />
              <Route path="/pitch-deck-builder" element={<ProtectedRoute><PitchDeckBuilder /></ProtectedRoute>} />
              <Route path="/pitch-deck-landing-page/:id" element={<ProtectedRoute><PitchDeckLandingPage /></ProtectedRoute>} />
              <Route path="/pitch-deck-pro" element={<ProtectedRoute><PitchDeckPro /></ProtectedRoute>} />
              <Route path="/loan-application/:id" element={<ProtectedRoute><LoanApplicationViewer /></ProtectedRoute>} />
              <Route path="/mortgage-application" element={<ProtectedRoute><MortgageApplication /></ProtectedRoute>} />
              <Route path="/ai-realtor" element={<ProtectedRoute><AIRealtor /></ProtectedRoute>} />
              <Route path="/ai-dialer" element={<ProtectedRoute><AIDialer /></ProtectedRoute>} />
              <Route path="/power-dialer" element={<ProtectedRoute><PowerDialer /></ProtectedRoute>} />
              <Route path="/predictive-dialer" element={<ProtectedRoute><PredictiveDialer /></ProtectedRoute>} />
              <Route path="/sms-campaign" element={<ProtectedRoute><SMSCampaign /></ProtectedRoute>} />
              <Route path="/your-home-solution" element={<ProtectedRoute><YourHomeSolution /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/listing-presentation" element={<ProtectedRoute><ListingPresentation /></ProtectedRoute>} />
              <Route path="/amortization-calculator" element={<ProtectedRoute><AmortizationCalculator /></ProtectedRoute>} />
              <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
              <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
              <Route path="/landing" element={<PublicRoute><LandingPage /></PublicRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </IndustryProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
