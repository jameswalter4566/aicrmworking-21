
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

            // Also notify lead-connected function about active calls
            notifyLeadConnected(leadId, call.sid, call.status || 'unknown');
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
    const unsubscribe = twilioService.onCallStatusChange(async (update) => {
      // Send to lead-connected for any status update
      if (update.leadId && update.callSid) {
        await notifyLeadConnected(update.leadId, update.callSid, update.status);
      }

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

  // Helper function to notify lead-connected edge function
  const notifyLeadConnected = async (leadId: string, callSid?: string, status?: string) => {
    if (!leadId) return;
    
    try {
      console.log(`Notifying lead-connected for lead: ${leadId}, status: ${status}`);
      
      // Send call status data to lead-connected edge function
      const { data, error } = await supabase.functions.invoke('lead-connected', {
        body: { 
          leadId,
          callData: {
            callSid,
            status,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('Error notifying lead-connected:', error);
      } else if (data) {
        console.log('Lead details successfully retrieved:', data.lead ? 'Found' : 'Not found');
      }
    } catch (err) {
      console.error('Error invoking lead-connected function:', err);
    }
  };

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
        async (payload) => {
          const { new: newData } = payload;
          if (!newData) return;
          
          // Safely cast newData to a record type
          const typedNewData = newData as Record<string, any>;
          
          // Check if this record has a contact_id (leadId)
          if (typedNewData && typedNewData.contact_id) {
            const leadId = String(typedNewData.contact_id);
            
            if (leadId) {
              // Always notify lead-connected function for any call status change
              await notifyLeadConnected(
                leadId, 
                typedNewData.twilio_call_sid as string || undefined, 
                typedNewData.status as string || 'unknown'
              );

              setCallStatuses(prev => {
                const update: CallStatusUpdate = {
                  callSid: typedNewData.twilio_call_sid as string,
                  status: typedNewData.status as string || 'unknown',
                  startTime: typedNewData.start_timestamp ? new Date(typedNewData.start_timestamp as string) : undefined,
                  endTime: typedNewData.end_timestamp ? new Date(typedNewData.end_timestamp as string) : undefined,
                  duration: typeof typedNewData.duration === 'number' ? typedNewData.duration : undefined,
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
    // Notify lead-connected when status is manually updated
    if (update.status) {
      notifyLeadConnected(leadId, update.callSid, update.status);
    }

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
