
import React, { useEffect, useRef, useState } from 'react';
import { toast } from './ui/use-toast';
import { getPreloadedAudio, playAudio } from '@/utils/audioPreloader';

interface TwilioAudioPlayerProps {
  sound: string;
  volume?: number;
  autoPlay?: boolean;
  loop?: boolean;
  onEnded?: () => void;
}

const TwilioAudioPlayer: React.FC<TwilioAudioPlayerProps> = ({
  sound,
  volume = 0.3,
  autoPlay = false,
  loop = false,
  onEnded
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    try {
      // Create a new audio element instead of using preloaded one to avoid decoding issues
      const audioElement = new Audio(sound);
      
      // Configure the audio element
      audioElement.volume = volume;
      audioElement.loop = loop;
      
      // Set up event handlers
      audioElement.onended = () => {
        setIsPlaying(false);
        if (onEnded) onEnded();
      };
      
      audioElement.onerror = (e) => {
        console.warn('Audio playback error:', e);
        // Don't show toast for Twilio internal audio errors to prevent disruption
        // We'll let Twilio handle its own fallbacks
      };
      
      // Store the reference
      audioRef.current = audioElement;
      
      // Auto-play if requested
      if (autoPlay) {
        audioElement.play().catch((err) => {
          console.warn('Autoplay prevented:', err);
          setIsPlaying(false);
        });
      }
    } catch (err) {
      console.warn('Error initializing audio player:', err);
    }
    
    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current = null;
      }
    };
  }, [sound, volume, loop, autoPlay, onEnded]);

  // Play/pause controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.warn('Error playing audio:', err);
          setIsPlaying(false);
        });
    }
  };

  return null; // This is a non-visual component
};

export default TwilioAudioPlayer;
