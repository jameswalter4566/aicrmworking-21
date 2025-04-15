
import { useEffect, useState } from "react";
import { preloadAudioAssets } from "@/utils/audioPreloader";
import { toast } from "./ui/use-toast";

interface TwilioScriptProps {
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// Use multiple CDNs for better reliability - using Voice SDK 2.x
const TWILIO_SDK_URLS = [
  'https://sdk.twilio.com/js/voice/2.8.0/twilio.min.js',
  'https://media.twiliocdn.com/sdk/js/voice/releases/2.8.0/twilio.min.js',
  'https://cdn.jsdelivr.net/npm/@twilio/voice-sdk@2.8.0/dist/twilio.min.js'
];

const TwilioScript: React.FC<TwilioScriptProps> = ({ onLoad, onError }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Skip audio preload to avoid decoding errors
    // We'll load sounds dynamically when needed instead
    
    // Check if Twilio is already loaded
    if (window.Twilio && window.Twilio.Device) {
      console.log("🔶 Twilio Voice SDK already loaded", { 
        version: window.Twilio.VERSION || window.Twilio.Device.version || 'unknown',
        deviceAvailable: !!window.Twilio.Device,
        isSupported: window.Twilio.Device.isSupported
      });
      
      // Test if Device constructor works with this instance
      try {
        const deviceConstructor = window.Twilio.Device;
        console.log("🔶 Twilio Device constructor is available");
        
        // Device in 2.x is not a singleton but a constructor
        if (typeof deviceConstructor === 'function') {
          console.log("🔶 Twilio Device is a constructor as expected in SDK 2.x");
          setLoaded(true);
          setLoadedUrl('Already Loaded');
          if (onLoad) onLoad();
          return;
        }
      } catch (e) {
        console.error("🔶 Error checking Twilio.Device:", e);
      }
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
      console.log(`🔶 Attempting to load Twilio Voice SDK (2.x) from: ${url}`);
      
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'twilio-js-sdk';
        script.src = url;
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        
        script.onload = () => {
          console.log("🔶 Twilio Voice SDK 2.x loaded successfully", {
            version: window.Twilio?.VERSION || window.Twilio?.Device?.version || 'unknown',
            deviceAvailable: !!window.Twilio?.Device,
            isSupported: window.Twilio?.Device?.isSupported
          });

          // Test the Device constructor in SDK 2.x
          try {
            const deviceConstructor = window.Twilio?.Device;
            if (typeof deviceConstructor === 'function') {
              console.log("🔶 Twilio Device constructor is available in SDK 2.x");
              setLoaded(true);
              setLoadedUrl(url);
              
              toast({
                title: "Twilio Voice SDK 2.x Loaded",
                description: "Call functionality is now available."
              });
              
              if (onLoad) onLoad();
              resolve();
            } else {
              console.warn("🔶 Twilio Device is not a constructor, might not be SDK 2.x");
              reject(new Error("Loaded script is not SDK 2.x"));
            }
          } catch (e) {
            console.error("🔶 Error accessing Twilio.Device constructor:", e);
            reject(e);
          }
        };
        
        script.onerror = () => {
          console.warn(`🔶 Failed to load Twilio SDK from ${url}`);
          
          try {
            // Clean up failed script
            if (script.parentNode) {
              script.parentNode.removeChild(script);
            } else if (document.head.contains(script)) {
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
      const errorMessage = new Error(`Failed to load Twilio SDK: ${err.message}`);
      console.error(errorMessage);
      setError(errorMessage);
      if (onError) onError(errorMessage);
      
      toast({
        title: "Twilio SDK Loading Failed",
        description: "Could not load the Twilio Voice SDK. Call functionality will be unavailable.",
        variant: "destructive",
      });
    });
  }, [onLoad, onError]);

  return null;
};

export default TwilioScript;
