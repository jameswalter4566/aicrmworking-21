
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { twilioService } from '@/services/twilio';
import { toast } from '@/hooks/use-toast';

interface AutoDialerControllerProps {
  sessionId: string;
  isActive: boolean;
  onCallComplete: () => void;
}

export const AutoDialerController = ({ sessionId, isActive, onCallComplete }: AutoDialerControllerProps) => {
  const [isProcessingNext, setIsProcessingNext] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const processNextLead = async () => {
      if (!isActive || isProcessingNext) return;

      try {
        setIsProcessingNext(true);
        console.log(`[process-lead-${Date.now()}-${Math.floor(Math.random() * 100)}] Starting to process next lead`);

        // Get next lead from queue
        const { data: nextLead, error: leadError } = await supabase.rpc('get_next_session_lead', {
          p_session_id: sessionId
        });

        if (leadError) throw leadError;

        if (!nextLead) {
          console.log("No more leads in queue");
          return;
        }

        // Parse lead data from notes field
        // nextLead is a single object, not an array
        const leadData = JSON.parse(nextLead.notes || '{}');
        const phoneNumber = leadData.phone;

        if (!phoneNumber) {
          console.error("No phone number found for lead", nextLead);
          return;
        }

        // Update lead status to in_progress
        const { error: updateError } = await supabase
          .from('dialing_session_leads')
          .update({ status: 'in_progress' })
          .eq('id', nextLead.id);

        if (updateError) throw updateError;

        // Place the call
        const formattedPhone = phoneNumber.replace(/\D/g, '');
        const callResult = await twilioService.makeCall(formattedPhone, nextLead.lead_id);

        if (!callResult.success) {
          throw new Error(callResult.error || "Failed to place call");
        }

        // Set timeout for next call
        timeoutId = setTimeout(processNextLead, 2000);

      } catch (error) {
        console.error("Error processing next lead:", error);
        toast({
          title: "Error",
          description: "Failed to process next lead. Retrying...",
          variant: "destructive",
        });
        timeoutId = setTimeout(processNextLead, 5000); // Retry after 5 seconds on error
      } finally {
        setIsProcessingNext(false);
      }
    };

    if (isActive) {
      processNextLead();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sessionId, isActive, isProcessingNext, onCallComplete]);

  return null; // This is a controller component, no UI needed
};
