
import { Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import AIDialer from './pages/AIDialer';
import PowerDialer from './pages/PowerDialer';
import SMSCampaign from './pages/SMSCampaign';
import People from './pages/People';
import Deals from './pages/Deals';
import NotFound from './pages/NotFound';
import MainLayout from './components/layouts/MainLayout';
import './App.css';
import { Toaster } from 'sonner';
import { Toaster as ShadcnToaster } from '@/components/ui/toaster';
import TwilioScript from './components/TwilioScript';

function App() {
  return (
    <>
      <TwilioScript />
      <Routes>
        <Route path="/" element={<MainLayout><Index /></MainLayout>} />
        <Route path="/ai-dialer" element={<MainLayout><AIDialer /></MainLayout>} />
        <Route path="/power-dialer" element={<MainLayout><PowerDialer /></MainLayout>} />
        <Route path="/sms-campaign" element={<MainLayout><SMSCampaign /></MainLayout>} />
        <Route path="/people" element={<MainLayout><People /></MainLayout>} />
        <Route path="/deals" element={<MainLayout><Deals /></MainLayout>} />
        <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
      </Routes>
      <Toaster position="top-right" />
      <ShadcnToaster />
    </>
  );
}

export default App;
