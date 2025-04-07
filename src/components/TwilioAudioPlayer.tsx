
import React, { useEffect, useRef, useState } from 'react';
import { twilioAudioService } from '@/services/twilio-audio';

interface TwilioAudioPlayerProps {
  callActive?: boolean;
  callSid?: string;
}

const TwilioAudioPlayer: React.FC<TwilioAudioPlayerProps> = ({
  callActive = false,
  callSid = ''
}) => {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioDevice, setAudioDevice] = useState<string>('');
  const volumeListenerRef = useRef<((volume: number) => void) | null>(null);
  
  useEffect(() => {
    // Set up volume listener
    volumeListenerRef.current = (volume: number) => {
      setAudioLevel(volume);
    };
    
    twilioAudioService.addInputVolumeListener(volumeListenerRef.current);
    
    // Log info about call
    if (callActive) {
      console.log(`TwilioAudioPlayer: Active call ${callSid}`);
      
      // Play outgoing sound to the selected device
      twilioAudioService.toggleSound('outgoing', true);
      
      // Check current device
      const currentDevice = twilioAudioService.getCurrentOutputDevice();
      if (currentDevice) {
        setAudioDevice(currentDevice);
      }
    } else {
      twilioAudioService.toggleSound('disconnect', true);
    }
    
    return () => {
      if (volumeListenerRef.current) {
        twilioAudioService.removeInputVolumeListener(volumeListenerRef.current);
      }
    };
  }, [callActive, callSid]);
  
  // This component doesn't render anything visible
  return null;
};

export default TwilioAudioPlayer;
