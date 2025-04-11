
import React, { useState, useEffect, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface TwilioPhoneProps {
  className?: string;
}

export const TwilioPhone: React.FC<TwilioPhoneProps> = ({ className }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { getAuthToken } = useAuth();

  // Initialize Twilio device when component mounts
  useEffect(() => {
    let mounted = true;

    const initializeDevice = async () => {
      try {
        setIsLoading(true);
        setStatus('Initializing...');

        // Get token from our Supabase edge function
        const token = await getAuthToken();
        if (!token) {
          throw new Error('You must be logged in to use the phone');
        }

        const response = await supabase.functions.invoke('twilio-token', {
          body: {},
        });

        if (response.error || !response.data || !response.data.token) {
          throw new Error(response.error || 'Failed to get Twilio token');
        }

        // Create a new Twilio Device
        const twilioToken = response.data.token;
        const device = new Device(twilioToken, {
          logLevel: 'info',
          codecPreferences: ['opus', 'pcmu'],
          sounds: {
            incoming: '/sounds/incoming.mp3',
            outgoing: '/sounds/outgoing.mp3',
            disconnect: '/sounds/disconnect.mp3',
            dtmf1: '/sounds/dtmf-1.mp3',
            dtmf2: '/sounds/dtmf-2.mp3',
            dtmf3: '/sounds/dtmf-3.mp3',
            dtmf4: '/sounds/dtmf-4.mp3',
            dtmf5: '/sounds/dtmf-5.mp3',
            dtmf6: '/sounds/dtmf-6.mp3',
            dtmf7: '/sounds/dtmf-7.mp3',
            dtmf8: '/sounds/dtmf-8.mp3',
            dtmf9: '/sounds/dtmf-9.mp3',
            dtmf0: '/sounds/dtmf-0.mp3',
            dtmfs: '/sounds/dtmf-star.mp3',
            dtmfh: '/sounds/dtmf-pound.mp3',
          }
        });

        device.on('error', (error) => {
          console.error('Twilio device error:', error);
          setError(`Twilio error: ${error.message}`);
          setStatus('Error');
          toast.error(`Phone error: ${error.message}`);
        });

        device.on('incoming', (call) => {
          toast.info('Incoming call');
          callRef.current = call;
          
          call.on('accept', () => {
            setIsCallActive(true);
            setStatus('Call in progress');
            startCallTimer();
          });
          
          call.on('disconnect', () => {
            endCall();
          });
          
          call.on('cancel', () => {
            endCall();
          });
        });

        if (mounted) {
          deviceRef.current = device;
          setStatus('Ready');
          setIsLoading(false);
          setError(null);
          
          // Set up volume monitoring
          device.audio.incoming(true);
          device.audio.outgoing(true);
        }
      } catch (err: any) {
        console.error('Error initializing Twilio device:', err);
        if (mounted) {
          setError(`Failed to initialize phone: ${err.message}`);
          setStatus('Error');
          setIsLoading(false);
          toast.error(`Failed to initialize phone: ${err.message}`);
        }
      }
    };

    initializeDevice();

    return () => {
      mounted = false;
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [getAuthToken]);

  const startCallTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const makeCall = async () => {
    if (!deviceRef.current || !phoneNumber || isCallActive) return;
    
    try {
      setIsConnecting(true);
      setStatus('Connecting...');
      setError(null);
      
      // Start the call
      const call = await deviceRef.current.connect({
        params: {
          To: phoneNumber
        }
      });
      
      callRef.current = call;
      
      // Set up call event listeners
      call.on('accept', () => {
        setIsCallActive(true);
        setIsConnecting(false);
        setStatus('Call in progress');
        startCallTimer();
        toast.success(`Connected to ${phoneNumber}`);
      });
      
      call.on('disconnect', () => {
        endCall();
        toast.info('Call ended');
      });
      
      call.on('error', (callError) => {
        console.error('Call error:', callError);
        setError(`Call error: ${callError.message}`);
        endCall();
        toast.error(`Call error: ${callError.message}`);
      });
      
    } catch (err: any) {
      console.error('Error making call:', err);
      setError(`Failed to make call: ${err.message}`);
      setIsConnecting(false);
      setStatus('Error');
      toast.error(`Failed to make call: ${err.message}`);
    }
  };

  const endCall = () => {
    if (callRef.current) {
      try {
        callRef.current.disconnect();
      } catch (err) {
        console.error('Error disconnecting call:', err);
      }
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    callRef.current = null;
    setIsCallActive(false);
    setIsConnecting(false);
    setIsMuted(false);
    setStatus('Ready');
    setCallDuration(0);
  };

  const toggleMute = () => {
    if (callRef.current) {
      if (isMuted) {
        callRef.current.mute(false);
        setIsMuted(false);
      } else {
        callRef.current.mute(true);
        setIsMuted(true);
      }
    }
  };

  const sendDigits = (digits: string) => {
    if (callRef.current && isCallActive) {
      callRef.current.sendDigits(digits);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Handle numeric keys for dialing
    const key = e.key;
    if (/^[0-9*#]$/.test(key)) {
      sendDigits(key);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          <span>Twilio Phone</span>
        </CardTitle>
        <CardDescription>Make and receive calls directly from your browser</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">Status:</div>
          <div className="text-sm">
            {status} {isCallActive && callDuration > 0 && `(${formatCallDuration(callDuration)})`}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Input
            type="tel"
            placeholder="Enter phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={isLoading || isCallActive}
            className="flex-1"
            onKeyDown={handleKeyPress}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => {
                if (isCallActive) {
                  sendDigits(key);
                } else {
                  setPhoneNumber(prev => prev + key);
                }
              }}
              disabled={isLoading}
              className="h-10"
            >
              {key}
            </Button>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant={isCallActive ? "destructive" : "default"}
          onClick={isCallActive ? endCall : makeCall}
          disabled={isLoading || (phoneNumber.length < 5 && !isCallActive)}
          className="flex-1"
        >
          {isCallActive ? (
            <>
              <PhoneOff className="mr-2 h-4 w-4" />
              End Call
            </>
          ) : isConnecting ? (
            <span>Connecting...</span>
          ) : (
            <>
              <Phone className="mr-2 h-4 w-4" />
              Call
            </>
          )}
        </Button>
        
        {isCallActive && (
          <Button
            variant={isMuted ? "secondary" : "outline"} 
            onClick={toggleMute}
            className="ml-2"
          >
            {isMuted ? (
              <>
                <MicOff className="mr-2 h-4 w-4" />
                Unmute
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Mute
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
