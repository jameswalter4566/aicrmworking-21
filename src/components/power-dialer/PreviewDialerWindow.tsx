import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

export interface PreviewDialerWindowProps {
  currentCall?: {
    callSid?: string;
    phoneNumber?: string;
    status?: string;
    leadId?: string | number;
  };
  onDisposition?: (type: string) => void;
  onEndCall?: () => void;
  onToggleMute?: () => void;
  onToggleSpeaker?: () => void;
  isMuted?: boolean;
  speakerOn?: boolean;
}

export function PreviewDialerWindow({
  currentCall,
  onDisposition,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  isMuted = false,
  speakerOn = true
}: PreviewDialerWindowProps) {
  const hasActiveCall = !!currentCall && currentCall.status !== 'completed' && currentCall.status !== 'failed';
  const isConnected = currentCall?.status === 'in-progress';
  
  const getStatusDisplay = () => {
    if (!currentCall) return 'No Call';
    switch(currentCall.status) {
      case 'connecting': return 'Connecting...';
      case 'in-progress': return 'Connected';
      case 'ringing': return 'Ringing...';
      case 'busy': return 'Line Busy';
      case 'no-answer': return 'No Answer';
      case 'failed': return 'Call Failed';
      case 'completed': return 'Call Ended';
      default: return currentCall.status || 'Unknown';
    }
  };
  
  const getStatusBadgeVariant = () => {
    if (!currentCall) return 'outline';
    switch(currentCall.status) {
      case 'in-progress': return 'default';
      case 'connecting':
      case 'ringing': return 'secondary';
      case 'busy':
      case 'no-answer':
      case 'failed': return 'destructive';
      case 'completed': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Preview Dialer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasActiveCall ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-base font-medium">{currentCall.phoneNumber || 'Unknown Number'}</p>
                <Badge variant={getStatusBadgeVariant()} className="mt-1">
                  {getStatusDisplay()}
                </Badge>
              </div>
              
              <div className="flex space-x-2">
                {isConnected && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onToggleMute}
                      className={isMuted ? "bg-red-500/10" : ""}
                    >
                      {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onToggleSpeaker}
                      className={speakerOn ? "" : "bg-gray-500/10"}
                    >
                      {speakerOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </Button>
                  </>
                )}
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onEndCall && onEndCall()}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  End Call
                </Button>
              </div>
            </div>
            
            {isConnected && onDisposition && (
              <>
                <Separator />
                
                <div>
                  <Label className="mb-2 block">Disposition</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDisposition('Contacted')}
                    >
                      Contacted
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDisposition('Interested')}
                    >
                      Interested
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDisposition('Not Interested')}
                    >
                      Not Interested
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDisposition('Call Back')}
                    >
                      Call Back
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDisposition('No Answer')}
                    >
                      No Answer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDisposition('Voicemail')}
                    >
                      Left Voicemail
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDisposition('Wrong Number')}
                    >
                      Wrong Number
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDisposition('DNC')}
                    >
                      Do Not Call
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-6">
            <p className="text-muted-foreground mb-4">
              No active call in progress
            </p>
            <Button 
              variant="outline" 
              className="w-full justify-center bg-green-900/50 hover:bg-green-900 text-white border-green-900"
              onClick={() => {
                // Trigger call end and progression
                onEndCall && onEndCall();
              }}
            >
              <Phone className="mr-2 h-4 w-4 text-green-400" />
              Call Next Lead
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PreviewDialerWindow;
