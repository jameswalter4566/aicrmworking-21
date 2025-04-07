
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Volume, Volume2 } from "lucide-react";
import { ActiveCall } from "@/hooks/use-twilio";
import AudioDeviceSelector from "./AudioDeviceSelector";
import { AudioDebugModal } from "./AudioDebugModal";
import { AudioInitializer } from "./AudioInitializer";
import AudioDeviceDropdown from "./AudioDeviceDropdown";

export interface CallControlsProps {
  phoneNumber?: string;
  leadId?: string | number;
  activeCall?: ActiveCall;
  onCall: (phoneNumber: string, leadId: string | number) => void;
  onHangup: (leadId: string | number) => void;
  onToggleMute?: (leadId: string | number, mute?: boolean) => void;
  onToggleSpeaker?: (leadId: string | number, speakerOn?: boolean) => void;
  disabled?: boolean;
  audioOutputDevices: MediaDeviceInfo[];
  currentAudioDevice: string;
  onChangeAudioDevice: (deviceId: string) => Promise<boolean>;
  onRefreshDevices: () => Promise<MediaDeviceInfo[]>;
  onTestAudio: (deviceId?: string) => Promise<boolean>;
  showAudioControls?: boolean;
}

export function CallControls({
  phoneNumber,
  leadId = "default",
  activeCall,
  onCall,
  onHangup,
  onToggleMute,
  onToggleSpeaker,
  disabled = false,
  audioOutputDevices,
  currentAudioDevice,
  onChangeAudioDevice,
  onRefreshDevices,
  onTestAudio,
  showAudioControls = true
}: CallControlsProps) {
  const [isCallButtonHovered, setIsCallButtonHovered] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const isInCall = !!activeCall;
  const isMuted = activeCall?.isMuted || false;
  const isSpeakerOn = activeCall?.speakerOn || false;
  const isDisabled = disabled || !phoneNumber;

  const handleCall = () => {
    if (!phoneNumber || isDisabled) return;
    onCall(phoneNumber, leadId);
  };

  const handleHangup = () => {
    onHangup(leadId);
  };

  const toggleMute = () => {
    if (onToggleMute) {
      onToggleMute(leadId);
    }
  };

  const toggleSpeaker = () => {
    if (onToggleSpeaker) {
      onToggleSpeaker(leadId);
    }
  };

  const toggleDeviceSelector = () => {
    setShowDeviceSelector(!showDeviceSelector);
  };

  return (
    <>
      {/* Always render the AudioInitializer component to ensure audio permissions */}
      <AudioInitializer />
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-2">
          {!isInCall ? (
            <Button
              variant="default"
              size="lg"
              className={`rounded-full w-12 h-12 p-0 bg-green-500 hover:bg-green-600 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleCall}
              disabled={isDisabled}
              onMouseEnter={() => setIsCallButtonHovered(true)}
              onMouseLeave={() => setIsCallButtonHovered(false)}
              title={`Call ${phoneNumber || ''}`}
            >
              <Phone size={20} className={isCallButtonHovered ? "animate-pulse" : ""} />
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-12 h-12 p-0"
              onClick={handleHangup}
              title="End call"
            >
              <PhoneOff size={20} />
            </Button>
          )}
          
          {isInCall && showAudioControls && (
            <>
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="icon"
                onClick={toggleMute}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>
              
              {/* Audio device dropdown instead of speaker toggle button */}
              <AudioDeviceDropdown
                devices={audioOutputDevices}
                currentDeviceId={currentAudioDevice}
                onDeviceChange={onChangeAudioDevice}
                onRefreshDevices={onRefreshDevices}
                disabled={disabled}
              />
              
              {/* Add audio debug modal if in active call */}
              <AudioDebugModal />
            </>
          )}
        </div>
        
        {showDeviceSelector && isInCall && showAudioControls && (
          <div className="mt-2 p-2 border rounded-md">
            <AudioDeviceSelector 
              devices={audioOutputDevices}
              currentDeviceId={currentAudioDevice}
              onDeviceChange={onChangeAudioDevice}
              onRefreshDevices={onRefreshDevices}
              onTestAudio={onTestAudio}
            />
          </div>
        )}

        {!showDeviceSelector && isInCall && (
          <div className="text-xs text-center text-muted-foreground">
            {activeCall.status === 'connecting' ? 'Connecting...' : 
             activeCall.status === 'in-progress' ? 'In call' :
             activeCall.status === 'completed' ? 'Call ended' :
             activeCall.status === 'failed' ? 'Call failed' :
             activeCall.status === 'busy' ? 'Line busy' : 
             activeCall.status === 'no-answer' ? 'No answer' : ''}
             
            {activeCall.audioActive && activeCall.audioStreaming && (
              <span className="ml-1 inline-flex items-center">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-1"></span>
                Audio streaming
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
