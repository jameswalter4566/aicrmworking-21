// Audio assets to preload - keep list minimal to avoid decoding issues
const AUDIO_ASSETS = [
  // Only preload essential sounds
  '/sounds/test-tone.mp3',
];

// A simplified version that only preloads critical sounds
export const preloadAudioAssets = async (): Promise<void> => {
  console.log("🔊 Starting audio asset preloading...");

  // Create fewer concurrent promises and handle errors better
  const preloadPromises = AUDIO_ASSETS.map(url => {
    return new Promise<void>((resolve) => {
      const audio = new Audio();
      
      // Set a timeout to avoid blocking if audio loads too slowly
      const timeout = setTimeout(() => {
        console.warn(`Audio preload timed out: ${url}`);
        resolve(); // Resolve anyway to not block the rest
      }, 3000);
      
      audio.oncanplaythrough = () => {
        clearTimeout(timeout);
        resolve();
      };
      
      audio.onerror = () => {
        clearTimeout(timeout);
        console.warn(`Audio preload failed: ${url}`);
        resolve(); // Resolve anyway to not block the rest
      };
      
      audio.src = url;
      audio.load();
    });
  });

  try {
    await Promise.all(preloadPromises);
    console.log("🔊 Audio assets preloaded successfully");
  } catch (error) {
    console.error("🔊 Error during audio preloading:", error);
  }
};
