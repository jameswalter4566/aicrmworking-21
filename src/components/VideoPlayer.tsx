import { useState, useRef, useEffect } from 'react';
import { Play, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  fallbackImageSrc?: string;
  aspectRatio?: string;
}

const VideoPlayer = ({ 
  src, 
  poster = "/placeholder.svg", 
  fallbackImageSrc,
  aspectRatio = "9/16" 
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Function to check if device is iOS
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  // Function to check if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  useEffect(() => {
    // Handle video playback differently for iOS/Safari
    if (videoRef.current) {
      // Set up oncanplay event to track when video data is available
      videoRef.current.oncanplay = () => {
        setVideoLoaded(true);
        console.log("🎥 Video can now play");
      };
      
      // Set up onplay event
      videoRef.current.onplay = () => {
        setVideoPlaying(true);
        console.log("🎥 Video is now playing");
      };
      
      // Set up onpause event
      videoRef.current.onpause = () => {
        setVideoPlaying(false);
        console.log("🎥 Video is now paused");
      };

      // Set up onerror event
      videoRef.current.onerror = () => {
        console.error("🎥 Video load error", videoRef.current?.error);
        setLoadError(true);
      };

      // Detect when video source fails to load
      const sourceElement = videoRef.current.querySelector('source');
      if (sourceElement) {
        sourceElement.onerror = () => {
          console.error("🎥 Video source failed to load");
          setLoadError(true);
        };
      }
      
      // Prevent autoplay with sound on mobile devices
      const mobileDevice = isIOS() || isMobile();
      if (mobileDevice) {
        videoRef.current.muted = true;
        console.log("🎥 Mobile device detected, using muted autoplay strategy");
      }
      
      // Don't attempt autoplay with sound on mobile - it will fail
      // Instead use muted autoplay with higher success rate
      if (!mobileDevice) {
        videoRef.current.play().catch(error => {
          console.log("🎥 Autoplay prevented:", error);
          // If autoplay with sound is prevented, try muted
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(e => {
              console.log("🎥 Muted autoplay also failed:", e);
            });
          }
        });
      } else {
        // For iOS devices, try muted autoplay immediately
        videoRef.current.muted = true;
        videoRef.current.playsInline = true; // This is crucial for iOS
        videoRef.current.play().catch(e => {
          console.log("🎥 Mobile muted autoplay failed:", e);
        });
      }
    }

    return () => {
      // Cleanup
      if (videoRef.current) {
        videoRef.current.oncanplay = null;
        videoRef.current.onplay = null;
        videoRef.current.onpause = null;
        videoRef.current.onerror = null;
      }
    };
  }, []);

  const handlePlayClick = () => {
    if (videoRef.current) {
      // On iOS/mobile, we might need to keep it muted for autoplay
      if (!isIOS() && !isMobile()) {
        videoRef.current.muted = false;
      }
      videoRef.current.play()
        .then(() => setVideoPlaying(true))
        .catch(error => {
          console.log("🎥 Play failed:", error);
          // If unmuted play fails, try muted
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play()
              .then(() => setVideoPlaying(true))
              .catch(e => console.log("🎥 Muted play also failed:", e));
          }
        });
    }
  };

  // If there's an error and we have a fallback image, show it
  if (loadError && fallbackImageSrc) {
    return (
      <div 
        className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 relative"
        style={{
          aspectRatio: aspectRatio,
          maxHeight: "65vh",
          width: "100%"
        }}
      >
        <img 
          src={fallbackImageSrc} 
          alt="Video preview" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center text-white p-4">
            <p className="font-medium mb-2">Video couldn't be loaded</p>
            <p className="text-sm opacity-80">Please try again later</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 relative"
      style={{
        aspectRatio: aspectRatio,
        maxHeight: "65vh",
        width: "100%"
      }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted={isIOS() || isMobile()}
        autoPlay={false}  // We handle this programmatically instead
        controls={videoLoaded && !loadError}
        playsInline // Critical for iOS
        preload="auto"
        poster={poster}
        onLoadedMetadata={() => console.log("🎥 Video metadata loaded")}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Play button overlay - Shows when video is loaded but not playing */}
      {videoLoaded && !videoPlaying && !loadError && (
        <div 
          className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/50 cursor-pointer"
          onClick={handlePlayClick}
        >
          <div className="relative group">
            <div className="relative z-10 w-20 h-20 bg-crm-blue rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(51,195,240,0.7)] group-hover:shadow-[0_0_25px_rgba(51,195,240,0.9)] transition-all duration-300">
              <Play size={40} className="text-white ml-2" fill="white" />
            </div>
          </div>
        </div>
      )}
      
      {/* Loading indicator - when video is loading but not ready */}
      {!videoLoaded && !loadError && (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-black/70">
          <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
          <p className="text-white text-sm">Loading video...</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
