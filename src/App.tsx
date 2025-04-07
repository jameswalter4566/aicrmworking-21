
import React, { useEffect, useState } from 'react';
import TwilioScript from './components/TwilioScript';
import { TwilioAudioPlayer } from './components/TwilioAudioPlayer';
import { useTwilio } from './hooks/use-twilio';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';

// Create a simple HomePage component
const HomePage = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome to Twilio Voice Integration</h1>
      <p className="mb-4">This is a demonstration of Twilio Voice integration with React.</p>
      <p>Use the components to make and receive calls.</p>
    </div>
  );
};

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
