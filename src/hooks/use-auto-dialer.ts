
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface AutoDialerConfig {
  enabled: boolean;
  delayBetweenCalls: number;
  noAnswerTimeout: number;
}

export function useAutoDialer(onNextCall: () => Promise<void>) {
  const [config, setConfig] = useState<AutoDialerConfig>({
    enabled: false,
    delayBetweenCalls: 3000, // 3 seconds default
    noAnswerTimeout: 30000, // 30 seconds default
  });

  const [timeoutTimer, setTimeoutTimer] = useState<NodeJS.Timeout | null>(null);
  const [remainingTimeout, setRemainingTimeout] = useState<number | null>(null);
  
  const clearTimeoutTimer = useCallback(() => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      setTimeoutTimer(null);
    }
    setRemainingTimeout(null);
  }, [timeoutTimer]);

  const handleCallCompletion = useCallback(async () => {
    if (!config.enabled) return;
    
    clearTimeoutTimer();
    
    // Add delay before next call
    await new Promise(resolve => setTimeout(resolve, config.delayBetweenCalls));
    
    try {
      await onNextCall();
    } catch (error) {
      console.error('Error auto-dialing next lead:', error);
      toast.error('Auto-dialer error', {
        description: 'Failed to dial next lead automatically'
      });
    }
  }, [config.enabled, config.delayBetweenCalls, onNextCall, clearTimeoutTimer]);

  const startNoAnswerTimeout = useCallback(() => {
    if (!config.enabled) return;
    
    clearTimeoutTimer();
    
    const startTime = Date.now();
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = config.noAnswerTimeout - elapsed;
      
      if (remaining <= 0) {
        clearTimeoutTimer();
        handleCallCompletion();
      } else {
        setRemainingTimeout(remaining);
      }
    }, 1000);
    
    setTimeoutTimer(timer as unknown as NodeJS.Timeout);
    
    return () => clearInterval(timer);
  }, [config.enabled, config.noAnswerTimeout, clearTimeoutTimer, handleCallCompletion]);

  useEffect(() => {
    return () => clearTimeoutTimer();
  }, [clearTimeoutTimer]);

  return {
    config,
    setConfig,
    remainingTimeout,
    startNoAnswerTimeout,
    handleCallCompletion,
    clearTimeoutTimer
  };
}
