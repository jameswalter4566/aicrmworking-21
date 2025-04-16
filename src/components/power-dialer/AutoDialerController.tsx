
import { useEffect, useState, useCallback } from 'react';
import { twilioService } from "@/services/twilio";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface AutoDialerControllerProps {
  sessionId: string | null;
  isActive: boolean;
  onCallComplete: () => void;
}

export const AutoDialerController: React.FC<AutoDialerControllerProps> = ({
  sessionId,
  isActive,
  onCallComplete
}) => {
  const [isProcessingCall, setIsProcessingCall] = useState(false);
  const { toast } = useToast();

  const getNextLead = useCallback(async () => {
    if (!sessionId) return null;
    
    try {
      const { data: lead, error } = await supabase.rpc('get_next_session_lead', {
        p_session_id: sessionId
      });
      
      if (error) throw error;
      if (!lead) return null;
      
      return lead;
    } catch (error) {
      console.error('Error getting next lead:', error);
      return null;
    }
  }, [sessionId]);

  const processNextLead = useCallback(async () => {
    if (isProcessingCall || !isActive || !sessionId) return;
    
    try {
      setIsProcessingCall(true);
      const lead = await getNextLead();
      
      if (!lead) {
        toast({
          title: "Queue Empty",
          description: "No more leads in the queue"
        });
        return;
      }

      // Initialize Twilio device if needed
      await twilioService.initializeTwilioDevice();
      
      // Make the call using existing Twilio service
      const callResult = await twilioService.makeCall(lead.phone_number, lead.id);
      
      if (!callResult.success) {
        toast({
          title: "Call Failed",
          description: callResult.error || "Failed to place call",
          variant: "destructive",
        });
        
        // Update lead status
        await supabase
          .from('dialing_session_leads')
          .update({
            status: 'failed',
            notes: callResult.error
          })
          .eq('id', lead.id);
      } else {
        toast({
          title: "Call Initiated",
          description: `Calling lead ${lead.id}`
        });
      }

    } catch (error) {
      console.error('Error processing lead:', error);
      toast({
        title: "Error",
        description: "Failed to process next lead",
        variant: "destructive",
      });
    } finally {
      setIsProcessingCall(false);
      onCallComplete();
    }
  }, [isProcessingCall, isActive, sessionId, getNextLead, toast, onCallComplete]);

  // Monitor for completed calls and process next lead
  useEffect(() => {
    if (!isActive || !sessionId) return;

    const channel = supabase
      .channel('call_status_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dialing_session_leads',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === 'completed' || newStatus === 'failed') {
            processNextLead();
          }
        }
      )
      .subscribe();

    // Start initial call if active
    if (!isProcessingCall) {
      processNextLead();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isActive, processNextLead, isProcessingCall]);

  return null; // This is a logic-only component
};
