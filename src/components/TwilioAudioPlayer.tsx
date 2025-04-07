
import React, { useEffect, useRef, useState } from 'react';
import { twilioAudioService } from '@/services/twilio-audio';
import { toast } from './ui/use-toast';
import { getPreloadedAudio, playAudio } from '@/utils/audioPreloader';

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
  const callSidRef = useRef<string>('');
  
  // Function to play a sound using either our preloader or direct Audio API
  const playSound = async (soundName: string, volume: number = 0.3) => {
    try {
      // Try using preloaded audio first
      const played = await playAudio(soundName, volume);
      if (played) {
        console.log(`🔊 Successfully played sound: ${soundName}`);
        return true;
      }
      
      // Fallback: Try directly with Audio API
      const audio = new Audio(`/sounds/${soundName}.mp3`);
      audio.volume = volume;
      
      // If we have a selected audio device, try to use it
      if (audioDevice && 'setSinkId' in audio) {
        try {
          await (audio as any).setSinkId(audioDevice);
          console.log(`🔊 Set audio device to ${audioDevice} for sound: ${soundName}`);
        } catch (err) {
          console.warn(`Could not set sink ID for ${soundName}:`, err);
        }
      }
      
      await audio.play();
      console.log(`🔊 Played sound via fallback: ${soundName}`);
      return true;
    } catch (err) {
      console.warn(`Failed to play sound: ${soundName}`, err);
      return false;
    }
  };
  
  // Setup audio context and Twilio call audio handling
  const setupCallAudio = async () => {
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioContextRef.current = new AudioContext();
          console.log("🔊 Audio context created:", audioContextRef.current.state);
          
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
            console.log("🔊 Audio context resumed:", audioContextRef.current.state);
          }
        }
      }
      
      // Create or ensure audio element exists
      if (!audioElementRef.current) {
        const audioEl = document.createElement('audio');
        audioEl.id = 'twilio-call-audio';
        audioEl.autoplay = true;
        audioEl.controls = false;
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
        audioElementRef.current = audioEl;
        
        // Set volume to 70% for call audio
        audioEl.volume = 0.7;
        
        // Listen for audio events
        audioEl.addEventListener('canplaythrough', () => {
          console.log("🔊 Call audio can play through");
        });
        
        audioEl.addEventListener('playing', () => {
          console.log("🔊 Call audio is now playing");
        });
        
        audioEl.addEventListener('error', (e) => {
          console.error("🔊 Call audio error:", e);
          toast({
            title: "Call Audio Error",
            description: "There was a problem with the call audio. Please try refreshing.",
            variant: "destructive"
          });
        });
      }
      
      // Try to set audio device
      if (audioDevice && audioElementRef.current && 'setSinkId' in audioElementRef.current) {
        try {
          await (audioElementRef.current as any).setSinkId(audioDevice);
          console.log(`🔊 Set call audio output to device: ${audioDevice}`);
        } catch (err) {
          console.warn("🔊 Error setting call audio output device:", err);
        }
      }
      
      return true;
    } catch (err) {
      console.error("🔊 Error setting up call audio:", err);
      return false;
    }
  };
  
  useEffect(() => {
    // Initialize audio context and element on component mount
    setupCallAudio();
    
    // Set up volume listener
    volumeListenerRef.current = (volume: number) => {
      setAudioLevel(volume);
    };
    
    twilioAudioService.addInputVolumeListener(volumeListenerRef.current);
    
    // Subscribe to Twilio call audio events if available
    if (window.Twilio?.Device) {
      // Watch for audio events from device.audio.on('audio')
      const setupTwilioAudioHandlers = () => {
        try {
          const twilioDevice = window.Twilio.Device;
          
          // For Twilio Device 2.x
          if (twilioDevice.audio && twilioDevice.audio.on) {
            console.log("🔊 Setting up Twilio Device 2.x audio handlers");
            twilioDevice.audio.on('deviceChange', (devices: any) => {
              console.log("🔊 Twilio audio devices changed:", devices);
            });
          }
          
          // For calls - both 1.x and 2.x versions
          if (twilioDevice.calls) {
            console.log("🔊 Setting up Twilio call handlers for all active calls");
            twilioDevice.calls.forEach((call: any) => {
              // Watch for audio events
              if (!call._audioHandlerSet) {
                call._audioHandlerSet = true;
                
                call.on('audio', (audioElement: HTMLAudioElement) => {
                  console.log("🔊 Received call audio element from Twilio");
                  
                  // Use Twilio's audio element or copy its stream to ours
                  if (audioDevice && 'setSinkId' in audioElement) {
                    (audioElement as any).setSinkId(audioDevice)
                      .then(() => console.log(`🔊 Set Twilio audio element output to device: ${audioDevice}`))
                      .catch((err: any) => console.warn("🔊 Error setting Twilio audio device:", err));
                  }
                  
                  // Ensure audio is playing
                  audioElement.play()
                    .then(() => console.log("🔊 Twilio audio playback started"))
                    .catch(err => console.warn("🔊 Could not auto-start Twilio audio:", err));
                });
                
                // Also hook into volume events for visualization
                call.on('volume', (inputVol: number, outputVol: number) => {
                  setAudioLevel(outputVol); // Use the output volume for visualization
                });
              }
            });
          }
          
          return true;
        } catch (err) {
          console.error("🔊 Error setting up Twilio audio handlers:", err);
          return false;
        }
      };
      
      setupTwilioAudioHandlers();
      
      // Setup handler for new calls
      if (window.Twilio.Device.on) {
        // For device 2.x
        window.Twilio.Device.on('incoming', (call: any) => {
          console.log("🔊 Incoming call, setting up audio handlers");
          callSidRef.current = call.parameters.CallSid;
          
          call.on('audio', (audioElement: HTMLAudioElement) => {
            console.log("🔊 Received incoming call audio element");
            // Set the output device if one is selected
            if (audioDevice && 'setSinkId' in audioElement) {
              (audioElement as any).setSinkId(audioDevice)
                .then(() => console.log(`🔊 Set incoming call audio to device: ${audioDevice}`))
                .catch((err: any) => console.warn("🔊 Error setting incoming call audio device:", err));
            }
            
            // Ensure volume is set and audio is playing
            audioElement.volume = 0.7;
            audioElement.play()
              .catch(err => console.warn("🔊 Could not auto-play incoming call audio:", err));
          });
        });
      }
    }
    
    // On component unmount
    return () => {
      // Clean up
      if (volumeListenerRef.current) {
        twilioAudioService.removeInputVolumeListener(volumeListenerRef.current);
      }
      
      // Don't remove audio element on unmount as it might be needed by other components
    };
  }, []);
  
  // Handle changes in callActive state or callSid
  useEffect(() => {
    if (callSid !== callSidRef.current) {
      callSidRef.current = callSid;
    }
    
    // Log info about call
    if (callActive) {
      console.log(`🔊 TwilioAudioPlayer: Active call ${callSid}`);
      
      // Play outgoing sound to the selected device
      playSound('outgoing', 0.3);
      
      // Check current device
      const currentDevice = twilioAudioService.getCurrentOutputDevice();
      if (currentDevice) {
        setAudioDevice(currentDevice);
        setupCallAudio().then(() => {
          // Apply the selected audio device to our audio element
          if (audioElementRef.current && 'setSinkId' in audioElementRef.current) {
            (audioElementRef.current as any).setSinkId(currentDevice)
              .then(() => console.log(`🔊 Audio output device set to: ${currentDevice}`))
              .catch(err => console.error("🔊 Error setting audio output device:", err));
          }
        });
        
        // Also try to update any existing Twilio call audio elements
        if (window.Twilio?.Device?.calls) {
          window.Twilio.Device.calls.forEach((call: any) => {
            if (call._mediaHandler && call._mediaHandler._remoteStream) {
              const audioEl = call._mediaHandler._remoteStream.audio;
              if (audioEl && audioEl._element && 'setSinkId' in audioEl._element) {
                (audioEl._element as any).setSinkId(currentDevice)
                  .then(() => console.log(`🔊 Set Twilio call audio to device: ${currentDevice}`))
                  .catch((err: any) => console.warn("🔊 Error setting Twilio call audio device:", err));
              }
            }
          });
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
      playSound('disconnect', 0.3);
    }
  }, [callActive, callSid, audioDevice]);
  
  // Handle audio device changes
  useEffect(() => {
    const handleDeviceChange = async () => {
      const newDevice = twilioAudioService.getCurrentOutputDevice();
      if (newDevice !== audioDevice) {
        setAudioDevice(newDevice);
        console.log(`🔊 Audio device changed to ${newDevice}`);
        
        // Update audio element if it exists
        if (audioElementRef.current && 'setSinkId' in audioElementRef.current) {
          try {
            await (audioElementRef.current as any).setSinkId(newDevice);
            console.log(`🔊 Updated audio element sink ID to ${newDevice}`);
          } catch (err) {
            console.warn(`🔊 Error updating audio element sink ID:`, err);
          }
        }
        
        // Also update any Twilio call audio elements
        if (window.Twilio?.Device?.calls) {
          window.Twilio.Device.calls.forEach((call: any) => {
            if (call._mediaHandler && call._mediaHandler._remoteStream) {
              const audioEl = call._mediaHandler._remoteStream.audio;
              if (audioEl && audioEl._element && 'setSinkId' in audioEl._element) {
                (audioEl._element as any).setSinkId(newDevice)
                  .catch((err: any) => console.warn("🔊 Error setting Twilio call audio device:", err));
              }
            }
          });
        }
      }
    };
    
    // Set up device change listener
    twilioAudioService.addDeviceChangeListener(handleDeviceChange);
    
    // Clean up
    return () => {
      twilioAudioService.removeDeviceChangeListener(handleDeviceChange);
    };
  }, [audioDevice]);
  
  // This component doesn't render anything visible, but includes a hidden audio element
  return (
    <div style={{ display: 'none' }}>
      {/* Audio element is created in useEffect and appended to body */}
    </div>
  );
};

export default TwilioAudioPlayer;
