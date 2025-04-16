
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
      const { data: nextLead, error } = await supabase.rpc('get_next_session_lead', {
        p_session_id: sessionId
      });
      
      if (error) throw error;
      if (!nextLead || nextLead.length === 0) return null;
      
      // Get lead details including phone number
      // Note: lead_id could be a string or number, we'll convert to number for the query
      const leadIdAsNumber = parseInt(nextLead[0].lead_id);
      
      if (isNaN(leadIdAsNumber)) {
        throw new Error(`Invalid lead ID: ${nextLead[0].lead_id}`);
      }
      
      const { data: leadDetails, error: leadError } = await supabase
        .from('leads')
        .select('id, phone1')
        .eq('id', leadIdAsNumber)
        .single();
      
      if (leadError || !leadDetails) {
        throw new Error('Could not fetch lead details');
      }
      
      return {
        ...nextLead[0],
        phoneNumber: leadDetails.phone1
      };
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

      if (!lead.phoneNumber) {
        toast({
          title: "Missing Phone Number",
          description: "This lead does not have a valid phone number",
          variant: "destructive",
        });
        
        // Update lead status to failed
        await supabase
          .from('dialing_session_leads')
          .update({
            status: 'failed',
            notes: 'Missing phone number'
          })
          .eq('id', lead.id);
          
        setIsProcessingCall(false);
        onCallComplete();
        return;
      }

      // Initialize Twilio device
      await twilioService.initializeTwilioDevice();
      
      // Make the call using phone number from lead
      // Pass lead_id as string to the twilio service
      const callResult = await twilioService.makeCall(lead.phoneNumber, lead.lead_id);
      
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
          description: `Calling lead ${lead.lead_id}`
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

  return null;
};
