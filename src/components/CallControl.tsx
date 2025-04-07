
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
import { audioProcessing } from '@/services/audioProcessing';
import { twilioAudioHandler } from '@/services/TwilioAudioHandler';
import { TwilioAudioDebug } from './TwilioAudioDebug';

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
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showDebugView, setShowDebugView] = useState<boolean>(false);
  
  // Initialize audio devices and connection
  useEffect(() => {
    loadAudioDevices();
    
    // Connect to the audio processing service with correct callbacks
    audioProcessing.connect({
      onConnectionStatus: (connected) => {
        setIsConnected(connected);
        if (connected) {
          toast({
            title: "Audio Connection Established",
            description: "Audio streaming connection is ready.",
          });
        }
      },
      onStreamStarted: (streamSid, callSid) => {
        console.log(`Audio stream started: ${streamSid}, CallSid: ${callSid}`);
        setIsConnected(true);
        toast({
          title: "Audio Stream Started",
          description: "Bidirectional audio stream is now active.",
        });
      },
      onStreamEnded: (streamSid) => {
        console.log(`Audio stream ended: ${streamSid}`);
        setIsConnected(false);
      }
    });
    
    // Set up audio level monitoring
    const interval = setInterval(() => {
      if (audioStreaming) {
        setAudioLevel(prev => {
          // If we're actively streaming, simulate realistic audio levels
          const change = (Math.random() - 0.5) * 0.3;
          const newLevel = Math.max(0.05, Math.min(0.95, prev + change));
          return newLevel;
        });
      } else {
        setAudioLevel(0);
      }
    }, 200);
    
    // Handle device change events from TwilioAudioHandler
    twilioAudioHandler.onDeviceChange(() => {
      console.log("Device change detected, refreshing audio devices");
      loadAudioDevices();
    });
    
    return () => {
      clearInterval(interval);
    };
  }, [audioStreaming]);
  
  const loadAudioDevices = async () => {
    try {
      setIsRefreshing(true);
      
      // First try to get devices from TwilioAudioHandler
      let devices = twilioAudioHandler.getOutputDevices();
      
      // If that fails, fall back to browser API
      if (!devices || devices.length === 0) {
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
        
        const browserDevices = await navigator.mediaDevices.enumerateDevices();
        devices = browserDevices.filter(device => device.kind === 'audiooutput');
      }
      
      if (devices.length === 0) {
        toast({
          title: "No Audio Devices",
          description: "No audio output devices detected. Please check your system settings.",
          variant: "destructive"
        });
      }
      
      setAudioDevices(devices);
      
      if (devices.length > 0 && !selectedDeviceId) {
        const defaultDevice = devices.find(d => d.deviceId === 'default') || devices[0];
        setSelectedDeviceId(defaultDevice.deviceId);
        if (onAudioDeviceChange) onAudioDeviceChange(defaultDevice.deviceId);
      }
      
      console.log("Available audio output devices:", devices.map(d => ({ 
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
  
  const handleDeviceChange = (deviceId: string) => {
    console.log(`Selecting audio device: ${deviceId}`);
    setSelectedDeviceId(deviceId);
    
    if (onAudioDeviceChange) {
      onAudioDeviceChange(deviceId);
      
      // First try with TwilioAudioHandler
      twilioAudioHandler.setOutputDevice(deviceId)
        .then(success => {
          if (success) {
            return twilioAudioHandler.testAudioOutput();
          }
          return false;
        })
        .then(success => {
          if (success) {
            toast({
              title: "Audio Device Selected",
              description: "Test tone played through the selected device.",
            });
          } else {
            // Fall back to audioProcessing for testing audio
            return audioProcessing.testAudio(deviceId);
          }
        })
        .catch(err => {
          console.error("Error setting audio device:", err);
        });
    }
  };

  const toggleDebugView = () => {
    setShowDebugView(!showDebugView);
  };
  
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
          <div className="flex gap-1">
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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={toggleDebugView}
              title={showDebugView ? "Hide audio debug info" : "Show audio debug info"}
            >
              {showDebugView ? "−" : "+"}
            </Button>
          </div>
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
      
      {showDebugView && (
        <div className="w-full max-w-xs">
          <TwilioAudioDebug 
            callActive={audioStreaming}
            deviceId={selectedDeviceId}
            onDeviceChange={handleDeviceChange}
          />
        </div>
      )}
      
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
