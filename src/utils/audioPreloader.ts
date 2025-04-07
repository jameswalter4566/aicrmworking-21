
/**
 * Utility to preload audio files to ensure they play immediately when needed
 */

interface AudioAsset {
  name: string;
  url: string;
  required?: boolean;
}

// List of audio assets to preload
const audioAssets: AudioAsset[] = [
  { name: 'incoming', url: '/sounds/incoming.mp3', required: true },
  { name: 'outgoing', url: '/sounds/outgoing.mp3', required: true },
  { name: 'disconnect', url: '/sounds/disconnect.mp3', required: true },
  { name: 'dialtone', url: '/sounds/dialtone.mp3', required: true },
  { name: 'dtmf0', url: '/sounds/dtmf-0.mp3' },
  { name: 'dtmf1', url: '/sounds/dtmf-1.mp3' },
  { name: 'dtmf2', url: '/sounds/dtmf-2.mp3' },
  { name: 'dtmf3', url: '/sounds/dtmf-3.mp3' },
  { name: 'dtmf4', url: '/sounds/dtmf-4.mp3' },
  { name: 'dtmf5', url: '/sounds/dtmf-5.mp3' },
  { name: 'dtmf6', url: '/sounds/dtmf-6.mp3' },
  { name: 'dtmf7', url: '/sounds/dtmf-7.mp3' },
  { name: 'dtmf8', url: '/sounds/dtmf-8.mp3' },
  { name: 'dtmf9', url: '/sounds/dtmf-9.mp3' },
  { name: 'dtmfstar', url: '/sounds/dtmf-star.mp3' },
  { name: 'dtmfpound', url: '/sounds/dtmf-pound.mp3' },
  { name: 'test-tone', url: '/sounds/test-tone.mp3', required: true }
];

// Cache of preloaded audio elements
const audioCache: Record<string, HTMLAudioElement> = {};

// Fallback audio - generate programmatically if files are missing
function createFallbackAudioElement(frequency = 440, duration = 1, volume = 0.3): HTMLAudioElement {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioElement = new Audio();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const destination = audioContext.createMediaStreamDestination();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency; 
    gainNode.gain.value = volume;
    
    oscillator.connect(gainNode);
    gainNode.connect(destination);
    
    const mediaRecorder = new MediaRecorder(destination.stream);
    const audioChunks: BlobPart[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };
    
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      audioElement.src = audioUrl;
    };
    
    oscillator.start();
    mediaRecorder.start();
    
    setTimeout(() => {
      oscillator.stop();
      mediaRecorder.stop();
      audioContext.close();
    }, duration * 1000);
    
    return audioElement;
  } catch (err) {
    console.warn('Failed to create fallback audio:', err);
    const audio = new Audio();
    return audio;
  }
}

/**
 * Preloads all audio files needed for the application
 */
