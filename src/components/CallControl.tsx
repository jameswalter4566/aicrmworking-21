
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MicOff, Mic, PhoneOff, Volume2, Volume1, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallControlProps {
  isMuted: boolean;
  speakerOn: boolean;
  onMuteToggle: () => void;
  onSpeakerToggle: () => void;
  onEndCall: () => void;
  audioStreaming?: boolean;
  className?: string;
}

const CallControl: React.FC<CallControlProps> = ({
  isMuted,
  speakerOn,
  onMuteToggle,
  onSpeakerToggle,
  onEndCall,
  audioStreaming = false,
  className
}) => {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  
  // Simulate audio level visualization
  useEffect(() => {
    if (!audioStreaming) return;
    
    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 0.7 + 0.1); // Random value between 0.1 and 0.8
    }, 200);
    
    return () => clearInterval(interval);
  }, [audioStreaming]);
  
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className="flex items-center justify-center gap-4">
        <Button
          variant={isMuted ? 'default' : 'secondary'}
          size="icon"
          onClick={onMuteToggle}
          title={isMuted ? 'Unmute' : 'Mute'}
          className="h-12 w-12 rounded-full"
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          variant="destructive"
          size="icon"
          onClick={onEndCall}
          title="End Call"
          className="rounded-full h-16 w-16 flex items-center justify-center"
        >
          <PhoneOff className="h-7 w-7" />
        </Button>

        <Button
          variant={speakerOn ? 'default' : 'secondary'}
          size="icon"
          onClick={onSpeakerToggle}
          title={speakerOn ? 'Speaker Off' : 'Speaker On'}
          className="h-12 w-12 rounded-full"
        >
          {speakerOn ? <Volume2 className="h-5 w-5" /> : <Volume1 className="h-5 w-5" />}
        </Button>
      </div>
      
      {audioStreaming ? (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-green-500">
            <Wifi className="h-3.5 w-3.5 text-green-500 animate-pulse" />
            <span>Audio streaming active</span>
          </div>
          
          {/* Audio level visualization */}
          <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-200 ease-in-out"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <WifiOff className="h-3.5 w-3.5 text-gray-400" />
          <span>Connecting to audio stream...</span>
        </div>
      )}
    </div>
  );
};

export default CallControl;
