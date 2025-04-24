
import React, { useEffect, useRef, useState } from 'react';

interface TwilioAudioPlayerProps {
  sound: string;
}

/**
 * A component for playing audio files safely in the Twilio context
 * This avoids AudioContext issues by creating new audio elements each time
 */
const TwilioAudioPlayer: React.FC<TwilioAudioPlayerProps> = ({ sound }) => {
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create a new audio element each time to avoid reuse issues
    const playSound = (url: string) => {
      try {
        // Clean up any previous audio elements
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
        
        // Don't attempt to play sounds if URL is empty
        if (!url) {
          console.log("No sound URL provided, skipping audio playback");
          return;
        }

        // Create a fresh audio element
        const audio = document.createElement('audio');
        audio.src = url;
        audio.preload = 'auto';
        audio.style.display = 'none';
        
        // Add to DOM to ensure it loads
        if (containerRef.current) {
          containerRef.current.appendChild(audio);
        }
        
        // Set up event handlers
        audio.oncanplaythrough = () => {
          setAudioLoaded(true);
        };
        
        audio.onerror = (event) => {
          console.error('Audio error:', audio.error);
          setAudioError(`Error loading audio: ${audio.error?.message || 'Unknown error'}`);
          setAudioLoaded(false);
          
          // Remove the problematic audio element
          if (containerRef.current && containerRef.current.contains(audio)) {
            containerRef.current.removeChild(audio);
          }
        };
        
        // Just preload for now - don't auto play
        audio.load();
      } catch (error) {
        console.error('Error creating audio element:', error);
        setAudioError(`Failed to create audio: ${error.message}`);
      }
    };
    
    if (sound) {
      playSound(sound);
    }
    
    // Clean up function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [sound]);
  
  // Hidden container for audio elements
  return <div ref={containerRef} style={{ display: 'none' }} />;
};

export default TwilioAudioPlayer;
