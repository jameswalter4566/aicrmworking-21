
import { useEffect, useState } from "react";

interface TwilioScriptProps {
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const TwilioScript: React.FC<TwilioScriptProps> = ({ onLoad, onError }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if Twilio is already loaded
    if (window.Twilio) {
      console.log("Twilio already loaded");
      setLoaded(true);
      if (onLoad) onLoad();
      return;
    }
    
    const existingScript = document.getElementById('twilio-js-sdk');
    if (existingScript) {
      console.log("Twilio script already exists, waiting for load");
      return;
    }
    
    console.log("Loading Twilio Client JS SDK...");
    const script = document.createElement('script');
    script.id = 'twilio-js-sdk';
    script.src = 'https://sdk.twilio.com/js/client/releases/1.14.0/twilio.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log("Twilio JS SDK loaded successfully");
      setLoaded(true);
      if (onLoad) onLoad();
    };
    
    script.onerror = (e) => {
      const error = new Error("Failed to load Twilio script");
      console.error(error);
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
