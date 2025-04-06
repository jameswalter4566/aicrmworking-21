
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
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Index />} />
          <Route path="/ai-dialer" element={<AIDialer />} />
          <Route path="/power-dialer" element={<PowerDialer />} />
          <Route path="/sms-campaign" element={<SMSCampaign />} />
          <Route path="/people" element={<People />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
      <ShadcnToaster />
    </>
  );
}

export default App;
