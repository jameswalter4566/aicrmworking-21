
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
    
    // Use a specific version of Twilio Voice SDK known to work well with browser calling
    script.src = 'https://media.twiliocdn.com/sdk/js/client/v2.0.0/twilio.min.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous"; // Add cross-origin attribute
    
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
      
      // Additional diagnostic information
      console.log("🔶 SDK Load Diagnostics:", {
        url: script.src,
        timestamp: new Date().toISOString(),
        networkStatus: navigator.onLine,
        crossOrigin: script.crossOrigin
      });
      
      // Try loading from alternative CDN as fallback - use the official CDN as backup
      console.log("🔶 Attempting to load Twilio SDK from alternate CDN...");
      const alternateScript = document.createElement('script');
      alternateScript.id = 'twilio-js-sdk-alt';
      alternateScript.src = 'https://sdk.twilio.com/js/client/v2.0.0/twilio.min.js';
      alternateScript.async = true;
      alternateScript.crossOrigin = "anonymous"; // Add cross-origin attribute
      
      alternateScript.onload = () => {
        console.log("🔶 Twilio SDK loaded from alternate CDN", {
          version: window.Twilio?.VERSION || 'unknown'
        });
        setLoaded(true);
        if (onLoad) onLoad();
      };
      
      alternateScript.onerror = () => {
        console.error("🔶 Failed to load Twilio SDK from alternate CDN");
        setError(error);
        if (onError) onError(error);
      };
      
      document.head.appendChild(alternateScript);
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Don't remove the script on component unmount as other components might use it
    };
  }, [onLoad, onError]);

  return null; // This component doesn't render anything
};

export default TwilioScript;
