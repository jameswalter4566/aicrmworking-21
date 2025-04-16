
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PlayCircle, PauseCircle, StopCircle, Phone } from 'lucide-react';
import { twilioService } from "@/services/twilio";
import { supabase } from "@/integrations/supabase/client";

interface AutoDialerControllerProps {
  sessionId: string | null;
}

const AutoDialerController: React.FC<AutoDialerControllerProps> = ({ sessionId }) => {
  const [isDialing, setIsDialing] = useState(false);
  const [currentLead, setCurrentLead] = useState<any>(null);
  const [queueStats, setQueueStats] = useState({
    remaining: 0,
    completed: 0,
    total: 0
  });

  const getNextLead = async () => {
    if (!sessionId) return null;
    
    try {
      // Get next queued lead using the existing get_next_session_lead function
      const { data: nextLead, error } = await supabase.rpc('get_next_session_lead', {
        p_session_id: sessionId
      });

      if (error) {
        console.error('Error getting next lead:', error);
        return null;
      }

      if (!nextLead || nextLead.length === 0) {
        console.log('No more leads in queue');
        return null;
      }

      // Check if notes exists before parsing
      if (nextLead[0] && typeof nextLead[0].notes === 'string') {
        try {
          // Parse the lead data from notes
          const leadData = JSON.parse(nextLead[0].notes);
          return {
            ...nextLead[0],
            ...leadData
          };
        } catch (parseError) {
          console.error('Error parsing lead notes:', parseError);
          return nextLead[0];
        }
      } else {
        // Return the lead without parsing if notes doesn't exist or isn't a string
        return nextLead[0];
      }
    } catch (error) {
      console.error('Error in getNextLead:', error);
      return null;
    }
  };

  const dialNextLead = async () => {
    if (!isDialing) return;

    const lead = await getNextLead();
    if (!lead) {
      setIsDialing(false);
      toast.info("All leads have been contacted");
      return;
    }

    setCurrentLead(lead);
    
    try {
      // Use the existing twilioService.makeCall() function
      const callResult = await twilioService.makeCall(lead.phone, lead.lead_id);
      
      if (!callResult.success) {
        console.error("Call failed:", callResult.error);
        toast.error("Call Failed", {
          description: callResult.error || "Unable to place call"
        });
      } else {
        toast.success("Call Initiated", {
          description: `Calling ${lead.firstName || ''} ${lead.lastName || ''}...`
        });
      }

      // Wait for call to complete before dialing next lead
      // The existing webhook will handle updating the call status
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      if (isDialing) {
        dialNextLead();
      }
    } catch (error) {
      console.error('Error making call:', error);
      setIsDialing(false);
      toast.error("Error", {
        description: "Failed to initiate call"
      });
    }
  };

  const startDialing = async () => {
    if (!sessionId) {
      toast.error("No active session");
      return;
    }
    
    setIsDialing(true);
    toast.success("Auto-dialer started");
    dialNextLead();
  };

  const stopDialing = () => {
    setIsDialing(false);
    setCurrentLead(null);
    toast.info("Auto-dialer stopped");
  };

  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to queue stats updates
    const channel = supabase
      .channel('queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dialing_session_leads',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          // Refresh queue stats when changes occur
          fetchQueueStats();
        }
      )
      .subscribe();

    const fetchQueueStats = async () => {
      const { data } = await supabase
        .from('session_queue_stats')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (data) {
        setQueueStats({
          remaining: data.queued_count || 0,
          completed: data.completed_count || 0,
          total: data.total_count || 0
        });
      }
    };

    fetchQueueStats();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          Auto-Dialer Controls
          <Badge variant={isDialing ? "default" : "secondary"}>
            {isDialing ? "Active" : "Stopped"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            {!isDialing ? (
              <Button 
                onClick={startDialing}
                disabled={!sessionId || queueStats.remaining === 0}
                className="w-full"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Start Auto-Dialer
              </Button>
            ) : (
              <Button 
                onClick={stopDialing}
                variant="destructive"
                className="w-full"
              >
                <StopCircle className="mr-2 h-4 w-4" />
                Stop Auto-Dialer
              </Button>
            )}
          </div>

          {currentLead && (
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {currentLead.firstName || currentLead.first_name || ''} {currentLead.lastName || currentLead.last_name || ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentLead.phone || currentLead.phone1 || ''}
                  </p>
                </div>
                <Phone className="h-4 w-4 animate-pulse text-green-500" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted p-2 rounded-md text-center">
              <div className="text-2xl font-bold">{queueStats.remaining}</div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
            <div className="bg-muted p-2 rounded-md text-center">
              <div className="text-2xl font-bold">{queueStats.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="bg-muted p-2 rounded-md text-center">
              <div className="text-2xl font-bold">{queueStats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoDialerController;
