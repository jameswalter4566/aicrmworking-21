
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, VolumeX, Volume2 } from 'lucide-react';
import { LineDisplay } from './LineDisplay';
import { toast } from "@/components/ui/use-toast";

interface PreviewDialerWindowProps {
  currentCall: any;
  onDisposition: (type: string) => void;
  onEndCall: () => void;
}

const PreviewDialerWindow = ({ currentCall, onDisposition, onEndCall }: PreviewDialerWindowProps) => {
  const [activeLines, setActiveLines] = useState<Record<number, any>>({});
  const [isMuted, setIsMuted] = useState(false);

  // Debug log current call
  console.log('PreviewDialerWindow - Current Call:', currentCall);
  
  // When currentCall changes, update the active lines
  useEffect(() => {
    if (currentCall) {
      // Always assign the current call to line 1
      setActiveLines(prev => ({
        ...prev,
        1: {
          phoneNumber: currentCall.phoneNumber,
          leadName: currentCall.parameters?.leadName || 'Unknown',
          status: currentCall.status,
          startTime: currentCall.status === 'in-progress' ? new Date() : undefined,
          company: currentCall.parameters?.company || ''
        }
      }));
      
      // Log the updated active lines
      console.log('Updated active lines with current call', {
        phoneNumber: currentCall.phoneNumber,
        status: currentCall.status
      });
    } else {
      // If no current call and line 1 is active, clear it
      if (activeLines[1]) {
        setActiveLines(prev => {
          const newLines = { ...prev };
          delete newLines[1];
          return newLines;
        });
      }
    }
  }, [currentCall]);

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    // Add actual mute functionality call here
    toast({
      title: isMuted ? "Unmuted" : "Muted",
      description: isMuted ? "You can now be heard" : "You have been muted",
    });
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          Active Lines
          {currentCall && (
            <div className="flex gap-2">
              <Button
                variant="outline" 
                size="sm"
                onClick={handleToggleMute}
              >
                {isMuted ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              
              <Button
                variant="destructive" 
                size="sm"
                onClick={onEndCall}
              >
                <PhoneOff className="h-4 w-4 mr-1" />
                End Call
              </Button>
            </div>
          )}
        </CardTitle>
        <CardDescription>
          Monitor all active dialing lines
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Line Displays */}
        {[1, 2, 3].map(lineNumber => (
          <LineDisplay
            key={lineNumber}
            lineNumber={lineNumber}
            currentCall={activeLines[lineNumber] || null}
          />
        ))}
        
        {/* Call Disposition Buttons - Only show when a call is connected */}
        {currentCall && currentCall.status === 'in-progress' && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => onDisposition('interested')}>
              Interested
            </Button>
            <Button variant="outline" onClick={() => onDisposition('not-interested')}>
              Not Interested
            </Button>
            <Button variant="outline" onClick={() => onDisposition('callback')}>
              Call Back
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PreviewDialerWindow;
