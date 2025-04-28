
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CallDispositionOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export interface ActiveCall {
  callSid: string;
  phoneNumber?: string;
  leadId?: string | number;
  userId?: string;
  status: string;
  lastUpdate: number;
}

export interface CallDispositionHook {
  endCall: (callSid: string, leadId?: string | number) => Promise<boolean>;
  setDisposition: (leadId: string | number, disposition: string, callSid?: string) => Promise<boolean>;
  getNextLead: (sessionId: string, userId?: string) => Promise<any>;
  getActiveCalls: () => Promise<ActiveCall[]>;
  isLoading: boolean;
  error: string | null;
}

export function useCallDisposition(options?: CallDispositionOptions): CallDispositionHook {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleRequest = async <T>(action: string, params: Record<string, any>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`[useCallDisposition] Invoking call-disposition function with action: ${action}`);
      
      const { data, error } = await supabase.functions.invoke('call-disposition', {
        body: {
          action,
          ...params,
        }
      });
      
      if (error) {
        throw new Error(`Error in call-disposition function: ${error.message || error}`);
      }
      
      console.log(`[useCallDisposition] ${action} response:`, data);
      
      if (options?.onSuccess) {
        options.onSuccess(data);
      }
      
      return data as T;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[useCallDisposition] Error in ${action}:`, errorMsg);
      setError(errorMsg);
      
      if (options?.onError) {
        options.onError(err instanceof Error ? err : new Error(String(err)));
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  const endCall = async (callSid: string, leadId?: string | number): Promise<boolean> => {
    const result = await handleRequest('end', { callSid, leadId });
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
  
  const getNextLead = async (sessionId: string, userId?: string): Promise<any> => {
    // Fix: Type the result properly to include hasMoreLeads property
    interface NextLeadResponse {
      success: boolean;
      message: string;
      leadId?: string | number;
      phoneNumber?: string;
      name?: string;
      hasMoreLeads: boolean;
    }
    
    const result = await handleRequest<NextLeadResponse>('next', { sessionId, userId });
    if (!result) {
      toast.error('Failed to get next lead');
      return null;
    }
    
    if (!result.hasMoreLeads) {
      toast.info('No more leads available in this session');
      return null;
    }
    
    toast.success('Next lead loaded');
    return result;
  };
  
  const getActiveCalls = async (): Promise<ActiveCall[]> => {
    interface ActiveCallsResponse {
      success: boolean;
      activeCalls: ActiveCall[];
      count: number;
    }
    
    const result = await handleRequest<ActiveCallsResponse>('list_active_calls', {});
    if (!result) {
      toast.error('Failed to get active calls');
      return [];
    }
    
    return result.activeCalls;
  };
  
  return {
    endCall,
    setDisposition,
    getNextLead,
    getActiveCalls,
    isLoading,
    error,
  };
}
