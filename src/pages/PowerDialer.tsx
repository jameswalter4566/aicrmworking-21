
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CallControl from '@/components/CallControl';
import MainLayout from "@/components/MainLayout";
import { toast } from "@/components/ui/use-toast";
import { twilioService } from '@/services/twilio';
import TwilioAudioPlayer from '@/components/TwilioAudioPlayer';
import { audioProcessing } from '@/services/audioProcessing';

export default function PowerDialer() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);
  const [activeStreamSid, setActiveStreamSid] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  
  // Initialize the audio context as soon as possible
  useEffect(() => {
    const initAudio = async () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const context = new AudioContext();
          
          // If the context is suspended (browser policy), resume it on user interaction
          if (context.state === 'suspended') {
            document.addEventListener('click', () => {
              context.resume().then(() => {
                console.log('AudioContext resumed successfully');
              });
            }, { once: true });
          }
          
          // Create a silent oscillator just to activate the audio system
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          gainNode.gain.value = 0; // silent
          oscillator.connect(gainNode);
          gainNode.connect(context.destination);
          oscillator.start(0);
          oscillator.stop(0.001); // Very short duration
          
          console.log("Audio context initialized:", context.state);
        }
      } catch (err) {
        console.error("Failed to initialize audio context:", err);
      }
    };
    
    initAudio();
    
    // Connect to the audio WebSocket at component mount
    audioProcessing.connect({
      onConnectionStatus: (connected) => {
        console.log(`Audio connection status: ${connected}`);
      },
      onStreamStarted: (streamSid, callSid) => {
        console.log(`Stream started: ${streamSid}, Call: ${callSid}`);
        setActiveStreamSid(streamSid);
      },
      onStreamEnded: () => {
        setActiveStreamSid(null);
      }
    });
    
    // Initialize Twilio service
    twilioService.initializeAudioContext()
      .then(success => {
        if (!success) {
          toast({
            title: "Audio System Error",
            description: "Could not initialize audio system. Please check your browser permissions.",
            variant: "destructive"
          });
        }
      })
      .catch(err => console.error("Audio initialization error:", err));
    
    return () => {
      // Clean up audio resources
      audioProcessing.cleanup();
    };
  }, []);
  
  // Reset call duration timer when call status changes
  useEffect(() => {
    let timer: number;
    
    if (isCallActive) {
      setCallDuration(0);
      timer = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCallActive]);
  
  // Handle call initiation
  const handleMakeCall = useCallback(async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number to call.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Make sure audio is ready
      await twilioService.initializeAudioContext();
      
      // Ensure we're connected to the WebSocket
      await audioProcessing.connect({
        onStreamStarted: (streamSid, callSid) => {
          console.log(`Stream started: ${streamSid}, Call: ${callSid}`);
          setActiveStreamSid(streamSid);
        }
      });
      
      const result = await twilioService.makeCall(phoneNumber.trim());
      
      if (result.success) {
        setIsCallActive(true);
        setActiveCallSid(result.callSid || null);
        
        toast({
          title: "Call Connected",
          description: `Connected to ${phoneNumber}`,
        });
        
        // Start microphone capture for bidirectional audio
        audioProcessing.startCapturingMicrophone()
          .then(success => {
            if (!success) {
              console.warn("Failed to start microphone capture");
            }
          });
          
      } else {
        toast({
          title: "Call Failed",
          description: result.error || "Unable to connect the call. Please try again.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Error making call:", err);
      toast({
        title: "Call Error",
        description: "An error occurred while trying to make the call.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber]);
  
  // Handle call end
  const handleEndCall = useCallback(async () => {
    try {
      await twilioService.endCall();
      await audioProcessing.cleanup();
      
      setIsCallActive(false);
      setActiveCallSid(null);
      setActiveStreamSid(null);
      
      toast({
        title: "Call Ended",
        description: `Call duration: ${formatDuration(callDuration)}`,
      });
    } catch (err) {
      console.error("Error ending call:", err);
    }
  }, [callDuration]);
  
  // Format call duration as mm:ss
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    setIsMuted(prev => !prev);
    twilioService.toggleMute(!isMuted);
  }, [isMuted]);
  
  // Handle speaker toggle
  const handleSpeakerToggle = useCallback(() => {
    setSpeakerOn(prev => !prev);
    twilioService.toggleSpeaker(!speakerOn);
  }, [speakerOn]);
  
  // Handle audio device change
  const handleAudioDeviceChange = useCallback((deviceId: string) => {
    twilioService.setAudioOutputDevice(deviceId)
      .then(success => {
        console.log(`Audio device ${deviceId} set: ${success}`);
      });
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto py-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Power Dialer</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Make a Call</CardTitle>
              <CardDescription>Enter a phone number to start calling</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="phone" 
                      placeholder="+1 (555) 123-4567" 
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      disabled={isCallActive}
                    />
                    {!isCallActive ? (
                      <Button 
                        onClick={handleMakeCall} 
                        disabled={isLoading || !phoneNumber.trim()}
                        className="min-w-[100px]"
                      >
                        {isLoading ? (
                          "Calling..."
                        ) : (
                          <>
                            <Phone className="mr-2 h-4 w-4" /> Call
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        variant="destructive" 
                        onClick={handleEndCall}
                        className="min-w-[100px]"
                      >
                        End Call
                      </Button>
                    )}
                  </div>
                </div>
                
                {isCallActive && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-center font-medium">
                      {activeCallSid ? (
                        <>Call in progress • {formatDuration(callDuration)}</>
                      ) : (
                        <>Connecting call...</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-center">
              {isCallActive && (
                <CallControl 
                  isMuted={isMuted} 
                  speakerOn={speakerOn}
                  onMuteToggle={handleMuteToggle}
                  onSpeakerToggle={handleSpeakerToggle}
                  onEndCall={handleEndCall}
                  audioStreaming={!!activeStreamSid}
                  onAudioDeviceChange={handleAudioDeviceChange}
                  streamSid={activeStreamSid}
                />
              )}
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Call Status</CardTitle>
              <CardDescription>Current call information</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className="font-medium">
                    {isCallActive ? (
                      <span className="text-green-500">Active</span>
                    ) : (
                      <span className="text-muted-foreground">Idle</span>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duration:</span>
                  <span className="font-medium">{formatDuration(callDuration)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Audio Streaming:</span>
                  <span className="font-medium">
                    {activeStreamSid ? (
                      <span className="text-green-500">Connected</span>
                    ) : (
                      <span className="text-muted-foreground">Inactive</span>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Microphone:</span>
                  <span className="font-medium">
                    {isMuted ? (
                      <span className="text-amber-500">Muted</span>
                    ) : (
                      <span>Active</span>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Hidden but active audio player */}
        {activeStreamSid && (
          <TwilioAudioPlayer 
            streamSid={activeStreamSid}
            isActive={isCallActive}
            deviceId={speakerOn ? undefined : 'default'}
          />
        )}
      </div>
    </MainLayout>
  );
}
