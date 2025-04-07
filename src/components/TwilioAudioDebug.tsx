
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { VolumeX, Volume2, Volume1, Wifi, WifiOff, RefreshCcw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { twilioAudioHandler } from '@/services/TwilioAudioHandler';

interface TwilioAudioDebugProps {
  callActive?: boolean;
  deviceId?: string;
  onDeviceChange?: (deviceId: string) => void;
}

export function TwilioAudioDebug({ 
  callActive = false,
  deviceId,
  onDeviceChange
}: TwilioAudioDebugProps) {
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [audioInfo, setAudioInfo] = useState({
    codec: 'unknown',
    inputDevice: 'unknown',
    outputDevice: 'unknown',
    connectionQuality: 'unknown'
  });
  const [isOutputSupported, setIsOutputSupported] = useState(false);
  const [isVolumeSupported, setIsVolumeSupported] = useState(false);
  
  useEffect(() => {
    // Initialize when the component mounts
    const checkAudioCapabilities = () => {
      // Check support for output selection
      const outputSupported = 'setSinkId' in HTMLAudioElement.prototype;
      setIsOutputSupported(outputSupported);
      
      // Check for AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      setIsVolumeSupported(!!AudioContextClass);
      
      // If we have a window.Twilio object, check its features too
      if (window.Twilio?.Device?.audio) {
        setIsOutputSupported(!!window.Twilio.Device.audio.isOutputSelectionSupported);
        setIsVolumeSupported(!!window.Twilio.Device.audio.isVolumeSupported);
      }
    };
    
    checkAudioCapabilities();
    
    // Simulate some audio levels when in call
    let interval: number | null = null;
    
    if (callActive) {
      interval = window.setInterval(() => {
        // Simulate input volume (microphone)
        setInputLevel(prev => {
          const change = (Math.random() - 0.5) * 0.1;
          return Math.max(0.01, Math.min(0.9, prev + change));
        });
        
        // Simulate output volume (speaker)
        setOutputLevel(prev => {
          const change = (Math.random() - 0.5) * 0.2;
          return Math.max(0.01, Math.min(0.95, prev + change));
        });
        
        // Update audio codec and quality info
        if (window.Twilio?.Device) {
          const activeCalls = window.Twilio.Device.calls || [];
          if (activeCalls.length > 0) {
            const call = activeCalls[0];
            setAudioInfo(prev => ({
              ...prev,
              codec: call.codec || 'unknown',
              connectionQuality: call.isMuted ? 'muted' : 'good'
            }));
          }
        }
      }, 250);
    }
    
    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [callActive]);
  
  // Test the audio output
  const handleTestAudio = async () => {
    try {
      const success = await twilioAudioHandler.testAudioOutput();
      
      if (success) {
        toast({
          title: "Audio Test",
          description: "Audio test played successfully. You should have heard a tone.",
        });
      } else {
        toast({
          title: "Audio Test Failed",
          description: "Could not play test audio. Check your speaker settings.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Error testing audio:", err);
      toast({
        title: "Audio Test Error",
        description: "An error occurred while testing audio playback.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-2 p-2 rounded-lg border border-border bg-muted/20">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Audio Status</div>
        <div className="flex items-center gap-1">
          {callActive ? (
            <div className="flex items-center text-xs text-green-500 gap-1">
              <Wifi size={14} className="animate-pulse" />
              <span>Connected</span>
            </div>
          ) : (
            <div className="flex items-center text-xs text-muted-foreground gap-1">
              <WifiOff size={14} />
              <span>Not Connected</span>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={handleTestAudio}
            title="Test audio output"
          >
            <RefreshCcw size={14} />
          </Button>
        </div>
      </div>
      
      {callActive && (
        <>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1">
                <VolumeX size={14} />
                <span>Input</span>
              </div>
              <span>{Math.round(inputLevel * 100)}%</span>
            </div>
            <Progress value={inputLevel * 100} className="h-1" />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1">
                {outputLevel > 0.5 ? <Volume2 size={14} /> : <Volume1 size={14} />}
                <span>Output</span>
              </div>
              <span>{Math.round(outputLevel * 100)}%</span>
            </div>
            <Progress value={outputLevel * 100} className="h-1" />
          </div>
          
          <div className="text-xs space-y-1 pt-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Codec:</span>
              <span>{audioInfo.codec}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quality:</span>
              <span>{audioInfo.connectionQuality}</span>
            </div>
          </div>
        </>
      )}
      
      <div className="text-xs pt-1">
        <div className="flex flex-wrap gap-x-2 text-muted-foreground">
          <span>Output selection: {isOutputSupported ? 'supported' : 'not supported'}</span>
          <span>•</span>
          <span>Volume metering: {isVolumeSupported ? 'supported' : 'not supported'}</span>
        </div>
      </div>
    </div>
  );
}
