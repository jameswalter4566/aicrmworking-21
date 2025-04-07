
import React, { useEffect, useState } from 'react';
import { TwilioScript } from './components/TwilioScript';
import { TwilioAudioPlayer } from './components/TwilioAudioPlayer';
import { useTwilio } from './hooks/use-twilio';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';

// Import your pages here
import HomePage from './pages/index';

const App = () => {
  const [twilioLoaded, setTwilioLoaded] = useState(false);
  const { 
    initialized, 
    currentAudioDevice,
    activeCalls,
    audioStreaming 
  } = useTwilio();
  
  // Check if there's any active call
  const isCallActive = Object.keys(activeCalls).length > 0;

  return (
    <Router>
      {/* Load Twilio Script */}
      <TwilioScript 
        onLoad={() => setTwilioLoaded(true)}
        onError={(error) => console.error('Failed to load Twilio:', error)}
      />
      
      {/* Audio player for Twilio calls */}
      <TwilioAudioPlayer 
        active={isCallActive || audioStreaming} 
        deviceId={currentAudioDevice} 
      />
      
      {/* Routes */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      
      {/* Toast notifications */}
      <Toaster />
    </Router>
  );
};

export default App;
