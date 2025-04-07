import { useEffect, useState } from "react";
import { preloadAudioAssets } from "@/utils/audioPreloader";
import { toast } from "./ui/use-toast";

interface TwilioScriptProps {
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// Use multiple CDNs for better reliability - focusing on Twilio Client SDK 1.x
const TWILIO_SDK_URLS = [
  'https://cdn.jsdelivr.net/npm/twilio-client@1.14.0/dist/twilio.min.js',
  'https://media.twiliocdn.com/sdk/js/client/releases/1.14.0/twilio.js',
  'https://sdk.twilio.com/js/client/releases/1.14.0/twilio.js'
];

const TwilioScript: React.FC<TwilioScriptProps> = ({ onLoad, onError }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Preload audio assets
    preloadAudioAssets().then(() => {
      console.log("🔊 Audio assets preloaded successfully");
    }).catch(err => {
      console.warn("🔊 Error preloading audio assets:", err);
    });
    
    // Check if Twilio is already loaded
    if (window.Twilio && window.Twilio.Device) {
      console.log("🔶 Twilio Client SDK already loaded", { 
        version: window.Twilio.VERSION || 'unknown',
        deviceAvailable: !!window.Twilio.Device,
        audioAvailable: !!window.Twilio.Device.audio
      });
      
      // Test if audio works with this instance
      try {
        if (window.Twilio.Device.audio) {
          console.log("🔶 Twilio Device audio is available");
        } else {
          console.warn("🔶 Twilio Device audio is not available, may need to reload SDK");
        }
      } catch (e) {
        console.error("🔶 Error checking Twilio.Device.audio:", e);
      }
      
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
      console.log(`🔶 Attempting to load Twilio Client SDK from: ${url}`);
      
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'twilio-js-sdk';
        script.src = url;
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        
        script.onload = () => {
          console.log("🔶 Twilio Client SDK loaded successfully", {
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
            
            // Check if Audio features are available
            if (window.Twilio?.Device?.audio) {
              console.log("🔶 Twilio Device audio features available");
            } else {
              console.warn("🔶 Twilio Device audio features NOT available");
            }
          } catch (e) {
            console.error("🔶 Error accessing Twilio.Device constructor:", e);
            // Even if there's an error, we'll continue and let the application try to use it
          }

          setLoaded(true);
          toast({
            title: "Twilio SDK Loaded",
            description: "Call functionality is now available."
          });
          
          if (onLoad) onLoad();
          resolve();
        };
        
        script.onerror = () => {
          console.warn(`🔶 Failed to load Twilio SDK from ${url}`);
          
          try {
            // Clean up failed script
            if (script.parentNode) {
              script.parentNode.removeChild(script);
            } else {
              document.head.removeChild(script);
            }
          } catch (e) {
            console.warn("Error removing failed script:", e);
          }
          
          // Try the next URL
          loadScript(urls, index + 1).then(resolve).catch(reject);
        };
        
        document.head.appendChild(script);
      });
    };
    
    loadScript(TWILIO_SDK_URLS).catch((err) => {
      const errorMessage = new Error("Failed to load Twilio Client SDK");
      console.error("🔶 Error loading Twilio Client SDK:", errorMessage, err);
      
      // Additional diagnostic information
      console.log("🔶 SDK Load Diagnostics:", {
        urls: TWILIO_SDK_URLS,
        timestamp: new Date().toISOString(),
        networkStatus: navigator.onLine,
        browserInfo: {
          userAgent: navigator.userAgent,
          vendor: navigator.vendor,
          platform: navigator.platform
        }
      });
      
      setError(errorMessage);
      if (onError) onError(errorMessage);
      
      toast({
        title: "Twilio SDK Error",
        description: "Could not load call functionality. Please refresh the page to try again.",
        variant: "destructive"
      });
    });
    
    // We'll keep the script on unmount as other components might need it
    return () => {};
  }, [onLoad, onError]);

  return null; // This component doesn't render anything
};

export default TwilioScript;
