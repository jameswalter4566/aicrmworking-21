import { useEffect, useState, useCallback } from 'react';
import { twilioService } from "@/services/twilio";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface AutoDialerControllerProps {
  sessionId: string | null;
  isActive: boolean;
  onCallComplete: () => void;
}

interface SessionLead {
  id: string;
  lead_id: string;
  session_id: string;
  status: string;
  priority: number;
  attempt_count: number;
  notes?: string;
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
      
      let leadDetails = { id: null, phone1: null };
      try {
        const lead = nextLead[0] as SessionLead;
        const notesData = lead.notes ? JSON.parse(lead.notes) : {};
        const originalLeadId = notesData.originalLeadId;
        const phoneNumber = notesData.phone;
        
        if (phoneNumber) {
          return {
            ...lead,
            phoneNumber: phoneNumber
          };
        } else if (originalLeadId) {
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
      }
      
      if (!leadDetails.phone1) {
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
      
      return {
        ...nextLead[0],
        phoneNumber: leadDetails.phone1
      };
    } catch (error) {
      console.error('Error getting next lead:', error);
      
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

      let phoneNumber = null;
      if (lead.notes) {
        try {
          const notesData = JSON.parse(lead.notes);
          phoneNumber = notesData.phone;
        } catch (e) {
          console.error('Error parsing lead notes:', e);
        }
      }

      if (!phoneNumber) {
        toast({
          title: "Missing Phone Number",
          description: "This lead does not have a valid phone number",
          variant: "destructive",
        });
        
        await supabase
          .from('dialing_session_leads')
          .update({
            status: 'failed',
            notes: JSON.stringify({
              ...JSON.parse(lead.notes || '{}'),
              error: 'Missing phone number'
            })
          })
          .eq('id', lead.id);
          
        setIsProcessingCall(false);
        onCallComplete();
        return;
      }

      await twilioService.initializeTwilioDevice();
      
      console.log(`Initiating call to ${phoneNumber} for lead ID ${lead.lead_id}`);
      const callResult = await twilioService.makeCall(phoneNumber, lead.lead_id);
      
      if (!callResult.success) {
        toast({
          title: "Call Failed",
          description: callResult.error || "Failed to place call",
          variant: "destructive",
        });
        
        await supabase
          .from('dialing_session_leads')
          .update({
            status: 'failed',
            notes: JSON.stringify({
              ...JSON.parse(lead.notes || '{}'),
              error: callResult.error
            })
          })
          .eq('id', lead.id);
      } else {
        await supabase
          .from('dialing_session_leads')
          .update({
            status: 'in_progress',
            notes: JSON.stringify({
              ...JSON.parse(lead.notes || '{}'),
              callSid: callResult.callSid,
              callStartTime: new Date().toISOString()
            })
          })
          .eq('id', lead.id);

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
            setNoMoreLeads(false);
            processNextLead();
          }
        }
      )
      .subscribe();

    if (!isProcessingCall && !noMoreLeads) {
      processNextLead();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isActive, processNextLead, isProcessingCall, noMoreLeads]);

  return null;
};
