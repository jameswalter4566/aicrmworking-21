
import React, { useEffect, useRef, useState } from 'react';
import { twilioAudioService } from '@/services/twilio-audio';
import { toast } from './ui/use-toast';

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
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  useEffect(() => {
    // Initialize audio context and element on component mount
    const setupAudio = async () => {
      try {
        // Create audio context
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current && AudioContext) {
          audioContextRef.current = new AudioContext();
          console.log("🔊 Audio context created:", audioContextRef.current.state);
          
          // Try to resume the audio context (needed in some browsers)
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
            console.log("🔊 Audio context resumed:", audioContextRef.current.state);
          }
        }
        
        // Create audio element if it doesn't exist
        if (!audioElementRef.current) {
          const audioEl = document.createElement('audio');
          audioEl.id = 'twilio-audio-element';
          audioEl.autoplay = true;
          audioEl.controls = false; // Hidden control
          audioEl.style.display = 'none';
          document.body.appendChild(audioEl);
          audioElementRef.current = audioEl;
          
          // Set a test sound to ensure audio system is ready
          audioEl.src = '/sounds/dialtone.mp3';
          
          audioEl.addEventListener('canplaythrough', () => {
            console.log("🔊 Audio element can play through");
            // Set volume to 30%
            audioEl.volume = 0.3;
          });
          
          audioEl.addEventListener('error', (e) => {
            console.error("🔊 Audio element error:", e);
          });
          
          // Brief touch to initialize audio
          const playPromise = audioEl.play();
          if (playPromise) {
            playPromise.then(() => {
              console.log("🔊 Test audio started successfully");
              // Stop after 500ms
              setTimeout(() => {
                audioEl.pause();
                audioEl.currentTime = 0;
                console.log("🔊 Test audio stopped");
              }, 500);
            }).catch(err => {
              console.warn("🔊 Auto-play prevented. User interaction needed:", err);
              // We'll leave this for user interaction to resolve
            });
          }
        }
      } catch (err) {
        console.error("🔊 Error setting up audio:", err);
        toast({
          title: "Audio Setup Error",
          description: "Failed to initialize audio system. Please check browser permissions.",
          variant: "destructive"
        });
      }
    };
    
    setupAudio();
    
    // Set up volume listener
    volumeListenerRef.current = (volume: number) => {
      setAudioLevel(volume);
    };
    
    twilioAudioService.addInputVolumeListener(volumeListenerRef.current);
    
    // Log info about call
    if (callActive) {
      console.log(`🔊 TwilioAudioPlayer: Active call ${callSid}`);
      
      // Play outgoing sound to the selected device
      twilioAudioService.toggleSound('outgoing', true);
      
      // Check current device
      const currentDevice = twilioAudioService.getCurrentOutputDevice();
      if (currentDevice) {
        setAudioDevice(currentDevice);
        
        // Apply the selected audio device to our audio element
        if (audioElementRef.current && 'setSinkId' in audioElementRef.current) {
          (audioElementRef.current as any).setSinkId(currentDevice)
            .then(() => console.log(`🔊 Audio output device set to: ${currentDevice}`))
            .catch(err => console.error("🔊 Error setting audio output device:", err));
        }
      }
      
      // Force-release microphone audio to ensure it's available
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log("🎤 Microphone access granted for call audio");
          // Stop tracks after a moment to release for Twilio's use
          setTimeout(() => {
            stream.getTracks().forEach(track => track.stop());
            console.log("🎤 Microphone released for Twilio");
          }, 100);
        })
        .catch(err => {
          console.error("🎤 Could not get microphone access:", err);
          toast({
            title: "Microphone Error",
            description: "Failed to access microphone. Audio may not work correctly.",
            variant: "destructive"
          });
        });
    } else if (callSid) {
      // If we have a callSid but call is no longer active, play disconnect sound
      twilioAudioService.toggleSound('disconnect', true);
    }
    
    return () => {
      // Clean up
      if (volumeListenerRef.current) {
        twilioAudioService.removeInputVolumeListener(volumeListenerRef.current);
      }
      
      // Don't remove audio element on unmount as it might be needed by other components
    };
  }, [callActive, callSid]);
  
  // This component doesn't render anything visible, but includes a hidden audio element
  return (
    <div style={{ display: 'none' }}>
      {/* Audio element is created in useEffect and appended to body */}
    </div>
  );
};

export default TwilioAudioPlayer;
