
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { audioProcessing } from '@/services/audioProcessing';

interface AudioDebugInfo {
  isWebSocketConnected: boolean;
  webSocketState: string;
  activeStreamSid: string | null;
  isProcessing: boolean;
  inboundAudioCount: number;
  outboundAudioCount: number;
  microphoneActive: boolean;
  audioContextState: string;
  reconnectAttempts: number;
  lastProcessedAudio: string;
  audioQueueLength: number;
  isPlaying: boolean;
}

export function AudioDebugModal() {
  const [debugInfo, setDebugInfo] = useState<AudioDebugInfo>({
    isWebSocketConnected: false,
    webSocketState: 'disconnected',
    activeStreamSid: null,
    isProcessing: false,
    inboundAudioCount: 0,
    outboundAudioCount: 0,
    microphoneActive: false,
    audioContextState: 'closed',
    reconnectAttempts: 0,
    lastProcessedAudio: 'never',
    audioQueueLength: 0,
    isPlaying: false
  });
  
  const [isOpen, setIsOpen] = useState(false);
  
  const updateDebugInfo = () => {
    const info = audioProcessing.getDiagnostics();
    setDebugInfo(info as AudioDebugInfo);
  };
  
  useEffect(() => {
    if (isOpen) {
      updateDebugInfo();
      const interval = setInterval(updateDebugInfo, 1000);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [isOpen]);
  
  const testAudio = async () => {
    await audioProcessing.testAudio();
  };
  
  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-500' : 'bg-red-500';
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          Audio Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Audio Debug Information</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="font-medium">WebSocket:</div>
            <div className="flex items-center">
              <div className={`h-2 w-2 rounded-full mr-2 ${getStatusColor(debugInfo.isWebSocketConnected)}`} />
              {debugInfo.webSocketState}
            </div>
            
            <div className="font-medium">Stream SID:</div>
            <div>{debugInfo.activeStreamSid || 'None'}</div>
            
            <div className="font-medium">Microphone:</div>
            <div className="flex items-center">
              <div className={`h-2 w-2 rounded-full mr-2 ${getStatusColor(debugInfo.microphoneActive)}`} />
              {debugInfo.microphoneActive ? 'Active' : 'Inactive'}
            </div>
            
            <div className="font-medium">Audio Processing:</div>
            <div className="flex items-center">
              <div className={`h-2 w-2 rounded-full mr-2 ${getStatusColor(debugInfo.isProcessing)}`} />
              {debugInfo.isProcessing ? 'Active' : 'Inactive'}
            </div>
            
            <div className="font-medium">Audio Context:</div>
            <div>{debugInfo.audioContextState}</div>
            
            <div className="font-medium">Last Audio:</div>
            <div>{debugInfo.lastProcessedAudio}</div>
            
            <div className="font-medium">Outbound Audio:</div>
            <div>{debugInfo.outboundAudioCount} packets</div>
            
            <div className="font-medium">Inbound Audio:</div>
            <div>{debugInfo.inboundAudioCount} packets</div>
            
            <div className="font-medium">Audio Queue:</div>
            <div>{debugInfo.audioQueueLength} chunks {debugInfo.isPlaying ? '(playing)' : ''}</div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={testAudio}>
              Test Audio
            </Button>
            <Button variant="outline" onClick={updateDebugInfo}>
              Refresh
            </Button>
            <Button variant="default" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AudioDebugModal;
