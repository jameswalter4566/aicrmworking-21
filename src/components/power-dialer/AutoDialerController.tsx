
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
      const { data, error } = await supabase.rpc('get_next_session_lead', {
        p_session_id: sessionId
      });
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      // Return the first item from the array
      return data[0];
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

      // We need to get the lead's phone number from the database using lead_id
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('phone1, id')
        .eq('id', lead.lead_id)
        .single();
      
      if (leadError || !leadData) {
        console.error('Error fetching lead details:', leadError);
        toast({
          title: "Error",
          description: "Could not fetch lead contact information",
          variant: "destructive",
        });
        return;
      }

      // Initialize Twilio device if needed
      await twilioService.initializeTwilioDevice();
      
      // Get the lead phone number and id
      const phoneNumber = leadData.phone1;
      // Explicitly convert lead_id to string to match service expectation
      const leadId = String(lead.lead_id);
      
      if (!phoneNumber) {
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
      
      // Make the call using existing Twilio service - pass leadId as a string
      const callResult = await twilioService.makeCall(phoneNumber, leadId);
      
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
          description: `Calling lead ${leadId}`
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
