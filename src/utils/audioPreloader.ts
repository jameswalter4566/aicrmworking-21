
// Cache for preloaded audio files
const audioCache: Map<string, HTMLAudioElement> = new Map();

// List of audio files to preload
const audioFiles = [
  '/sounds/incoming.mp3',
  '/sounds/outgoing.mp3',
  '/sounds/disconnect.mp3',
  '/sounds/dtmf-0.mp3',
  '/sounds/dtmf-1.mp3',
  '/sounds/dtmf-2.mp3',
  '/sounds/dtmf-3.mp3',
  '/sounds/dtmf-4.mp3',
  '/sounds/dtmf-5.mp3',
  '/sounds/dtmf-6.mp3',
  '/sounds/dtmf-7.mp3',
  '/sounds/dtmf-8.mp3',
  '/sounds/dtmf-9.mp3',
  '/sounds/dtmf-star.mp3',
  '/sounds/dtmf-pound.mp3',
];

/**
 * Preload all audio assets
 * @returns Promise that resolves when all audio files are preloaded
 */
export const preloadAudioAssets = async (): Promise<boolean> => {
  const preloadPromises = audioFiles.map(url => preloadAudioFile(url));
  
  try {
    await Promise.all(preloadPromises);
    console.log('All audio files preloaded successfully');
    return true;
  } catch (err) {
    console.warn('Some audio files failed to preload:', err);
    return false;
  }
};

/**
 * Preload a single audio file
 * @param url URL of the audio file
 * @returns Promise that resolves when the audio file is preloaded
 */
export const preloadAudioFile = (url: string): Promise<HTMLAudioElement> => {
  return new Promise((resolve, reject) => {
    try {
      // Check if the audio is already in the cache
      if (audioCache.has(url)) {
        return resolve(audioCache.get(url) as HTMLAudioElement);
      }
      
      const audio = new Audio();
      audio.preload = 'auto';
      
      // Set up event handlers
      audio.addEventListener('canplaythrough', () => {
        audioCache.set(url, audio);
        resolve(audio);
      }, { once: true });
      
      audio.addEventListener('error', (e) => {
        console.warn(`Failed to preload audio file: ${url}`, e);
        reject(e);
      }, { once: true });
      
      // Set timeout in case loading takes too long
      const timeout = setTimeout(() => {
        audio.removeEventListener('canplaythrough', () => {});
        audio.removeEventListener('error', () => {});
        console.warn(`Audio preload timed out: ${url}`);
        
        // Create a fallback audio element with an empty source
        const fallbackAudio = new Audio();
        audioCache.set(url, fallbackAudio);
        resolve(fallbackAudio);
      }, 5000);
      
      // Set the source and start loading
      audio.src = url;
      audio.load();
      
    } catch (err) {
      console.error(`Error preloading audio: ${url}`, err);
      reject(err);
    }
  });
};

/**
 * Get a preloaded audio file from cache
 * @param url URL of the audio file
 * @returns The preloaded audio element, or a new audio element if not preloaded
 */
export const getPreloadedAudio = (url: string): HTMLAudioElement => {
  // Check if the audio is in the cache
  if (audioCache.has(url)) {
    // Clone the audio element to allow multiple plays
    const cached = audioCache.get(url) as HTMLAudioElement;
    const cloned = cached.cloneNode(true) as HTMLAudioElement;
    return cloned;
  }
  
  // If not in cache, create a new audio element and start preloading for next time
  console.warn(`Audio file not preloaded: ${url}, loading now`);
  const audio = new Audio(url);
  audio.load();
  
  // Preload for next time
  preloadAudioFile(url).catch(() => {
    // Silent catch - we already logged in the preload function
  });
  
  return audio;
};

/**
 * Play an audio file from the preloaded cache
 * @param url URL of the audio file
 * @param volume Optional volume level (0-1)
 * @returns Promise that resolves when the audio starts playing, or rejects on error
 */
export const playAudio = async (url: string, volume = 0.5): Promise<void> => {
  try {
    const audio = getPreloadedAudio(url);
    audio.volume = volume;
    
    try {
      await audio.play();
    } catch (err) {
      console.warn(`Failed to play audio: ${url}`, err);
      
      // If autoplay was prevented, try again with user interaction
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        console.warn('Autoplay prevented. Will try again on next user interaction.');
      }
    }
  } catch (err) {
    console.error(`Error playing audio: ${url}`, err);
  }
};
