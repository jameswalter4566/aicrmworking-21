
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MicOff, Mic, PhoneOff, Volume2, Volume1, Wifi, WifiOff, Headphones, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { getWebSocketStatus } from '@/utils/webSocketManager';

interface CallControlProps {
  isMuted: boolean;
  speakerOn: boolean;
  onMuteToggle: () => void;
  onSpeakerToggle: () => void;
  onEndCall: () => void;
  audioStreaming?: boolean;
  className?: string;
  onAudioDeviceChange?: (deviceId: string) => void;
}

const CallControl: React.FC<CallControlProps> = ({
  isMuted,
  speakerOn,
  onMuteToggle,
  onSpeakerToggle,
  onEndCall,
  audioStreaming = false,
  className,
  onAudioDeviceChange
}) => {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  const loadAudioDevices = async () => {
    try {
      setIsRefreshing(true);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn("This browser doesn't support device enumeration");
        toast({
          title: "Audio Device Error",
          description: "This browser doesn't support audio device selection.",
          variant: "destructive"
        });
        return;
      }
      
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .catch(err => {
          console.warn("Could not get microphone access:", err);
        });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      if (audioOutputs.length === 0) {
        toast({
          title: "No Audio Devices",
          description: "No audio output devices detected. Please check your system settings.",
          variant: "destructive"
        });
      }
      
      setAudioDevices(audioOutputs);
      
      if (audioOutputs.length > 0 && !selectedDeviceId) {
        const defaultDevice = audioOutputs.find(d => d.deviceId === 'default') || audioOutputs[0];
        setSelectedDeviceId(defaultDevice.deviceId);
        if (onAudioDeviceChange) onAudioDeviceChange(defaultDevice.deviceId);
      }
      
      console.log("Available audio output devices:", audioOutputs.map(d => ({ 
        label: d.label || 'Unknown Device', 
        deviceId: d.deviceId
      })));
      
    } catch (err) {
      console.error("Error loading audio devices:", err);
      toast({
        title: "Error",
        description: "Failed to load audio devices. Please check browser permissions.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    loadAudioDevices();
    
    navigator.mediaDevices?.addEventListener('devicechange', loadAudioDevices);
    
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', loadAudioDevices);
    };
  }, [onAudioDeviceChange]);
  
  const handleDeviceChange = (deviceId: string) => {
    console.log(`Selecting audio device: ${deviceId}`);
    setSelectedDeviceId(deviceId);
    
    if (onAudioDeviceChange) {
      onAudioDeviceChange(deviceId);
      
      const audio = new Audio('/sounds/dialtone.mp3');
      if ('setSinkId' in audio && typeof (audio as any).setSinkId === 'function') {
        (audio as any).setSinkId(deviceId)
          .then(() => {
            audio.volume = 0.3;
            audio.play()
              .then(() => {
                setTimeout(() => audio.pause(), 500);
              })
              .catch(err => console.warn("Could not play test tone:", err));
          })
          .catch((err: Error) => console.warn("Could not set audio device:", err));
      }
    }
  };
  
  useEffect(() => {
    if (!audioStreaming) return;
    
    const interval = setInterval(() => {
      setAudioLevel(prev => {
        const change = (Math.random() - 0.5) * 0.3;
        const newLevel = Math.max(0.05, Math.min(0.95, prev + change));
        return newLevel;
      });
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
      
      <div className="flex flex-col items-center gap-2 mt-2 w-full max-w-xs">
        <div className="flex items-center justify-between w-full">
          <label className="text-sm text-muted-foreground flex items-center gap-1">
            <Headphones className="h-3.5 w-3.5" />
            <span>Audio output device</span>
          </label>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={loadAudioDevices}
            disabled={isRefreshing}
            title="Refresh audio devices"
          >
            <RefreshCcw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </Button>
        </div>
        
        <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select audio device" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {audioDevices.length === 0 ? (
              <SelectItem value="no-devices" disabled>No audio devices found</SelectItem>
            ) : (
              audioDevices.map(device => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Audio device (${device.deviceId.slice(0, 5)}...)`}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      
      {audioStreaming ? (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <div className="flex items-center gap-2 text-sm text-green-500">
            <Wifi className="h-3.5 w-3.5 text-green-500 animate-pulse" />
            <span>Audio streaming active</span>
          </div>
          
          <div className="w-full h-2">
            <Progress 
              value={audioLevel * 100} 
              className="h-2 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-emerald-600"
            />
          </div>
          
          <div className="text-xs text-muted-foreground mt-1">
            Bidirectional audio stream connected
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5" />
            <span>Waiting for audio stream...</span>
          </div>
          
          <div className="w-full h-2">
            <Progress 
              value={0} 
              className="h-2"
            />
          </div>
          
          <div className="text-xs text-muted-foreground mt-1">
            Call must be connected to enable audio streaming
          </div>
        </div>
      )}
    </div>
  );
};

export default CallControl;