export const preloadAudioAssets = async (): Promise<void[]> => {
  console.log('Preloading audio assets...');
  
  // Create a default tone for fallbacks
  let defaultTone: HTMLAudioElement | null = null;
  try {
    defaultTone = createFallbackAudioElement(440, 0.5, 0.3);
    audioCache['_fallback_'] = defaultTone;
  } catch (err) {
    console.warn('Could not create fallback tone:', err);
  }
  
  const preloadPromises = audioAssets.map(asset => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Create audio element
        const audio = new Audio();
        
        // Set up event listeners
        audio.addEventListener('canplaythrough', () => {
          console.log(`Audio asset loaded: ${asset.name}`);
          audioCache[asset.name] = audio;
          resolve();
        }, { once: true });
        
        audio.addEventListener('error', (err) => {
          if (asset.required) {
            console.warn(`Failed to load required audio asset: ${asset.name}`, err);
            
            // Create a fallback for required assets
            try {
              console.log(`Creating fallback for required asset: ${asset.name}`);
              let fallbackAudio: HTMLAudioElement;
              
              if (asset.name === 'dialtone') {
                fallbackAudio = createFallbackAudioElement(440, 1, 0.2);
              } else if (asset.name === 'incoming') {
                fallbackAudio = createFallbackAudioElement(880, 0.3, 0.2);
              } else if (asset.name === 'outgoing') {
                fallbackAudio = createFallbackAudioElement(660, 0.5, 0.2);
              } else if (asset.name === 'disconnect') {
                fallbackAudio = createFallbackAudioElement(220, 0.5, 0.2);
              } else {
                fallbackAudio = defaultTone?.cloneNode(true) as HTMLAudioElement || new Audio();
              }
              
              audioCache[asset.name] = fallbackAudio;
            } catch (e) {
              console.error(`Error creating fallback for ${asset.name}:`, e);
            }
          } else {
            console.warn(`Failed to load audio asset: ${asset.name}`, err);
            
            // For non-required assets, use a default tone
            if (defaultTone) {
              try {
                // Use dialtone as fallback for dtmf tones
                if (asset.name.startsWith('dtmf') && defaultTone) {
                  audioCache[asset.name] = defaultTone.cloneNode(true) as HTMLAudioElement;
                }
              } catch (e) {
                console.error(`Error creating fallback for ${asset.name}:`, e);
              }
            }
          }
          
          // Resolve anyway to not block other assets
          resolve();
        }, { once: true });
        
        // Set audio properties
        audio.preload = 'auto';
        audio.volume = 0;  // Silent preloading
        
        // Attempt to load the asset
        audio.src = asset.url;
        audio.load();
        
        // Set a timeout in case loading hangs
        setTimeout(() => {
          if (!audioCache[asset.name]) {
            console.warn(`Audio asset loading timed out: ${asset.name}`);
            
            // For required assets, create a fallback
            if (asset.required && defaultTone) {
              audioCache[asset.name] = defaultTone.cloneNode(true) as HTMLAudioElement;
            }
            resolve();
          }
        }, 3000);
        
      } catch (error) {
        console.error(`Error preloading audio asset: ${asset.name}`, error);
        // Resolve anyway to not block other assets
        resolve();
      }
    });
  });
  
  await Promise.all(preloadPromises);
  console.log('🔊 Audio assets preloaded successfully');
  return preloadPromises;
};

/**
 * Gets a preloaded audio element by name
 * @param name The name of the audio asset
 * @returns The audio element if found, or null if not preloaded
 */
export const getPreloadedAudio = (name: string): HTMLAudioElement | null => {
  // Return the cached audio or fallback if available
  return audioCache[name] || audioCache['_fallback_'] || null;
};

/**
 * Plays a specific audio asset by name
 * @param name The name of the audio asset to play
 * @param volume Optional volume (0-1), defaults to 0.5
 * @returns Promise resolving when playback starts
 */
export const playAudio = async (name: string, volume: number = 0.5): Promise<boolean> => {
  try {
    const audio = audioCache[name];
    
    if (!audio) {
      console.warn(`Audio asset not preloaded: ${name}`);
      
      // Try fallback
      if (audioCache['_fallback_']) {
        const fallbackAudio = audioCache['_fallback_'].cloneNode(true) as HTMLAudioElement;
        fallbackAudio.volume = volume;
        
        try {
          await fallbackAudio.play();
          return true;
        } catch (error) {
          console.error(`Error playing fallback audio for: ${name}`, error);
          return false;
        }
      }
      
      return false;
    }
    
    // Clone the audio to allow multiple simultaneous playbacks
    const audioClone = audio.cloneNode() as HTMLAudioElement;
    audioClone.volume = volume;
    
    try {
      await audioClone.play();
      return true;
    } catch (error) {
      console.error(`Error playing audio: ${name}`, error);
      
      // Try fallback if available
      if (audioCache['_fallback_']) {
        try {
          const fallbackAudio = audioCache['_fallback_'].cloneNode(true) as HTMLAudioElement;
          fallbackAudio.volume = volume;
          await fallbackAudio.play();
          return true;
        } catch (err) {
          console.error(`Error playing fallback audio for: ${name}`, err);
          return false;
        }
      }
      
      return false;
    }
  } catch (error) {
    console.error(`Unexpected error playing audio: ${name}`, error);
    return false;
  }
};
