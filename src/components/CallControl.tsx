
import React from 'react';
import { Button } from '@/components/ui/button';
import { MicOff, Mic, PhoneOff, Volume2, Volume1 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallControlProps {
  isMuted: boolean;
  speakerOn: boolean;
  onMuteToggle: () => void;
  onSpeakerToggle: () => void;
  onEndCall: () => void;
  className?: string;
}

const CallControl: React.FC<CallControlProps> = ({
  isMuted,
  speakerOn,
  onMuteToggle,
  onSpeakerToggle,
  onEndCall,
  className
}) => {
  return (
    <div className={cn('flex items-center justify-center gap-4', className)}>
      <Button
        variant={isMuted ? 'default' : 'secondary'}
        size="icon"
        onClick={onMuteToggle}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>

      <Button
        variant="destructive"
        size="icon"
        onClick={onEndCall}
        title="End Call"
        className="rounded-full h-14 w-14 flex items-center justify-center"
      >
        <PhoneOff className="h-6 w-6" />
      </Button>

      <Button
        variant={speakerOn ? 'default' : 'secondary'}
        size="icon"
        onClick={onSpeakerToggle}
        title={speakerOn ? 'Speaker Off' : 'Speaker On'}
      >
        {speakerOn ? <Volume2 className="h-4 w-4" /> : <Volume1 className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default CallControl;
