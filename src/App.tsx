
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Auth from './pages/Auth';
import People from './pages/People';
import Deals from './pages/Deals';
import SMSCampaign from './pages/SMSCampaign';
import AIDialer from './pages/AIDialer';
import PowerDialer from './pages/PowerDialer';
import PredictiveDialer from './pages/PredictiveDialer';
import PitchDeckPro from './pages/PitchDeckPro';
import AmortizationCalculator from './pages/AmortizationCalculator';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import ResetPassword from './pages/ResetPassword';
import MainLayout from './components/layouts/MainLayout';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { IndustryProvider } from './context/IndustryContext';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <IndustryProvider>
          <Routes>
            <Route path="/" element={<PublicRoute><Index /></PublicRoute>} />
            <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
            <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
            <Route path="/people" element={<ProtectedRoute><MainLayout><People /></MainLayout></ProtectedRoute>} />
            <Route path="/deals" element={<ProtectedRoute><MainLayout><Deals /></MainLayout></ProtectedRoute>} />
            <Route path="/sms-campaign" element={<ProtectedRoute><MainLayout><SMSCampaign /></MainLayout></ProtectedRoute>} />
            <Route path="/ai-dialer" element={<ProtectedRoute><MainLayout><AIDialer /></MainLayout></ProtectedRoute>} />
            <Route path="/power-dialer" element={<ProtectedRoute><MainLayout><PowerDialer /></MainLayout></ProtectedRoute>} />
            <Route path="/predictive-dialer" element={<ProtectedRoute><MainLayout><PredictiveDialer /></MainLayout></ProtectedRoute>} />
            <Route path="/pitch-deck-pro" element={<ProtectedRoute><MainLayout><PitchDeckPro /></MainLayout></ProtectedRoute>} />
            <Route path="/amortization-calculator" element={<ProtectedRoute><MainLayout><AmortizationCalculator /></MainLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </IndustryProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
