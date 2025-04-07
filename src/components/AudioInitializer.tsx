
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';

export function AudioInitializer() {
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  const checkAudioPermission = async () => {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return permissionStatus.state === 'granted';
    } catch (error) {
      console.log("Permission API not supported, skipping check");
      return false;
    }
  };
  
  const initializeAudio = async () => {
    try {
      // Create temporary audio context
      const tempContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      await tempContext.resume();
      console.log('🎤 Audio context initialized on user interaction');
      
      // Create and play a test tone to ensure audio output is working
      const oscillator = tempContext.createOscillator();
      const gainNode = tempContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, tempContext.currentTime); // A4 note
      gainNode.gain.setValueAtTime(0.2, tempContext.currentTime); // Lower volume
      
      oscillator.connect(gainNode);
      gainNode.connect(tempContext.destination);
      
      oscillator.start();
      
      // Play for 0.5 seconds then stop
      setTimeout(() => {
        oscillator.stop();
        
        toast({
          title: "Audio System Ready",
          description: "Your audio system is now initialized and ready for calls.",
        });
        
        setAudioInitialized(true);
      }, 500);
      
    } catch (error) {
      console.error('🎤 Error initializing audio context:', error);
      toast({
        title: "Audio Error",
        description: "Could not initialize audio system. Try again or check browser settings.",
        variant: "destructive",
      });
    }
  };
  
  useEffect(() => {
    // Check if already initialized
    const checkInitialization = async () => {
      const hasMicrophonePermission = await checkAudioPermission();
      
      if (hasMicrophonePermission) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx.state === "running") {
          setAudioInitialized(true);
          console.log("🎤 Audio context already initialized and running");
        } else {
          console.log("🎤 Audio context exists but suspended, needs user interaction");
        }
      }
    };
    
    checkInitialization();
    
    // Listen for user interaction on the document to initialize audio
    const handleInteraction = () => {
      if (!audioInitialized) {
        initializeAudio();
      }
    };
    
    document.addEventListener('click', handleInteraction, { once: true });
    
    return () => {
      document.removeEventListener('click', handleInteraction);
    };
  }, [audioInitialized]);
  
  if (audioInitialized) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md text-center">
        <h3 className="text-xl font-semibold mb-4">Initialize Audio System</h3>
        <p className="mb-6">
          To enable audio for browser-based calls, we need your permission to access your microphone and audio system.
        </p>
        <Button 
          onClick={initializeAudio}
          className="bg-green-500 hover:bg-green-600 text-white"
          size="lg"
        >
          Enable Audio
        </Button>
      </div>
    </div>
  );
}

export default AudioInitializer;
