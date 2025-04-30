import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

export function AudioInitializer() {
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Skip audio initialization on landing page or index
  const isLandingPage = location.pathname === '/' || location.pathname === '/index' || location.pathname.includes('landing');
  
  // Completely skip rendering and initialization on landing pages
  if (isLandingPage) {
    console.log("AudioInitializer: Skipping entirely on landing page");
    return null;
  }
  
  const checkAudioInitialization = async () => {
    try {
      // Check if we've already initialized
      const initialized = localStorage.getItem('audio-initialized');
      if (initialized === 'true') {
        console.log("🔊 Audio previously initialized, checking state...");
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const context = new AudioContext();
          if (context.state === 'running') {
            console.log("🔊 Audio context already running");
            setAudioInitialized(true);
            return true;
          } else {
            console.log("🔊 Audio context exists but state is:", context.state);
            // We'll try to resume it during initialization
          }
        }
      }
      
      // Check if microphone permission is already granted
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permissionStatus.state === 'granted') {
          console.log("🎤 Microphone permission already granted");
          // Still need to initialize audio context even if mic permission is granted
          return await initializeAudio(true);
        } else {
          console.log("🎤 Microphone permission status:", permissionStatus.state);
          // Need user interaction
          setShowInitModal(true);
          return false;
        }
      } catch (error) {
        console.log("🎤 Permission API not supported, need user interaction");
        // Need user interaction
        setShowInitModal(true);
        return false;
      }
    } catch (error) {
      console.error("🔊 Error checking audio initialization:", error);
      setShowInitModal(true);
      return false;
    }
  };
  
  const initializeAudio = async (skipUserPrompt = false) => {
    // Double-check we're not on a landing page
    if (isLandingPage) {
      console.log("🔊 Prevented audio initialization on landing page");
      return false;
    }
    
    try {
      // If we need user interaction and we're not skipping the prompt
      if (!skipUserPrompt && showInitModal) {
        // Keep showing the modal, the user needs to click the button
        return false;
      }
      
      // Create and resume audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      console.log('🔊 Audio context initialized:', audioContext.state);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('🎤 Microphone access granted with tracks:', stream.getAudioTracks().length);
      
      // Play a test tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Quieter volume
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      
      // Create an audio element and test it too
      const audioElement = document.createElement('audio');
      audioElement.src = '/sounds/dialtone.mp3';
      audioElement.volume = 0.2;
      
      try {
        await audioElement.play();
        console.log('🔊 Audio element playback successful');
      } catch (e) {
        console.warn('🔊 Audio element auto-play prevented:', e);
      }
      
      // Play for 0.5 seconds then stop
      setTimeout(() => {
        oscillator.stop();
        audioElement.pause();
        
        // Release microphone
        stream.getTracks().forEach(track => track.stop());
        
        toast({
          title: "Audio System Ready",
          description: "Your audio system is now initialized and ready for calls.",
        });
        
        // Mark as initialized
        setAudioInitialized(true);
        setShowInitModal(false);
        localStorage.setItem('audio-initialized', 'true');
      }, 500);
      
      return true;
    } catch (error) {
      console.error('🔊 Error initializing audio:', error);
      toast({
        title: "Audio Error",
        description: "Could not initialize audio system. Try again or check browser settings.",
        variant: "destructive",
      });
      return false;
    }
  };
  
  useEffect(() => {
    // Double check that we're not on landing page
    if (isLandingPage) {
      console.log("Skipping audio initialization on landing page");
      return;
    }
    
    // Check if already initialized on mount
    checkAudioInitialization();
    
    // Listen for user interaction on the document to initialize audio if needed
    const handleInteraction = () => {
      if (!audioInitialized && !isLandingPage) {
        initializeAudio();
      }
    };
    
    // Add click listener for passive initialization
    document.addEventListener('click', handleInteraction, { once: true });
    
    return () => {
      document.removeEventListener('click', handleInteraction);
    };
  }, [audioInitialized, isLandingPage]);
  
  // Only render the modal if not initialized, we need to show it, and we're not on the landing page
  if (!audioInitialized && showInitModal) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md text-center">
          <h3 className="text-xl font-semibold mb-4">Initialize Audio System</h3>
          <p className="mb-6">
            To enable audio for browser-based calls, we need your permission to access your microphone and audio system.
          </p>
          <Button 
            onClick={() => initializeAudio(true)}
            className="bg-green-500 hover:bg-green-600 text-white"
            size="lg"
          >
            Enable Audio
          </Button>
        </div>
      </div>
    );
  }
  
  return null; // Return null when audio is initialized or modal shouldn't show
}

export default AudioInitializer;
