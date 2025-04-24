
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
      // Get the audio element from preloaded cache
      const audioElement = getPreloadedAudio(sound);
      
      if (audioElement) {
        // Configure the audio element
        audioElement.volume = volume;
        audioElement.loop = loop;
        
        // Set up event handlers
        audioElement.onended = () => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        };
        
        audioElement.onerror = (e) => {
          console.error('Audio playback error:', e);
          toast({
            title: "Audio Error",
            description: "Failed to play audio. Please try again.",
            variant: "destructive",
          });
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
      }
    } catch (err) {
      console.error('Error initializing audio player:', err);
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
          console.error('Error playing audio:', err);
          setIsPlaying(false);
        });
    }
  };

  return null; // This is a non-visual component
};

export default TwilioAudioPlayer;
