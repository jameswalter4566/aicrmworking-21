
import { Button } from '@/components/ui/button';
import { PhoneOff } from 'lucide-react';
import { useHangupCall } from '@/hooks/use-hangup-call';

interface HangupButtonProps {
  callSid?: string;
  onSuccess?: () => void;
  className?: string;
}

export function HangupButton({ callSid, onSuccess, className = '' }: HangupButtonProps) {
  const { hangupCall, isHangingUp } = useHangupCall();

  const handleHangup = async () => {
    if (!callSid) {
      console.error("No callSid provided to HangupButton");
      return;
    }
    
    console.log("HangupButton - Attempting to hang up call with SID:", callSid);
    
    const success = await hangupCall(callSid);
    
    if (success && onSuccess) {
      console.log("HangupButton - Call ended successfully, invoking onSuccess callback");
      onSuccess();
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
