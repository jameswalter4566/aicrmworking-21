import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';

interface PreviewDialerWindowProps {
  currentCall?: any;
  onEndCall?: () => void;
  onDisposition?: (type: string) => void;
}

export default function PreviewDialerWindow({ 
  currentCall, 
  onEndCall,
  onDisposition 
}: PreviewDialerWindowProps) {
  const [isCallingNext, setIsCallingNext] = useState(false);

  const handleCallNextLead = async () => {
    try {
      // First end current call if it exists
      if (currentCall && onEndCall) {
        await onEndCall();
        
        toast("Previous call ended", {
          description: "Preparing to call next lead..."
        });
        
        // Brief delay to ensure call cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setIsCallingNext(true);
      
    } catch (error) {
      console.error('Error in handleCallNextLead:', error);
      toast.error("Failed to initiate next call");
      setIsCallingNext(false);
    }
  };

  
  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Preview Dialer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Button
              onClick={handleCallNextLead}
              disabled={isCallingNext}
              size="sm" 
              variant="default"
              className="w-40 h-10 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600"
            >
              <Phone className="w-4 h-4" />
              {isCallingNext ? 'Calling...' : 'Call Next Lead'}
            </Button>
          </div>

          {currentCall ? (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {currentCall?.phoneNumber || "Current Call"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentCall?.phoneNumber}
                </p>
                <Badge className="mt-2" variant={currentCall?.status === 'in-progress' ? "default" : "outline"}>
                  {currentCall?.status === 'connecting' ? 'Ringing' : 
                   currentCall?.status === 'in-progress' ? 'Connected' :
                   currentCall?.status === 'completed' ? 'Ended' : 
                   currentCall?.status}
                </Badge>
              </div>
              
              <Button 
                variant="destructive"
                onClick={onEndCall}
                disabled={!currentCall || currentCall.status === 'completed'}
              >
                <PhoneOff className="mr-2 h-4 w-4" />
                End Call
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">No active call in progress</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
