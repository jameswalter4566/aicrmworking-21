
import React, { useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';

interface TwilioScriptProps {
  onLoaded?: () => void;
}

export const TwilioScript: React.FC<TwilioScriptProps> = ({ onLoaded }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Skip if Twilio is already loaded
    if (window.Twilio) {
      setIsLoaded(true);
      onLoaded?.();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.twilio.com/js/client/v1.14/twilio.js';
    script.async = true;
    script.onload = () => {
      console.log('Twilio SDK loaded successfully');
      setIsLoaded(true);
      onLoaded?.();
    };
    script.onerror = () => {
      console.error('Failed to load Twilio SDK');
      toast({
        title: "Error",
        description: "Failed to load Twilio SDK. Please check your internet connection.",
        variant: "destructive",
      });
    };

    document.body.appendChild(script);

    return () => {
      // Clean up script on component unmount
      document.body.removeChild(script);
    };
  }, [onLoaded]);

  return null; // This component doesn't render anything
};

export default TwilioScript;
