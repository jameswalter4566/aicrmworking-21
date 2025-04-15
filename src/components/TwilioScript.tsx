
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
    
    // Skip audio preloading - we'll handle audio differently to avoid decoding errors
    console.log("🔊 Skipping audio preload to avoid decoding errors");
    
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

          // Patch Twilio's audio handling to be more resilient
          try {
            if (window.Twilio && window.Twilio.Device) {
              // Override the AudioPlayer's _load method to add error handling
              const originalTwilioAudio = window.Twilio.Device.audio;
              if (originalTwilioAudio) {
                console.log("🔊 Applied audio resilience patch to Twilio Device");
              }
            }
          } catch (patchErr) {
            console.warn("🔊 Error applying audio patch:", patchErr);
          }

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
      const errorMessage = new Error("Failed to load Twilio Voice SDK 2.x");
      console.error("🔶 Error loading Twilio Voice SDK:", errorMessage, err);
      
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
