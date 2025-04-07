
import { useEffect, useState } from "react";

interface TwilioScriptProps {
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// Add interface for the global Voice SDK
declare global {
  interface Window {
    Twilio: {
      Device: any;
      VERSION?: string;
    };
  }
}

const TwilioScript: React.FC<TwilioScriptProps> = ({ onLoad, onError }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if Twilio is already loaded
    if (window.Twilio) {
      console.log("🔶 Twilio Voice SDK already loaded", { 
        version: window.Twilio.VERSION || 'unknown',
        deviceAvailable: !!window.Twilio.Device,
      });
      setLoaded(true);
      if (onLoad) onLoad();
      return;
    }
    
    const existingScript = document.getElementById('twilio-js-sdk');
    if (existingScript) {
      console.log("🔶 Twilio script already exists, waiting for load");
      return;
    }
    
    console.log("🔶 Loading Twilio Voice JavaScript SDK...");
    const script = document.createElement('script');
    script.id = 'twilio-js-sdk';
    // Use the NPM package via CDN for the latest 2.x version
    script.src = 'https://cdn.jsdelivr.net/npm/@twilio/voice-sdk@2.5.0/dist/voice.min.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log("🔶 Twilio Voice SDK loaded successfully", {
        version: window.Twilio?.VERSION || 'unknown',
        deviceAvailable: !!window.Twilio?.Device,
        audioEnabled: typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined',
        navigator: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          mediaDevicesAvailable: !!navigator.mediaDevices
        }
      });

      // Immediately test if Twilio.Device can be instantiated
      try {
        const deviceTest = window.Twilio?.Device;
        console.log("🔶 Twilio Device constructor available:", !!deviceTest);
      } catch (e) {
        console.error("🔶 Error accessing Twilio.Device constructor:", e);
      }

      setLoaded(true);
      if (onLoad) onLoad();
    };
    
    script.onerror = (e) => {
      const error = new Error("Failed to load Twilio Voice SDK");
      console.error("🔶 Error loading Twilio Voice SDK:", error, e);
      setError(error);
      if (onError) onError(error);
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Don't remove the script on component unmount as other components might use it
    };
  }, [onLoad, onError]);

  return null; // This component doesn't render anything
};

export default TwilioScript;
