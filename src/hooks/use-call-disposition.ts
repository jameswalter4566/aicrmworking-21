
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CallDispositionOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useCallDisposition(options?: CallDispositionOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleRequest = async <T>(action: string, params: Record<string, any>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('call-disposition', {
        body: {
          action,
          ...params,
        }
      });
      
      if (error) throw error;
      
      if (options?.onSuccess) {
        options.onSuccess(data);
      }
      
      return data as T;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      
      if (options?.onError) {
        options.onError(err instanceof Error ? err : new Error(String(err)));
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  const endCall = async (callSid: string): Promise<boolean> => {
    const result = await handleRequest('end', { callSid });
    if (result) {
      toast.success('Call ended');
      return true;
    }
    toast.error('Failed to end call');
    return false;
  };
  
  const setDisposition = async (leadId: string | number, disposition: string, callSid?: string): Promise<boolean> => {
    const result = await handleRequest('disposition', { leadId, disposition, callSid });
    if (result) {
      toast.success(`Lead marked as ${disposition}`);
      return true;
    }
    toast.error('Failed to update disposition');
    return false;
  };

  return {
    endCall,
    setDisposition,
    isLoading,
    error,
  };
}
