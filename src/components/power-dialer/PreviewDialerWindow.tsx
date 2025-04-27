
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PhoneOff, CalendarClock, UserCheck, Voicemail, ThumbsUp, ThumbsDown, RefreshCw, Ban, Phone } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

interface PreviewDialerWindowProps {
  currentCall?: any;
  onDisposition?: (type: string) => void;
  onEndCall?: () => Promise<void>;
  isLoading?: boolean;
}

const PreviewDialerWindow = ({ 
  currentCall, 
  onDisposition, 
  onEndCall,
  isLoading = false 
}: PreviewDialerWindowProps) => {
  const [isHangingUp, setIsHangingUp] = useState(false);

  const handleEndCall = async () => {
    if (isHangingUp) return;
    
    try {
      setIsHangingUp(true);
      
      if (currentCall?.callSid) {
        console.log("Using disposition panel to end call:", currentCall.callSid);
        
        const { data, error } = await supabase.functions.invoke('disposition-panel', {
          body: {
            action: 'hangup',
            callSid: currentCall.callSid,
            leadId: currentCall.leadId
          }
        });
        
        if (error) {
          console.error("Error from disposition panel:", error);
          throw error;
        }
        
        console.log("Disposition panel response:", data);
        toast.success("Call ended successfully");
      }
      
      // Also call the parent onEndCall handler if provided
      if (onEndCall) {
        await onEndCall();
      }
      
    } catch (err) {
      console.error("Error ending call via disposition panel:", err);
      toast.error("Error ending call");
    } finally {
      setIsHangingUp(false);
    }
  };

  // Check if there is an active call
  const hasActiveCall = !!currentCall && 
    (currentCall.status === 'connecting' || 
     currentCall.status === 'ringing' || 
     currentCall.status === 'in-progress');

  // Determine if the call is fully connected
  const isConnected = !!currentCall && currentCall.status === 'in-progress';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Disposition Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {currentCall && (
            <div className="flex flex-col space-y-2 mb-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{currentCall.contact?.name || currentCall.phoneNumber || "Current Call"}</p>
                  <p className="text-sm text-muted-foreground">{currentCall.phoneNumber}</p>
                </div>
                <Badge 
                  variant={currentCall.status === 'in-progress' ? "default" : "outline"}
                  className="self-start"
                >
                  {currentCall.status === 'connecting' || currentCall.status === 'ringing' ? 'Ringing' : 
                   currentCall.status === 'in-progress' ? 'Connected' :
                   currentCall.status === 'completed' ? 'Ended' : 
                   currentCall.status}
                </Badge>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full"
                  onClick={handleEndCall}
                  disabled={!hasActiveCall || isHangingUp || isLoading}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  {isHangingUp ? 'Hanging Up...' : 'Hang Up'}
                </Button>
              </div>
            </div>
          )}
          
          {!currentCall && (
            <div className="text-center py-4 text-muted-foreground">
              No active call
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              onClick={() => onDisposition && onDisposition('Contact')}
              disabled={!isConnected || isHangingUp || isLoading}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Contact
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onDisposition && onDisposition('No Answer')}
              disabled={!hasActiveCall || isHangingUp || isLoading}
            >
              <PhoneOff className="mr-2 h-4 w-4" />
              No Answer
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onDisposition && onDisposition('Voicemail')}
              disabled={!hasActiveCall || isHangingUp || isLoading}
            >
              <Voicemail className="mr-2 h-4 w-4" />
              Left Voicemail
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onDisposition && onDisposition('Interested')}
              disabled={!isConnected || isHangingUp || isLoading}
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Interested
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onDisposition && onDisposition('Not Interested')}
              disabled={!isConnected || isHangingUp || isLoading}
            >
              <ThumbsDown className="mr-2 h-4 w-4" />
              Not Interested
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onDisposition && onDisposition('Call Back')}
              disabled={!isConnected || isHangingUp || isLoading}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Call Back
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onDisposition && onDisposition('Wrong Number')}
              disabled={!isConnected || isHangingUp || isLoading}
            >
              <Phone className="mr-2 h-4 w-4" />
              Wrong Number
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onDisposition && onDisposition('DNC')}
              disabled={!isConnected || isHangingUp || isLoading}
            >
              <Ban className="mr-2 h-4 w-4" />
              Do Not Call
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PreviewDialerWindow;
