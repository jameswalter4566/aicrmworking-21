
/**
 * Audio asset preloader
 * Preloads audio files to prevent encoding errors during calls
 */

interface AudioAsset {
  key: string;
  url: string;
  required: boolean;
  loaded: boolean;
}

// Define all the audio assets we need to preload
const AUDIO_ASSETS: AudioAsset[] = [
  { key: 'incoming', url: '/sounds/incoming.mp3', required: true, loaded: false },
  { key: 'outgoing', url: '/sounds/outgoing.mp3', required: true, loaded: false },
  { key: 'disconnect', url: '/sounds/disconnect.mp3', required: true, loaded: false },
  { key: 'dialtone', url: '/sounds/outgoing.mp3', required: true, loaded: false }, // Reuse outgoing as dialtone
  { key: 'dtmf1', url: '/sounds/dtmf-1.mp3', required: false, loaded: false },
  { key: 'dtmf2', url: '/sounds/dtmf-2.mp3', required: false, loaded: false },
  { key: 'dtmf3', url: '/sounds/dtmf-3.mp3', required: false, loaded: false },
  { key: 'dtmf4', url: '/sounds/dtmf-4.mp3', required: false, loaded: false },
  { key: 'dtmf5', url: '/sounds/dtmf-5.mp3', required: false, loaded: false },
  { key: 'dtmf6', url: '/sounds/dtmf-6.mp3', required: false, loaded: false },
  { key: 'dtmf7', url: '/sounds/dtmf-7.mp3', required: false, loaded: false },
  { key: 'dtmf8', url: '/sounds/dtmf-8.mp3', required: false, loaded: false },
  { key: 'dtmf9', url: '/sounds/dtmf-9.mp3', required: false, loaded: false },
  { key: 'dtmf0', url: '/sounds/dtmf-0.mp3', required: false, loaded: false },
  { key: 'dtmfstar', url: '/sounds/dtmf-star.mp3', required: false, loaded: false },
  { key: 'dtmfpound', url: '/sounds/dtmf-pound.mp3', required: false, loaded: false },
  { key: 'test-tone', url: '/sounds/outgoing.mp3', required: true, loaded: false }, // Reuse outgoing as test tone
];

// Cache for loaded audio elements
const audioCache: Record<string, HTMLAudioElement> = {};

/**
 * Create a simple audio fallback for browsers that have issues loading audio files
 * This generates a short beep sound
 */
const createAudioFallback = (frequency = 440, duration = 1, volume = 0.2): HTMLAudioElement => {
  // Create a new AudioContext
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create an oscillator
  const oscillator = audioContext.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  
  // Create a gain node for volume control
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  
  // Connect oscillator to gain node and gain node to destination
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Create an audio element to mimic the interface of a normal audio element
  const audioElement = document.createElement('audio');
  
  // Override the play method
  const originalPlay = audioElement.play;
  audioElement.play = () => {
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
    return new Promise(resolve => {
      setTimeout(resolve, duration * 1000);
    });
  };
  
  return audioElement;
};

/**
 * Preload a single audio file
 */
const preloadAudio = (asset: AudioAsset): Promise<void> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'auto';
    
    // For required assets, we need to ensure they load or create a fallback
    if (asset.required) {
      const onSuccess = () => {
        asset.loaded = true;
        audioCache[asset.key] = audio;
        resolve();
      };
      
      const onError = (e: Event) => {
        console.warn(`Failed to load required audio asset: ${asset.key}`, e);
        
        // Create a fallback audio element
        console.info(`Creating fallback for required asset: ${asset.key}`);
        audioCache[asset.key] = createAudioFallback(
          asset.key === 'incoming' ? 880 : 440, // Higher pitch for incoming calls
          asset.key === 'disconnect' ? 0.5 : 1, // Shorter for disconnect
          0.2
        );
        
        asset.loaded = true;
        resolve();
      };
      
      audio.addEventListener('canplaythrough', onSuccess, { once: true });
      audio.addEventListener('error', onError, { once: true });
      
      // Set a timeout in case the audio takes too long to load
      setTimeout(() => {
        console.warn(`Audio asset loading timed out: ${asset.key}`);
        audio.removeEventListener('canplaythrough', onSuccess);
        audio.removeEventListener('error', onError);
        onError(new Event('timeout'));
      }, 5000);
    } else {
      // For non-required assets, just mark as loaded if there's an error
      const onSuccess = () => {
        asset.loaded = true;
        audioCache[asset.key] = audio;
        resolve();
      };
      
      const onError = (e: Event) => {
        console.warn(`Failed to load audio asset: ${asset.key}`, e);
        asset.loaded = true;
        resolve();
      };
      
      audio.addEventListener('canplaythrough', onSuccess, { once: true });
      audio.addEventListener('error', onError, { once: true });
      
      // Set a shorter timeout for non-required assets
      setTimeout(() => {
        console.warn(`Audio asset loading timed out: ${asset.key}`);
        audio.removeEventListener('canplaythrough', onSuccess);
        audio.removeEventListener('error', onError);
        onError(new Event('timeout'));
      }, 3000);
    }
    
    // Start loading the audio
    audio.src = asset.url;
    audio.load();
  });
};

/**
 * Preload all audio assets
 */
export const preloadAudioAssets = async (): Promise<void> => {
  // Preload all assets in parallel
  await Promise.all(AUDIO_ASSETS.map(preloadAudio));
  console.log('🔊 Audio assets preloaded successfully');
};

/**
 * Get a preloaded audio element
 */
export const getAudio = (key: string): HTMLAudioElement | null => {
  return audioCache[key] || null;
};

/**
 * Play a preloaded audio asset
 */
export const playAudio = async (key: string): Promise<void> => {
  const audio = audioCache[key];
  if (!audio) {
    console.warn(`Audio asset not found: ${key}`);
    return;
  }
  
  try {
    // Clone the audio to allow for multiple simultaneous playbacks
    const audioClone = audio.cloneNode() as HTMLAudioElement;
    await audioClone.play();
  } catch (error) {
    console.warn(`Failed to play audio: ${key}`, error);
  }
};
