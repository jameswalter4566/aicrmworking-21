
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

// Create a new interface that extends SessionLead with the dynamically added properties
interface ProcessedSessionLead extends SessionLead {
  phoneNumber: string | null;
  getLeadDetails?: () => Promise<{ id: string | null; phone1: string | null }>;
}

export const AutoDialerController: React.FC<AutoDialerControllerProps> = ({
  sessionId,
  isActive,
  onCallComplete
}) => {
  const [isProcessingCall, setIsProcessingCall] = useState(false);
  const [noMoreLeads, setNoMoreLeads] = useState(false);
  const [hasAttemptedFix, setHasAttemptedFix] = useState(false);
  const [fixAttemptCount, setFixAttemptCount] = useState(0);
  const { toast } = useToast();

  // Function to fix the database function if needed
  const fixDatabaseFunction = useCallback(async () => {
    try {
      console.log('Attempting to fix database function...');
      
      const { data, error } = await supabase.functions.invoke('fix-get-next-lead-function');
      
      if (error) {
        console.error('Error fixing database function:', error);
        toast({
          title: "Error",
          description: "Failed to fix database function",
          variant: "destructive",
        });
        return false;
      }
      
      console.log('Database function fix result:', data);
      
      if (data.success) {
        toast({
          title: "Database Fix Applied",
          description: "The database function has been fixed. Trying to get next lead again.",
        });
        return true;
      } else {
        toast({
          title: "Database Fix Failed",
          description: data.error || "Unknown error fixing database function",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error invoking fix function:', error);
      toast({
        title: "Error",
        description: "Failed to invoke database fix function",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Manually execute the get_next_session_lead using a direct SQL query
  // This is a fallback method if the RPC function is still failing
  const getNextLeadDirectSQL = useCallback(async (sessionId: string) => {
    try {
      console.log('Attempting to get next lead using direct SQL...');
      
      // Use a direct SQL query with fully qualified table names
      const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: `
        WITH next_lead AS (
          SELECT dsl.* 
          FROM dialing_session_leads dsl
          WHERE dsl.session_id = '${sessionId}'
          AND dsl.status = 'queued'
          ORDER BY dsl.priority DESC, dsl.created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE dialing_session_leads dsl
        SET status = 'in_progress',
            attempt_count = dsl.attempt_count + 1
        FROM next_lead
        WHERE dsl.id = next_lead.id
        RETURNING dsl.id, dsl.lead_id, dsl.session_id, dsl.status, 
                 dsl.priority, dsl.attempt_count, dsl.notes;
        `
      });
      
      if (error) {
        console.error('Error with direct SQL approach:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log('No leads found with direct SQL');
        return null;
      }
      
      console.log('Successfully retrieved lead with direct SQL:', data[0]);
      return processFetchedLead(data[0]);
      
    } catch (error) {
      console.error('Error with direct SQL approach:', error);
      return null;
    }
  }, []);

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
      
      try {
        const { data: nextLead, error } = await supabase.rpc('get_next_session_lead', {
          p_session_id: sessionId
        });
        
        if (error) {
          console.error('Error calling get_next_session_lead:', error);
          
          // Check if this is an ambiguous column error and try to fix it
          if (error.message?.includes('ambiguous') && error.code === '42702' && fixAttemptCount < 3) {
            setFixAttemptCount(count => count + 1);
            const fixed = await fixDatabaseFunction();
            
            if (fixed) {
              // Retry getting the next lead after fixing
              console.log('Retrying get_next_session_lead after fix...');
              const retryResponse = await supabase.rpc('get_next_session_lead', {
                p_session_id: sessionId
              });
              
              if (retryResponse.error) {
                console.error('Error after fix attempt:', retryResponse.error);
                
                // As a last resort, try the direct SQL approach
                console.log('Attempting direct SQL approach as last resort...');
                const leadFromSQL = await getNextLeadDirectSQL(sessionId);
                return leadFromSQL;
              }
              
              if (!retryResponse.data || retryResponse.data.length === 0) {
                console.log('No lead returned after fix');
                setNoMoreLeads(true);
                return null;
              }
              
              console.log('Next lead retrieved after fix:', retryResponse.data[0]);
              return processFetchedLead(retryResponse.data[0]);
            } else {
              // Try direct SQL as a fallback
              return await getNextLeadDirectSQL(sessionId);
            }
          } else {
            // If it's not an ambiguous column error or we've already tried fixing it
            // Try direct SQL as a fallback
            return await getNextLeadDirectSQL(sessionId);
          }
        }
        
        if (!nextLead || nextLead.length === 0) {
          console.log('No lead returned from get_next_session_lead');
          setNoMoreLeads(true);
          return null;
        }
        
        console.log('Next lead retrieved:', nextLead[0]);
        return processFetchedLead(nextLead[0]);
      } catch (error) {
        console.error('Error in getNextLead:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error getting next lead:', error);
      
      if (error.message?.includes('ambiguous') || error.code === '42702') {
        toast({
          title: "Database Function Error",
          description: "Attempting to automatically fix the ambiguous column issue",
        });
        
        if (fixAttemptCount < 3) {
          setFixAttemptCount(count => count + 1);
          await fixDatabaseFunction();
          
          // Try direct SQL as a fallback
          return await getNextLeadDirectSQL(sessionId);
        }
      }
      
      return null;
    }
  }, [sessionId, fixAttemptCount, fixDatabaseFunction, getNextLeadDirectSQL, toast]);

  // Helper function to process the fetched lead
  const processFetchedLead = (lead: SessionLead): ProcessedSessionLead => {
    let phoneNumber = null;
    
    // Try to extract phone from notes if it exists
    if (lead.notes) {
      try {
        const notesData = JSON.parse(lead.notes);
        phoneNumber = notesData.phone;
        
        if (phoneNumber) {
          return {
            ...lead,
            phoneNumber
          };
        }
      } catch (e) {
        console.error('Error parsing lead notes:', e);
      }
    }
    
    // Create a function to get lead details and attach it to the lead object
    const processedLead: ProcessedSessionLead = {
      ...lead,
      phoneNumber,
      getLeadDetails: async () => {
        try {
          // First try to get lead from the notes
          if (lead.notes) {
            try {
              const notesData = JSON.parse(lead.notes);
              const originalLeadId = notesData.originalLeadId;
              
              if (originalLeadId) {
                const { data: leadData, error: leadError } = await supabase
                  .from('leads')
                  .select('id, phone1')
                  .eq('id', originalLeadId)
                  .maybeSingle();
                
                if (!leadError && leadData && leadData.phone1) {
                  // Convert the numeric id to string to match the expected return type
                  return { id: leadData.id.toString(), phone1: leadData.phone1 };
                }
              }
            } catch (parseError) {
              console.error('Error parsing lead notes:', parseError);
            }
          }
          
          // Try parsing lead_id as a number
          try {
            const leadIdAsNumber = parseInt(lead.lead_id);
            
            if (!isNaN(leadIdAsNumber)) {
              const { data: leadData, error: leadError } = await supabase
                .from('leads')
                .select('id, phone1')
                .eq('id', leadIdAsNumber)
                .maybeSingle();
              
              if (!leadError && leadData && leadData.phone1) {
                // Convert the numeric id to string to match the expected return type
                return { id: leadData.id.toString(), phone1: leadData.phone1 };
              }
            }
          } catch (parseError) {
            console.error('Error parsing lead_id as number:', parseError);
          }
          
          return { id: null, phone1: null };
        } catch (error) {
          console.error('Error fetching lead details:', error);
          return { id: null, phone1: null };
        }
      }
    };
    
    return processedLead;
  };

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

      // Determine phone number to call
      let phoneNumber = lead.phoneNumber;
      
      // If no phone number yet, try to get it
      if (!phoneNumber && lead.getLeadDetails) {
        const leadDetails = await lead.getLeadDetails();
        phoneNumber = leadDetails.phone1;
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
