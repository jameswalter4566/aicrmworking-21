
import { useEffect, useState, useCallback } from 'react';
import { twilioService } from "@/services/twilio";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/AuthContext';

interface AutoDialerControllerProps {
  sessionId: string | null;
  isActive: boolean;
  onCallComplete: () => void;
}

interface SessionLead {
  id: string;
  lead_id: string;  // This is now expected to be a UUID string
  session_id: string;
  status: string;
  priority: number;
  attempt_count: number;
  notes?: string;
}

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
  const { user } = useAuth();

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

  const getNextLeadDirectSQL = useCallback(async (sessionId: string) => {
    try {
      console.log('Attempting to get next lead using direct SQL...');
      
      const { data: agentData, error: agentError } = await supabase
        .from('power_dialer_agents')
        .select('id')
        .eq('user_id', user?.id)
        .single();
        
      if (agentError || !agentData) {
        console.error('Error getting agent data:', agentError);
        toast({
          title: "Agent Error",
          description: "You need to be registered as an agent to use the power dialer",
          variant: "destructive",
        });
        return null;
      }

      const { data, error } = await supabase
        .rpc('get_next_session_lead', {
          p_session_id: sessionId
        });
      
      if (error) {
        console.error('Error with getting next lead:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log('No leads found');
        return null;
      }
      
      console.log('Successfully retrieved lead:', data[0]);
      return processFetchedLead(data[0]);
      
    } catch (error) {
      console.error('Error with getting next lead:', error);
      return null;
    }
  }, [user?.id, toast]);

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
          
          // Handle various error conditions, including the structure mismatch
          if ((error.message?.includes('ambiguous') || error.code === '42702' || error.code === '42804') && fixAttemptCount < 3) {
            setFixAttemptCount(count => count + 1);
            const fixed = await fixDatabaseFunction();
            
            if (fixed) {
              console.log('Retrying get_next_session_lead after fix...');
              const retryResponse = await supabase.rpc('get_next_session_lead', {
                p_session_id: sessionId
              });
              
              if (retryResponse.error) {
                console.error('Error after fix attempt:', retryResponse.error);
                
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
              return await getNextLeadDirectSQL(sessionId);
            }
          } else {
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
      
      if (error.message?.includes('ambiguous') || error.code === '42702' || error.code === '42804') {
        toast({
          title: "Database Function Error",
          description: "Attempting to automatically fix the issue...",
        });
        
        if (fixAttemptCount < 3) {
          setFixAttemptCount(count => count + 1);
          await fixDatabaseFunction();
          
          return await getNextLeadDirectSQL(sessionId);
        }
      }
      
      return null;
    }
  }, [sessionId, fixAttemptCount, fixDatabaseFunction, getNextLeadDirectSQL, toast]);

  const processFetchedLead = (lead: SessionLead): ProcessedSessionLead => {
    let phoneNumber = null;
    
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
    
    const processedLead: ProcessedSessionLead = {
      ...lead,
      phoneNumber,
      getLeadDetails: async () => {
        try {
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
                  return { id: leadData.id.toString(), phone1: leadData.phone1 };
                }
              }
            } catch (parseError) {
              console.error('Error parsing lead notes:', parseError);
            }
          }
          
          // If the lead_id is a UUID string, convert it to a numeric ID for the leads table lookup
          try {
            // We may need to map the UUID to the original lead ID or extract from notes
            const { data: leadData, error: leadError } = await supabase
              .from('leads')
              .select('id, phone1')
              .eq('id', lead.lead_id)
              .maybeSingle();
            
            if (!leadError && leadData && leadData.phone1) {
              return { id: leadData.id.toString(), phone1: leadData.phone1 };
            }
            
            // If direct UUID lookup fails, try to parse the notes for more info
            if (lead.notes) {
              const notesData = JSON.parse(lead.notes || '{}');
              if (notesData.phone) {
                return { id: lead.lead_id, phone1: notesData.phone };
              }
            }
          } catch (parseError) {
            console.error('Error looking up lead details:', parseError);
          }
          
          return { id: lead.lead_id, phone1: null };
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
        setIsProcessingCall(false);
        return;
      }

      let phoneNumber = lead.phoneNumber;
      
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

      // Initialize Twilio Device before attempting call
      const deviceInitialized = await twilioService.initializeTwilioDevice();
      
      if (!deviceInitialized || !twilioService.isDeviceRegistered()) {
        toast({
          title: "Browser Phone Error",
          description: "Could not initialize browser phone. Please refresh and try again.",
          variant: "destructive",
        });
        
        await supabase
          .from('dialing_session_leads')
          .update({
            status: 'failed',
            notes: JSON.stringify({
              ...JSON.parse(lead.notes || '{}'),
              error: 'Browser phone initialization failed'
            })
          })
          .eq('id', lead.id);
          
        setIsProcessingCall(false);
        onCallComplete();
        return;
      }

      // Check microphone access
      if (!twilioService.isMicrophoneActive()) {
        toast({
          title: "Microphone Required",
          description: "Please allow microphone access to make calls through your browser.",
          variant: "destructive",
        });
        
        await supabase
          .from('dialing_session_leads')
          .update({
            status: 'failed',
            notes: JSON.stringify({
              ...JSON.parse(lead.notes || '{}'),
              error: 'Microphone access denied or unavailable'
            })
          })
          .eq('id', lead.id);
          
        setIsProcessingCall(false);
        onCallComplete();
        return;
      }

      // Format phone number
      let formattedPhoneNumber = phoneNumber;
      if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
        formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
      }

      // Directly use Twilio Device for browser-based calling
      if (!window.Twilio?.Device) {
        toast({
          title: "Browser Phone Error",
          description: "Twilio Device not available. Please refresh the page.",
          variant: "destructive",
        });
        
        await supabase
          .from('dialing_session_leads')
          .update({
            status: 'failed',
            notes: JSON.stringify({
              ...JSON.parse(lead.notes || '{}'),
              error: 'Twilio Device not available'
            })
          })
          .eq('id', lead.id);
          
        setIsProcessingCall(false);
        onCallComplete();
        return;
      }

      try {
        console.log(`Making browser-based call to ${formattedPhoneNumber} for lead ${lead.lead_id}`);
        
        const call = await window.Twilio.Device.connect({
          params: {
            phoneNumber: formattedPhoneNumber,
            leadId: lead.lead_id
          }
        });

        if (call) {
          console.log(`Call connected with SID: ${call.sid}`);
          
          await supabase
            .from('dialing_session_leads')
            .update({
              status: 'in_progress',
              notes: JSON.stringify({
                ...JSON.parse(lead.notes || '{}'),
                callSid: call.sid,
                callStartTime: new Date().toISOString()
              })
            })
            .eq('id', lead.id);

          toast({
            title: "Call Connected",
            description: `Calling ${formattedPhoneNumber} through browser`,
          });
        }
      } catch (callError) {
        console.error('Error making browser call:', callError);
        toast({
          title: "Call Failed",
          description: "Could not connect call through browser. Please check your audio settings.",
          variant: "destructive",
        });

        await supabase
          .from('dialing_session_leads')
          .update({
            status: 'failed',
            notes: JSON.stringify({
              ...JSON.parse(lead.notes || '{}'),
              error: 'Browser call failed: ' + (callError.message || 'Unknown error')
            })
          })
          .eq('id', lead.id);
          
        setIsProcessingCall(false);
        onCallComplete();
        return;
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
