
/**
 * Utility functions for handling Twilio calls and audio
 */

// Access the device audio output for a specific call
export const setCallAudioOutput = async (call: any, deviceId: string): Promise<boolean> => {
  if (!call || !deviceId) return false;
  
  try {
    console.log(`Setting call audio output to device: ${deviceId}`);
    
    // Try to find Twilio's audio element
    // First check for Twilio Client SDK 2.0 style
    if (call._audioContext && call._remoteStream) {
      const audioElement = document.getElementById(`audio-${call._remoteStreamId}`);
      if (audioElement && 'setSinkId' in audioElement) {
        await (audioElement as any).setSinkId(deviceId);
        console.log('Set audio output device for Twilio SDK 2.0 style');
        return true;
      }
    }
    
    // Next try Twilio Client SDK 1.0 style
    if (call._mediaHandler && call._mediaHandler._remoteStream) {
      const audioEl = call._mediaHandler._remoteStream.audio;
      if (audioEl && audioEl._element && 'setSinkId' in audioEl._element) {
        await (audioEl._element as any).setSinkId(deviceId);
        console.log('Set audio output device for Twilio SDK 1.0 style');
        return true;
      }
    }
    
    // Also set all audio elements on the page as a fallback
    let setCount = 0;
    const audioElements = document.querySelectorAll('audio');
    for (let i = 0; i < audioElements.length; i++) {
      const elem = audioElements[i] as HTMLAudioElement;
      if ('setSinkId' in elem) {
        try {
          await (elem as any).setSinkId(deviceId);
          setCount++;
        } catch (e) {
          // Ignore errors for elements we can't control
        }
      }
    }
    if (setCount > 0) {
      console.log(`Set audio output device for ${setCount} audio elements as fallback`);
      return true;
    }
    
    console.warn('Could not find call audio element to set output device');
    return false;
  } catch (err) {
    console.error('Error setting call audio output:', err);
    return false;
  }
};

// Force unmute any call audio elements (works around some Twilio bugs)
export const forceUnmuteCallAudio = async (): Promise<boolean> => {
  try {
    // Try to set all audio elements to unmuted
    let unmutedCount = 0;
    const audioElements = document.querySelectorAll('audio');
    
    for (const elem of audioElements) {
      if (elem.muted) {
        elem.muted = false;
        unmutedCount++;
      }
      
      // Also make sure volume isn't 0
      if (elem.volume === 0) {
        elem.volume = 0.7;
        unmutedCount++;
      }
      
      // Try to play if paused
      if (elem.paused) {
        try {
          await elem.play();
          unmutedCount++;
        } catch (e) {
          // Ignore play() errors
        }
      }
    }
    
    console.log(`Forced unmute on ${unmutedCount} audio elements`);
    return unmutedCount > 0;
  } catch (err) {
    console.error('Error forcing audio unmute:', err);
    return false;
  }
};

// Get a reference to the active call audio element
export const getCallAudioElement = (call: any): HTMLAudioElement | null => {
  if (!call) return null;
  
  try {
    // Try Twilio Client SDK 2.0 style
    if (call._audioContext && call._remoteStreamId) {
      const audioElem = document.getElementById(`audio-${call._remoteStreamId}`) as HTMLAudioElement;
      if (audioElem) return audioElem;
    }
    
    // Try Twilio Client SDK 1.0 style
    if (call._mediaHandler && call._mediaHandler._remoteStream && call._mediaHandler._remoteStream.audio) {
      return call._mediaHandler._remoteStream.audio._element;
    }
    
    return null;
  } catch (err) {
    console.error('Error getting call audio element:', err);
    return null;
  }
};

// Create placeholder DTMF sound files
export const createPlaceholderDtmfSounds = (): void => {
  // For browsers without Web Audio API
  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    console.warn('Web Audio API not supported in this browser');
    return;
  }
  
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext();
    
    // DTMF frequencies for each key
    const dtmfFrequencies: Record<string, [number, number]> = {
      '1': [697, 1209],
      '2': [697, 1336],
      '3': [697, 1477],
      '4': [770, 1209],
      '5': [770, 1336],
      '6': [770, 1477],
      '7': [852, 1209],
      '8': [852, 1336],
      '9': [852, 1477],
      '0': [941, 1336],
      '*': [941, 1209],
      '#': [941, 1477]
    };
    
    // Create a DTMF tone
    const createTone = (key: string, duration: number = 0.5): AudioBuffer => {
      const [freq1, freq2] = dtmfFrequencies[key];
      const sampleRate = audioContext.sampleRate;
      const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        // Equal mix of both frequencies with a slight fade in/out
        const fadeIn = Math.min(1, i / (0.01 * sampleRate));
        const fadeOut = Math.min(1, (data.length - i) / (0.01 * sampleRate));
        const fade = fadeIn * fadeOut;
        data[i] = 0.5 * fade * (
          Math.sin(2 * Math.PI * freq1 * t) + 
          Math.sin(2 * Math.PI * freq2 * t)
        );
      }
      
      return buffer;
    };

    // Play the tone when needed
    const playDtmfTone = (key: string) => {
      const buffer = createTone(key);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.5; // 50% volume
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start();
      
      console.log(`Generated DTMF tone for key ${key}`);
      
      return new Promise<void>(resolve => {
        source.onended = () => resolve();
      });
    };
    
    // Add to window for easy access
    (window as any).playDtmfTone = playDtmfTone;
    console.log('DTMF tone generator initialized');
    
  } catch (err) {
    console.error('Error creating DTMF tone generator:', err);
  }
};
