
import { Button } from '@/components/ui/button';
import { PhoneOff } from 'lucide-react';
import { useHangupCall } from '@/hooks/use-hangup-call';
import { useEffect } from 'react';

interface HangupButtonProps {
  callSid?: string;
  onSuccess?: () => void;
  className?: string;
}

export function HangupButton({ callSid, onSuccess, className = '' }: HangupButtonProps) {
  const { hangupCall, isHangingUp } = useHangupCall();
  
  // Log whenever the callSid changes
  useEffect(() => {
    console.log("HANGUP BUTTON - CallSID prop changed:", callSid);
  }, [callSid]);

  const handleHangup = async () => {
    if (!callSid) {
      console.error("HANGUP BUTTON - No callSid provided to HangupButton");
      return;
    }
    
    console.log("HANGUP BUTTON - Attempting to hang up call with SID:", callSid);
    
    try {
      // Make sure to pass the full SID string, not a React event
      const success = await hangupCall(callSid);
      
      console.log("HANGUP BUTTON - hangupCall result:", success);
      
      if (success && onSuccess) {
        console.log("HANGUP BUTTON - Call ended successfully, invoking onSuccess callback");
        onSuccess();
      }
    } catch (error) {
      console.error("HANGUP BUTTON - Error in handleHangup:", error);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleHangup}
      disabled={!callSid || isHangingUp}
      className={className}
    >
      <PhoneOff className="h-4 w-4 mr-2" />
      {isHangingUp ? 'Ending...' : 'End Call'}
    </Button>
  );
}
