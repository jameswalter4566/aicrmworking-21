
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Volume, Volume2, RefreshCw } from "lucide-react";
import { ActiveCall } from "@/hooks/use-twilio";
import AudioDeviceSelector from "./AudioDeviceSelector";
import { AudioDebugModal } from "./AudioDebugModal";
import { AudioInitializer } from "./AudioInitializer";
import AudioDeviceDropdown from "./AudioDeviceDropdown";
import { toast } from "@/components/ui/use-toast";

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
  const [isResettingCall, setIsResettingCall] = useState(false);
  
  const isInCall = !!activeCall;
  const isMuted = activeCall?.isMuted || false;
  const isSpeakerOn = activeCall?.speakerOn || false;
  const isDisabled = disabled || !phoneNumber;
  const isCallFailing = activeCall?.status === 'failed' || activeCall?.status === 'busy';

  const handleCall = async () => {
    if (!phoneNumber || isDisabled) return;
    
    try {
      // Ensure we're passing both the phone number and leadId
      console.log(`Initiating call to ${phoneNumber} with leadId ${leadId}`);
      onCall(phoneNumber, leadId);
    } catch (error) {
      console.error("Error initiating call:", error);
      toast({
        title: "Call Failed",
        description: "Unable to initiate call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleHangup = async () => {
    try {
      await onHangup(leadId);
    } catch (error) {
      console.error("Error hanging up call:", error);
      toast({
        title: "Hangup Error",
        description: "Failed to properly terminate call. Please try resetting.",
        variant: "destructive",
      });
    }
  };

  const handleResetCall = async () => {
    setIsResettingCall(true);
    try {
      // Force hangup any existing call
      await onHangup(leadId);
      
      // Wait a moment for systems to clear
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Call Reset",
        description: "Call state has been reset. You can try calling again.",
      });
    } catch (error) {
      console.error("Error resetting call:", error);
    } finally {
      setIsResettingCall(false);
    }
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

  // Force call cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (isInCall) {
        console.log("CallControls unmounting - cleaning up active call");
        onHangup(leadId);
      }
    };
  }, [isInCall, leadId, onHangup]);

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
              disabled={isDisabled || isResettingCall}
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
              disabled={isResettingCall}
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
                disabled={isResettingCall}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>
              
              {/* Audio device dropdown instead of speaker toggle button */}
              <AudioDeviceDropdown
                devices={audioOutputDevices}
                currentDeviceId={currentAudioDevice}
                onDeviceChange={onChangeAudioDevice}
                onRefreshDevices={onRefreshDevices}
                disabled={disabled || isResettingCall}
              />
              
              {/* Add reset call button */}
              {(activeCall?.status === 'failed' || activeCall?.status === 'busy') && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleResetCall}
                  title="Reset call state"
                  disabled={isResettingCall}
                  className={isResettingCall ? "animate-spin" : ""}
                >
                  <RefreshCw size={18} />
                </Button>
              )}
              
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
             activeCall.status === 'failed' ? (
               <span className="text-destructive font-medium">Call failed - click reset</span>
             ) :
             activeCall.status === 'busy' ? (
               <span className="text-destructive font-medium">Line busy - click reset</span> 
             ) :
             activeCall.status === 'no-answer' ? 'No answer' : ''}
             
            {activeCall.audioActive && activeCall.audioStreaming && (
              <span className="ml-1 inline-flex items-center">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-1"></span>
                Audio streaming
              </span>
            )}
            
            {!activeCall.audioActive && activeCall.status === 'in-progress' && (
              <span className="ml-1 inline-flex items-center">
                <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse mr-1"></span>
                Audio inactive
              </span>
            )}
            
            {activeCall.conferenceName && (
              <div className="mt-1 text-xs text-green-500">
                <span>Conference: {activeCall.conferenceName.substring(0, 10)}...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
