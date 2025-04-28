
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
      return;
    }

    const success = await hangupCall(callSid);
    if (success && onSuccess) {
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
