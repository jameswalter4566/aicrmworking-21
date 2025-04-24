
import { useEffect, useState, useCallback, useRef } from 'react';
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
  lead_id: string;
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
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [processedPhoneNumbers, setProcessedPhoneNumbers] = useState<Set<string>>(new Set());
  const [blacklistedNumbers, setBlacklistedNumbers] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Use a ref to track the current call state
  const callStateRef = useRef({
    isActiveCall: false,
    currentLeadId: null as string | null,
    currentPhoneNumber: null as string | null,
    callStartTime: 0,
    callAttempts: 0,
  });

  // Track call attempts to prevent infinite looping
  const maxCallAttempts = useRef(3);
  
  // Track phone validation errors
  const phoneValidationErrors = useRef<Record<string, boolean>>({});

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

  // Function to validate phone numbers
  const isValidPhoneNumber = useCallback((phone: string | null) => {
    if (!phone) return false;
    
    // Basic phone number validation: at least 10 digits, ignoring any formatting characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Check if number is in the blacklisted set
    if (blacklistedNumbers.has(phone) || blacklistedNumbers.has(digitsOnly)) {
      console.log(`Phone number ${phone} is blacklisted, skipping`);
      return false;
    }
    
    // Check minimum length (10 digits for US numbers)
    if (digitsOnly.length < 10) {
      console.log(`Phone number ${phone} is too short (${digitsOnly.length} digits), needs at least 10`);
      phoneValidationErrors.current[phone] = true;
      return false;
    }
    
    return true;
  }, [blacklistedNumbers]);

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
          
          if (error.message?.includes('ambiguous') && error.code === '42702' && fixAttemptCount < 3) {
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
      
      if (error.message?.includes('ambiguous') || error.code === '42702') {
        toast({
          title: "Database Function Error",
          description: "Attempting to automatically fix the ambiguous column issue",
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
          
          try {
            const leadIdAsNumber = parseInt(lead.lead_id);
            
            if (!isNaN(leadIdAsNumber)) {
              const { data: leadData, error: leadError } = await supabase
                .from('leads')
                .select('id, phone1')
                .eq('id', leadIdAsNumber)
                .maybeSingle();
              
              if (!leadError && leadData && leadData.phone1) {
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

  const updateLeadStatus = useCallback(async (leadId: string, status: string, errorDetails?: string) => {
    if (!leadId) return false;
    
    try {
      console.log(`Updating lead ${leadId} to status: ${status}${errorDetails ? ' with error: ' + errorDetails : ''}`);
      
      // First, get the current notes
      const { data: leadData, error: fetchError } = await supabase
        .from('dialing_session_leads')
        .select('notes')
        .eq('id', leadId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching lead notes:', fetchError);
        return false;
      }
      
      // Parse existing notes or initialize empty object
      let notesObj = {};
      try {
        if (leadData?.notes) {
          notesObj = JSON.parse(leadData.notes);
        }
      } catch (parseError) {
        console.error('Error parsing existing notes:', parseError);
        // Continue with empty object if parsing fails
      }
      
      // Update notes with call completion timestamp and any error details
      const updatedNotes = {
        ...notesObj,
        callCompletedAt: new Date().toISOString(),
        ...(errorDetails ? { errorDetails } : {})
      };
      
      // Update the lead status and notes
      const { error } = await supabase
        .from('dialing_session_leads')
        .update({
          status: status,
          notes: JSON.stringify(updatedNotes)
        })
        .eq('id', leadId);
      
      if (error) {
        console.error('Error updating lead status:', error);
        return false;
      }
      
      console.log(`Successfully updated lead ${leadId} to status: ${status}`);
      return true;
    } catch (error) {
      console.error('Error in updateLeadStatus:', error);
      return false;
    }
  }, []);

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
      
      // If a previous lead exists, ensure it's properly marked as completed
      if (currentLeadId) {
        await updateLeadStatus(currentLeadId, 'completed');
        setCurrentLeadId(null);
      }
      
      // Reset call attempt counter for new lead
      callStateRef.current.callAttempts = 0;
      
      // Get next lead
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

      // Check if we've already processed this phone number
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
        
        await updateLeadStatus(lead.id, 'failed', 'Missing phone number');
        setIsProcessingCall(false);
        onCallComplete();
        return;
      }

      // Check if phone number is valid
      if (!isValidPhoneNumber(phoneNumber)) {
        console.log(`Invalid phone number ${phoneNumber}, marking as failed and skipping`);
        
        await updateLeadStatus(lead.id, 'failed', `Invalid phone number: ${phoneNumber}`);
        setIsProcessingCall(false);
        onCallComplete();
        return;
      }

      // Skip if we've already called this number
      if (processedPhoneNumbers.has(phoneNumber)) {
        console.log(`Already called ${phoneNumber}, marking as completed and skipping`);
        await updateLeadStatus(lead.id, 'completed', 'Phone number already called in this session');
        setIsProcessingCall(false);
        onCallComplete();
        return;
      }

      // Track this lead and phone number
      setCurrentLeadId(lead.id);
      setProcessedPhoneNumbers(prev => new Set(prev).add(phoneNumber!));
      
      // Update call state ref for tracking
      callStateRef.current = {
        isActiveCall: true,
        currentLeadId: lead.id,
        currentPhoneNumber: phoneNumber,
        callStartTime: Date.now(),
        callAttempts: 0,
      };

      // Initialize Twilio and make the call
      await twilioService.initializeTwilioDevice();
      
      console.log(`Initiating call to ${phoneNumber} for lead ID ${lead.lead_id}`);
      const callResult = await twilioService.makeCall(phoneNumber, lead.lead_id);
      
      if (!callResult.success) {
        // Check if this is a blacklist error based on error message
        const isBlacklistedError = 
          callResult.error?.includes('blacklisted') || 
          callResult.error?.includes('13225');
          
        if (isBlacklistedError) {
          console.log(`Phone number ${phoneNumber} is blacklisted by Twilio, adding to blacklist`);
          
          // Add to blacklisted numbers
          setBlacklistedNumbers(prev => new Set(prev).add(phoneNumber!));
          
          toast({
            title: "Blacklisted Number",
            description: `The phone number ${phoneNumber} is blacklisted by Twilio and cannot be called`,
            variant: "destructive",
          });
          
          await updateLeadStatus(lead.id, 'failed', `Phone number blacklisted: ${callResult.error || 'Twilio error'}`);
        } else {
          toast({
            title: "Call Failed",
            description: callResult.error || "Failed to place call",
            variant: "destructive",
          });
          
          await updateLeadStatus(lead.id, 'failed', callResult.error || "Unknown error");
        }
        
        setIsProcessingCall(false);
        onCallComplete();
        callStateRef.current.isActiveCall = false;
      } else {
        toast({
          title: "Call Initiated",
          description: `Calling lead ${lead.lead_id}`
        });
        
        // Set a failsafe timeout to ensure call gets marked as completed
        setTimeout(async () => {
          // If the call is still marked as active after 60 seconds, forcibly mark it as completed
          if (callStateRef.current.currentLeadId === lead.id && callStateRef.current.isActiveCall) {
            console.log(`Failsafe timeout triggered for lead ${lead.id} - forcing completion`);
            await updateLeadStatus(lead.id, 'completed');
            setCurrentLeadId(null);
            setIsProcessingCall(false);
            callStateRef.current.isActiveCall = false;
            onCallComplete();
          }
        }, 60000); // 60 second timeout
      }

    } catch (error) {
      console.error('Error processing lead:', error);
      toast({
        title: "Error",
        description: "Failed to process next lead",
        variant: "destructive",
      });
      setIsProcessingCall(false);
      onCallComplete();
    }
  }, [isProcessingCall, isActive, sessionId, currentLeadId, getNextLead, updateLeadStatus, toast, onCallComplete, noMoreLeads, processedPhoneNumbers, isValidPhoneNumber]);

  const handleCallCompletion = useCallback(async (errorCode?: number) => {
    if (callStateRef.current.currentLeadId) {
      // If we have an error code that indicates blacklisted number, add to blacklist
      if (errorCode === 13225 && callStateRef.current.currentPhoneNumber) {
        console.log(`Adding phone number ${callStateRef.current.currentPhoneNumber} to blacklist due to error code ${errorCode}`);
        setBlacklistedNumbers(prev => new Set(prev).add(callStateRef.current.currentPhoneNumber!));
        
        // Update lead with error details
        await updateLeadStatus(
          callStateRef.current.currentLeadId, 
          'failed', 
          `Phone number blacklisted: Twilio error 13225`
        );
      } else {
        // Regular call completion
        await updateLeadStatus(callStateRef.current.currentLeadId, 'completed');
      }
      
      setCurrentLeadId(null);
      callStateRef.current.isActiveCall = false;
    }
    
    setIsProcessingCall(false);
    onCallComplete();
  }, [updateLeadStatus, onCallComplete]);

  // This effect sets up the call disconnect listener
  useEffect(() => {
    if (!twilioService || !isActive) return;
    
    const handleCallDisconnect = async (error?: { code?: number }) => {
      console.log('Call disconnected event received', error ? `with error code: ${error.code}` : '');
      await handleCallCompletion(error?.code);
    };
    
    const cleanupListener = twilioService.onCallDisconnect(handleCallDisconnect);
    
    return () => {
      cleanupListener?.();
    };
  }, [twilioService, isActive, handleCallCompletion]);

  // This effect monitors for session updates and starts the dialer
  useEffect(() => {
    if (!isActive || !sessionId) return;

    // Create a Supabase channel to listen for updates
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

    // Start the dialer if it's not already processing a call and there are leads
    if (!isProcessingCall && !noMoreLeads) {
      processNextLead();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isActive, processNextLead, isProcessingCall, noMoreLeads]);

  // Reset the processed phone numbers when session changes
  useEffect(() => {
    if (sessionId) {
      setProcessedPhoneNumbers(new Set());
      setBlacklistedNumbers(new Set());
      setNoMoreLeads(false);
      callStateRef.current = {
        isActiveCall: false,
        currentLeadId: null,
        currentPhoneNumber: null,
        callStartTime: 0,
        callAttempts: 0,
      };
    }
  }, [sessionId]);

  return null;
};
