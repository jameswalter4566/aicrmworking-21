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
  const [noMoreLeads, setNoMoreLeads] = useState(false);
  const { toast } = useToast();

  const getNextLead = useCallback(async () => {
    if (!sessionId) return null;
    
    try {
      console.log('Fetching next lead for session:', sessionId);
      
      // First, check if there are any queued leads left in the session
      const { data: queuedLeads, error: queueCheckError } = await supabase
        .from('dialing_session_leads')
        .select('count')
        .eq('session_id', sessionId)
        .eq('status', 'queued');
      
      if (queueCheckError) {
        console.error('Error checking for queued leads:', queueCheckError);
        throw queueCheckError;
      }
      
      const queuedCount = queuedLeads && queuedLeads.length > 0 ? queuedLeads[0].count : 0;
      
      if (queuedCount === 0) {
        console.log('No more queued leads available in the session');
        setNoMoreLeads(true);
        return null;
      }
      
      // If queued leads exist, then get the next lead
      const { data: nextLead, error } = await supabase.rpc('get_next_session_lead', {
        p_session_id: sessionId
      });
      
      if (error) {
        console.error('Error calling get_next_session_lead:', error);
        throw error;
      }
      
      if (!nextLead || nextLead.length === 0) {
        console.log('No lead returned from get_next_session_lead');
        setNoMoreLeads(true);
        return null;
      }
      
      console.log('Next lead retrieved:', nextLead[0]);
      
      // Parse the lead notes to get the original lead ID and phone number
      let leadDetails = { id: null, phone1: null };
      try {
        const notesData = JSON.parse(nextLead[0].notes || '{}');
        const originalLeadId = notesData.originalLeadId;
        const phoneNumber = notesData.phone;
        
        if (phoneNumber) {
          // If we have the phone number in the notes, use it directly
          return {
            ...nextLead[0],
            phoneNumber: phoneNumber
          };
        } else if (originalLeadId) {
          // Otherwise query the leads table with the original lead ID
          const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .select('id, phone1')
            .eq('id', originalLeadId)
            .maybeSingle();
          
          if (leadError) {
            console.error('Error fetching lead details:', leadError);
            throw leadError;
          }
          
          if (leadData) {
            leadDetails = leadData;
          }
        }
      } catch (parseError) {
        console.error('Error parsing lead notes:', parseError);
        // Continue execution and try to get lead details directly
      }
      
      // If we couldn't get lead details from the notes, try using the lead_id directly
      if (!leadDetails.phone1) {
        // Check if lead_id is a number first
        try {
          const leadIdAsNumber = parseInt(nextLead[0].lead_id);
          
          if (!isNaN(leadIdAsNumber)) {
            const { data: leadData, error: leadError } = await supabase
              .from('leads')
              .select('id, phone1')
              .eq('id', leadIdAsNumber)
              .maybeSingle();
            
            if (leadError) {
              console.error('Error fetching lead details using lead_id as number:', leadError);
            } else if (leadData) {
              leadDetails = leadData;
            }
          }
        } catch (parseError) {
          console.error('Error parsing lead_id as number:', parseError);
        }
      }
      
      // Return the next lead with phone number
      return {
        ...nextLead[0],
        phoneNumber: leadDetails.phone1
      };
    } catch (error) {
      console.error('Error getting next lead:', error);
      
      // If there's an ambiguous id error, we know the function needs fixing
      if (error.message?.includes('ambiguous') || error.code === '42702') {
        toast({
          title: "Database Function Error",
          description: "Please run the fix-get-next-lead-function to resolve the ambiguous column issue",
          variant: "destructive",
        });
      }
      
      return null;
    }
  }, [sessionId, toast]);

  const processNextLead = useCallback(async () => {
    if (isProcessingCall || !isActive || !sessionId || noMoreLeads) {
      if (noMoreLeads && isActive) {
        toast({
          title: "All Leads Processed",
          description: "All leads in the session have been dialed",
        });
      }
      return;
    }
    
    try {
      setIsProcessingCall(true);
      
      const lead = await getNextLead();
      
      if (!lead) {
        if (!noMoreLeads) {
          toast({
            title: "Queue Empty",
            description: "No more leads in the queue"
          });
          setNoMoreLeads(true);
        }
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
      console.log(`Initiating call to ${lead.phoneNumber} for lead ID ${lead.lead_id}`);
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
  }, [isProcessingCall, isActive, sessionId, getNextLead, toast, onCallComplete, noMoreLeads]);

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
            // Reset noMoreLeads flag when a call completes, in case leads were added
            setNoMoreLeads(false);
            processNextLead();
          }
        }
      )
      .subscribe();

    // Start initial call if active
    if (!isProcessingCall && !noMoreLeads) {
      processNextLead();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isActive, processNextLead, isProcessingCall, noMoreLeads]);

  return null;
};
