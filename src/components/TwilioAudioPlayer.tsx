
import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface TwilioAudioPlayerProps {
  streamSid?: string | null;
  isActive: boolean;
  deviceId?: string;
}

/**
 * A specialized component for handling Twilio audio stream playback
 * Uses both the AudioContext API and HTML Audio elements for maximum compatibility
 */
const TwilioAudioPlayer: React.FC<TwilioAudioPlayerProps> = ({ 
  streamSid, 
  isActive,
  deviceId = 'default'
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastPlayedTime, setLastPlayedTime] = useState<number>(0);
  const { toast } = useToast();
  
  // Initialize audio context when component mounts
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          gainNodeRef.current = audioContextRef.current.createGain();
          gainNodeRef.current.gain.value = 0.7; // Set default volume
          gainNodeRef.current.connect(audioContextRef.current.destination);
          
          console.log("🎵 Audio Context initialized successfully:", {
            sampleRate: audioContextRef.current.sampleRate,
            state: audioContextRef.current.state
          });
        } else {
          console.error("❌ AudioContext not supported in this browser");
          toast({
            title: "Browser Compatibility Issue",
            description: "Your browser doesn't support AudioContext for audio playback.",
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error("❌ Error initializing AudioContext:", err);
        toast({
          title: "Audio Initialization Error",
          description: "Failed to initialize audio system. Try refreshing the page.",
          variant: "destructive"
        });
      }
    }

    // Also create a backup audio element for browsers that struggle with AudioContext
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
      audioElementRef.current.autoplay = true;
      
      // Try to apply the selected audio device
      if (deviceId && 'setSinkId' in HTMLMediaElement.prototype) {
        try {
          (audioElementRef.current as any).setSinkId(deviceId)
            .then(() => console.log("🎵 Audio output device set:", deviceId))
            .catch((err: any) => console.warn("⚠️ Could not set audio device:", err));
        } catch (err) {
          console.warn("⚠️ setSinkId not supported:", err);
        }
      }
      
      // Add event listeners
      audioElementRef.current.addEventListener('error', (e) => {
        console.error("❌ Audio element error:", e);
      });
      
      audioElementRef.current.addEventListener('playing', () => {
        console.log("🎵 Audio element started playing");
      });
    }
    
    return () => {
      // Clean up audio resources
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(err => 
          console.warn("⚠️ Error closing AudioContext:", err)
        );
      }
      
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
    };
  }, [toast]);
  
  // Update audio device when deviceId changes
  useEffect(() => {
    if (deviceId && audioElementRef.current && 'setSinkId' in HTMLMediaElement.prototype) {
      try {
        (audioElementRef.current as any).setSinkId(deviceId)
          .then(() => console.log("🎵 Audio output device updated:", deviceId))
          .catch((err: any) => console.warn("⚠️ Could not update audio device:", err));
      } catch (err) {
        console.warn("⚠️ setSinkId not supported:", err);
      }
    }
  }, [deviceId]);
  
  // Handle audio playback when stream is active
  useEffect(() => {
    if (!isActive) {
      setIsPlaying(false);
      audioQueueRef.current = [];
      return;
    }
    
    const processAudioQueue = async () => {
      if (!isActive || !audioQueueRef.current.length || isPlaying) return;
      
      try {
        setIsPlaying(true);
        const audioData = audioQueueRef.current.shift();
        
        if (!audioData) {
          setIsPlaying(false);
          return;
        }
        
        // Try both playback methods for maximum compatibility
        const playWithAudioContext = async () => {
          if (!audioContextRef.current || audioContextRef.current.state === 'closed') return false;
          
          try {
            if (audioContextRef.current.state === 'suspended') {
              await audioContextRef.current.resume();
            }
            
            const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.slice(0));
            const source = audioContextRef.current.createBufferSource();
            audioBufferSourceRef.current = source;
            source.buffer = audioBuffer;
            source.connect(gainNodeRef.current!);
            
            source.onended = () => {
              setIsPlaying(false);
              setLastPlayedTime(Date.now());
              // Process next in queue
              setTimeout(processAudioQueue, 10);
            };
            
            source.start(0);
            return true;
          } catch (err) {
            console.warn("⚠️ AudioContext playback failed:", err);
            return false;
          }
        };
        
        const playWithAudioElement = () => {
          if (!audioElementRef.current) return false;
          
          try {
            const blob = new Blob([new Uint8Array(audioData)], { type: 'audio/mp3' });
            const url = URL.createObjectURL(blob);
            
            audioElementRef.current.onended = () => {
              URL.revokeObjectURL(url);
              setIsPlaying(false);
              setLastPlayedTime(Date.now());
              // Process next in queue
              setTimeout(processAudioQueue, 10);
            };
            
            audioElementRef.current.onerror = () => {
              console.error("❌ Audio element playback error:", audioElementRef.current?.error);
              URL.revokeObjectURL(url);
              setIsPlaying(false);
              // Try next in queue
              setTimeout(processAudioQueue, 10);
            };
            
            audioElementRef.current.src = url;
            audioElementRef.current.play()
              .catch(err => {
                console.warn("⚠️ Audio element play() failed:", err);
                URL.revokeObjectURL(url);
                setIsPlaying(false);
                setTimeout(processAudioQueue, 10);
              });
            
            return true;
          } catch (err) {
            console.warn("⚠️ Audio element playback failed:", err);
            return false;
          }
        };
        
        // Try AudioContext first, fall back to Audio element
        const audioContextSuccess = await playWithAudioContext();
        
        if (!audioContextSuccess) {
          console.log("ℹ️ Falling back to Audio element playback");
          playWithAudioElement();
        }
        
      } catch (err) {
        console.error("❌ Error in audio playback:", err);
        setIsPlaying(false);
        // Continue processing queue even on error
        setTimeout(processAudioQueue, 100);
      }
    };
    
    // Start processing the queue
    processAudioQueue();
    
    // Set up interval to periodically check for stalled playback
    const checkInterval = setInterval(() => {
      const now = Date.now();
      // If not playing but we have data and it's been more than 500ms since last playback
      if (!isPlaying && audioQueueRef.current.length > 0 && now - lastPlayedTime > 500) {
        processAudioQueue();
      }
    }, 1000);
    
    return () => clearInterval(checkInterval);
  }, [isActive, isPlaying, lastPlayedTime]);
  
  // Expose a function to add audio data to the queue
  const addAudioData = (base64Audio: string) => {
    try {
      if (!isActive) return;
      
      // Convert base64 to ArrayBuffer
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // Add to queue and start processing if not already playing
      audioQueueRef.current.push(bytes.buffer);
      
      // If queue is getting too large, trim it
      if (audioQueueRef.current.length > 20) {
        console.warn("⚠️ Audio queue too large, dropping oldest chunks");
        audioQueueRef.current = audioQueueRef.current.slice(-10);
      }
      
      if (!isPlaying) {
        setIsPlaying(false); // Force re-evaluation of the effect
      }
      
    } catch (err) {
      console.error("❌ Error processing audio data:", err);
    }
  };
  
  // Expose the addAudioData function globally for the audio processing service
  useEffect(() => {
    if (isActive && streamSid) {
      (window as any).twilioAudioPlayer = {
        addAudioData,
        streamSid
      };
      
      return () => {
        delete (window as any).twilioAudioPlayer;
      };
    }
  }, [isActive, streamSid]);

  return (
    <div className="hidden">
      {/* Hidden component - audio is handled programmatically */}
    </div>
  );
};

export default TwilioAudioPlayer;
