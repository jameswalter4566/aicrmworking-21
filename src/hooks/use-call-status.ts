
import { useState, useEffect } from 'react';
import { natsService, CallStatusUpdate } from '@/services/nats';

export function useCallStatus(sessionId: string | null) {
  const [callStatuses, setCallStatuses] = useState<Record<string, CallStatusUpdate>>({});
  
  useEffect(() => {
    if (!sessionId) return;
    
    // Subscribe to call status updates for this session
    const unsubscribe = natsService.subscribeToCallStatus(sessionId, (update) => {
      setCallStatuses(prev => ({
        ...prev,
        [update.callSid]: update
      }));
    });
    
    return () => {
      unsubscribe();
    };
  }, [sessionId]);
  
  return callStatuses;
}
