
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { twilioService } from "@/services/twilio";

interface AutoDialerControllerProps {
  sessionId: string;
}

export const AutoDialerController = ({ sessionId }: AutoDialerControllerProps) => {
  const [isDialing, setIsDialing] = useState(false);
  const [currentLead, setCurrentLead] = useState<any>(null);
  const [queueStats, setQueueStats] = useState({
    total: 0,
    completed: 0,
    remaining: 0
  });

  // Get the next lead from the queue
  const getNextLead = async () => {
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
  };

  // Process a single lead
  const processLead = async (lead: any) => {
    try {
      if (!lead) return false;

      // Format phone number using the same logic as manual dialer
      const phoneNumber = lead.phone_number || '';
      const formattedPhone = phoneNumber.startsWith('+') ? 
        phoneNumber : '+' + phoneNumber.replace(/\D/g, '');

      // Use existing twilioService.makeCall()
      const result = await twilioService.makeCall(formattedPhone, lead.id);

      if (!result.success) {
        toast({
          title: "Call Failed",
          description: result.error || "Failed to place call",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Call Initiated",
        description: `Dialing ${formattedPhone}...`
      });

      return true;
    } catch (error) {
      console.error('Error processing lead:', error);
      return false;
    }
  };

  // Start auto-dialing process
  const startDialing = async () => {
    if (!twilioService.isDeviceRegistered()) {
      toast({
        title: "Error",
        description: "Twilio device not ready. Please check your connection.",
        variant: "destructive"
      });
      return;
    }

    setIsDialing(true);
    
    while (isDialing) {
      const lead = await getNextLead();
      if (!lead) {
        setIsDialing(false);
        toast({
          title: "Queue Complete",
          description: "No more leads in queue"
        });
        break;
      }

      setCurrentLead(lead);
      await processLead(lead);
      
      // Wait for call to complete before moving to next lead
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  // Stop auto-dialing
  const stopDialing = () => {
    setIsDialing(false);
    setCurrentLead(null);
  };

  // Monitor queue stats
  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from('session_queue_stats')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (data) {
        setQueueStats({
          total: data.total_count || 0,
          completed: data.completed_count || 0,
          remaining: data.queued_count || 0
        });
      }
    };

    const interval = setInterval(fetchStats, 2000);
    fetchStats();

    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-x-2">
          <Badge variant={isDialing ? "default" : "secondary"}>
            {isDialing ? "Auto-Dialing Active" : "Auto-Dialing Paused"}
          </Badge>
          
          <Badge variant="outline">
            Queue: {queueStats.remaining}/{queueStats.total}
          </Badge>
          
          <Badge variant="outline">
            Completed: {queueStats.completed}
          </Badge>
        </div>

        <Button
          onClick={isDialing ? stopDialing : startDialing}
          variant={isDialing ? "destructive" : "default"}
        >
          {isDialing ? "Stop Auto-Dialing" : "Start Auto-Dialing"}
        </Button>
      </div>

      {currentLead && (
        <div className="text-sm text-muted-foreground">
          Currently processing: Lead #{currentLead.id}
        </div>
      )}
    </div>
  );
};
