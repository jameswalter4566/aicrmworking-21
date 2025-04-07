
import React, { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { twilioAudioHandler } from '@/services/TwilioAudioHandler';

interface TwilioAudioPlayerProps {
  active?: boolean;
  deviceId?: string;
}

/**
 * TwilioAudioPlayer - Component that handles Twilio audio output
 * Sets up audio elements and manages output devices
 */
export function TwilioAudioPlayer({ active = false, deviceId = 'default' }: TwilioAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [audioFailures, setAudioFailures] = useState(0);
  
  // Initialize audio element when the component mounts
  useEffect(() => {
    // Create an audio element and set up its properties
    const setupAudio = async () => {
      if (!audioRef.current) return;
      
      try {
        // Attempt to set the sink ID if supported
        if ('setSinkId' in audioRef.current) {
          try {
            await (audioRef.current as any).setSinkId(deviceId);
            console.log(`Audio output device set to: ${deviceId}`);
          } catch (err) {
            console.warn(`Could not set audio output device: ${err}`);
          }
        }
        
        // Set audio properties
        audioRef.current.autoplay = true;
        audioRef.current.muted = false;
        audioRef.current.volume = 1.0;
        
        // Create a simple audio context to ensure audio is working
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const audioCtx = new AudioContext();
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 1.0;
          
          // Source doesn't matter, we just want to initialize the audio system
          const oscillator = audioCtx.createOscillator();
          oscillator.type = 'sine';
          oscillator.frequency.value = 0; // Silent oscillator
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          // Start and immediately stop - this just initializes audio
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.001);
          
          setIsAudioEnabled(true);
          console.log('Audio system initialized');
        }
      } catch (err) {
        console.error('Error setting up audio:', err);
        setAudioFailures(prev => prev + 1);
      }
    };
    
    setupAudio();
    
    // Set up automatic retry for failing audio
    const interval = setInterval(() => {
      // If audio is active but we have failures, try to reinitialize
      if (active && audioFailures > 0) {
        console.log(`Attempting audio recovery (failure count: ${audioFailures})`);
        setupAudio();
      }
    }, 3000);
    
    return () => {
      clearInterval(interval);
    };
  }, [deviceId, active, audioFailures]);
  
  // Handle device ID changes
  useEffect(() => {
    const updateAudioDevice = async () => {
      if (!audioRef.current || !('setSinkId' in audioRef.current)) return;
      
      try {
        await (audioRef.current as any).setSinkId(deviceId);
        console.log(`Updated audio output device to: ${deviceId}`);
      } catch (err) {
        console.warn(`Could not update audio output device: ${err}`);
      }
    };
    
    updateAudioDevice();
  }, [deviceId]);
  
  // Handle active state changes
  useEffect(() => {
    if (active && !isAudioEnabled && audioFailures >= 3) {
      // If we've had multiple failures and audio is supposed to be active,
      // notify the user about potential audio issues
      toast({
        title: "Audio System Warning",
        description: "Having trouble initializing audio. Please check your browser settings and permissions.",
        variant: "destructive"
      });
    }
  }, [active, isAudioEnabled, audioFailures]);
  
  // This component doesn't render anything visible, just the audio element
  return (
    <audio 
      ref={audioRef} 
      id="twilio-audio-output"
      style={{ display: 'none' }} 
      autoPlay
    />
  );
}
