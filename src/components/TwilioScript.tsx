
import { useEffect, useState } from "react";

interface TwilioScriptProps {
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// Use multiple CDNs for better reliability
const TWILIO_SDK_URLS = [
  'https://sdk.twilio.com/js/voice/2.0.0/twilio.voice.min.js', // Voice SDK is more appropriate than client SDK
  'https://media.twiliocdn.com/sdk/js/voice/releases/2.0.0/twilio.voice.min.js',
  'https://cdn.jsdelivr.net/npm/@twilio/voice-sdk@2.0.0/dist/twilio.voice.min.js'
];

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
    
    const loadScript = (urls: string[], index = 0): Promise<void> => {
      if (index >= urls.length) {
        throw new Error("All Twilio SDK URLs failed to load");
      }
      
      const url = urls[index];
      console.log(`🔶 Attempting to load Twilio Voice JavaScript SDK from: ${url}`);
      
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'twilio-js-sdk';
        script.src = url;
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        
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
          resolve();
        };
        
        script.onerror = () => {
          console.warn(`🔶 Failed to load Twilio SDK from ${url}`);
          document.head.removeChild(script);
          
          // Try the next URL
          loadScript(urls, index + 1).then(resolve).catch(reject);
        };
        
        document.head.appendChild(script);
      });
    };
    
    loadScript(TWILIO_SDK_URLS).catch((err) => {
      const errorMessage = new Error("Failed to load Twilio Voice SDK");
      console.error("🔶 Error loading Twilio Voice SDK:", errorMessage, err);
      
      // Additional diagnostic information
      console.log("🔶 SDK Load Diagnostics:", {
        urls: TWILIO_SDK_URLS,
        timestamp: new Date().toISOString(),
        networkStatus: navigator.onLine,
      });
      
      setError(errorMessage);
      if (onError) onError(errorMessage);
    });
    
    return () => {
      // Don't remove the script on component unmount as other components might use it
    };
  }, [onLoad, onError]);

  return null; // This component doesn't render anything
};

export default TwilioScript;
