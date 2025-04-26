
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { twilioService } from '@/services/twilio';
import { toast } from 'sonner';

export interface CallStatusUpdate {
  callSid?: string;
  status: string;
  phoneNumber?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  leadId?: string;
  errorMessage?: string;
  errorCode?: string;
}

export type CallStatusMap = Record<string, CallStatusUpdate>;

/**
 * Custom hook to track call statuses from multiple sources:
 * - Twilio Voice SDK events
 * - Database updates via realtime subscription
 * - Direct status updates
 */
export function useCallStatus() {
  const [callStatuses, setCallStatuses] = useState<CallStatusMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize call statuses from active calls in twilioService
  useEffect(() => {
    const getInitialStatus = async () => {
      try {
        setIsLoading(true);
        
        // Get any existing active calls from twilioService
        const activeCalls = twilioService.getActiveCalls();
        
        if (Object.keys(activeCalls).length > 0) {
          const initialStatuses: CallStatusMap = {};
          
          Object.entries(activeCalls).forEach(([leadId, call]) => {
            initialStatuses[leadId] = {
              callSid: call.sid,
              status: call.status || 'unknown',
              phoneNumber: call.parameters?.phoneNumber,
              startTime: call.status === 'in-progress' ? new Date() : undefined,
              leadId: leadId
            };
          });
          
          setCallStatuses(initialStatuses);
        }
      } catch (err) {
        console.error('Error initializing call statuses:', err);
        setError('Failed to initialize call statuses');
      } finally {
        setIsLoading(false);
      }
    };
    
    getInitialStatus();
    
    // Subscribe to Twilio SDK call events
    const unsubscribe = twilioService.onCallStatusChange((update) => {
      setCallStatuses(prev => {
        const newStatuses = { ...prev };
        
        if (update.leadId) {
          newStatuses[update.leadId] = {
            ...prev[update.leadId],
            ...update,
          };
          
          // If the call is disconnected, schedule removal after a delay
          if (update.status === 'completed' || update.status === 'failed') {
            setTimeout(() => {
              setCallStatuses(current => {
                const updated = { ...current };
                delete updated[update.leadId as string];
                return updated;
              });
            }, 5000); // Keep completed call visible for 5 seconds
          }
        }
        
        return newStatuses;
      });
    });
    
    // Clean up subscription
    return () => {
      unsubscribe();
    };
  }, []);

  // Subscribe to real-time database updates for call statuses
  useEffect(() => {
    const channel = supabase
      .channel('call-status-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictive_dialer_calls'
        },
        (payload) => {
          const { new: newData } = payload;
          if (!newData) return;
          
          // Type guard to check if newData has the required properties
          if (typeof newData === 'object' && newData !== null) {
            // Safely check if contact_id exists and it's a string or number
            const leadId = newData.contact_id !== undefined ? String(newData.contact_id) : null;
            
            if (leadId) {
              setCallStatuses(prev => {
                const update: CallStatusUpdate = {
                  // Safely access properties with type checking
                  callSid: typeof newData.twilio_call_sid === 'string' ? newData.twilio_call_sid : undefined,
                  status: typeof newData.status === 'string' ? newData.status : 'unknown',
                  startTime: newData.start_timestamp ? new Date(newData.start_timestamp as string) : undefined,
                  endTime: newData.end_timestamp ? new Date(newData.end_timestamp as string) : undefined,
                  duration: typeof newData.duration === 'number' ? newData.duration : undefined,
                  leadId
                };
                
                // Only update if this is new information
                if (!prev[leadId] || 
                    prev[leadId].status !== update.status ||
                    prev[leadId].callSid !== update.callSid) {
                  
                  // If call failed or had an error, show a toast notification
                  if (update.status === 'failed' && (update.errorCode || update.errorMessage)) {
                    toast.error(`Call error: ${update.errorMessage || 'Unknown error'}`, {
                      description: `Error code: ${update.errorCode || 'Unknown'}`
                    });
                  }
                  
                  return {
                    ...prev,
                    [leadId]: {
                      ...(prev[leadId] || {}),
                      ...update
                    }
                  };
                }
                
                return prev;
              });
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Method to manually update call status
  const updateCallStatus = (leadId: string, update: Partial<CallStatusUpdate>) => {
    setCallStatuses(prev => ({
      ...prev,
      [leadId]: {
        ...(prev[leadId] || { status: 'unknown' }),
        ...update,
        leadId
      }
    }));
  };

  return {
    callStatuses,
    isLoading,
    error,
    updateCallStatus
  };
}
