
/**
 * Utility to preload audio files to ensure they play immediately when needed
 */

interface AudioAsset {
  name: string;
  url: string;
}

// List of audio assets to preload
const audioAssets: AudioAsset[] = [
  { name: 'incoming', url: '/sounds/incoming.mp3' },
  { name: 'outgoing', url: '/sounds/outgoing.mp3' },
  { name: 'disconnect', url: '/sounds/disconnect.mp3' },
  { name: 'dialtone', url: '/sounds/dialtone.mp3' },
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
  { name: 'test-tone', url: '/sounds/test-tone.mp3' }
];

// Cache of preloaded audio elements
const audioCache: Record<string, HTMLAudioElement> = {};

/**
 * Preloads all audio files needed for the application
 */
export const preloadAudioAssets = (): Promise<void[]> => {
  console.log('Preloading audio assets...');
  
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
          console.warn(`Failed to load audio asset: ${asset.name}`, err);
          // Resolve anyway to not block other assets
          resolve();
        }, { once: true });
        
        // Set audio properties
        audio.preload = 'auto';
        audio.volume = 0;  // Silent preloading
        audio.src = asset.url;
        
        // Start loading
        audio.load();
      } catch (error) {
        console.error(`Error preloading audio asset: ${asset.name}`, error);
        // Resolve anyway to not block other assets
        resolve();
      }
    });
  });
  
  return Promise.all(preloadPromises);
};

/**
 * Gets a preloaded audio element by name
 * @param name The name of the audio asset
 * @returns The audio element if found, or null if not preloaded
 */
export const getPreloadedAudio = (name: string): HTMLAudioElement | null => {
  return audioCache[name] || null;
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
      return false;
    }
  } catch (error) {
    console.error(`Unexpected error playing audio: ${name}`, error);
    return false;
  }
};
