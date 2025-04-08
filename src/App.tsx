
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import './App.css';

// Pages
import Index from "./pages/Index";
import People from "./pages/People";
import Deals from "./pages/Deals";
import PowerDialer from "./pages/PowerDialer";
import AIDialer from "./pages/AIDialer";
import SMSCampaign from "./pages/SMSCampaign";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import LandingPage from "./pages/LandingPage";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { Toaster } from "./components/ui/toaster";
import { IndustryProvider } from './context/IndustryContext';

function App() {
  return (
    <Router>
      <IndustryProvider>
        <Routes>
          <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/people" element={<ProtectedRoute><People /></ProtectedRoute>} />
          <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
          <Route path="/power-dialer" element={<ProtectedRoute><PowerDialer /></ProtectedRoute>} />
          <Route path="/ai-dialer" element={<ProtectedRoute><AIDialer /></ProtectedRoute>} />
          <Route path="/sms-campaign" element={<ProtectedRoute><SMSCampaign /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </IndustryProvider>
    </Router>
  );
}

export default App;
