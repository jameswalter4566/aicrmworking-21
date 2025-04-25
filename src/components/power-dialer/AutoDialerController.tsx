
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
  
  // Add a new ref to track leads currently being processed
  const processingLeadIdsRef = useRef<Set<string>>(new Set());
  // Add a new ref to track phone numbers that are currently being dialed
  const dialingPhoneNumbersRef = useRef<Set<string>>(new Set());
  
  // Add a request ID tracker to ensure uniqueness of operations
  const requestIdCounter = useRef<number>(0);
  
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

  // Enhanced version of getNextLead with better race condition handling
  const getNextLead = useCallback(async () => {
    if (!sessionId) return null;
    
    // Generate a unique request ID for this attempt
    const requestId = `lead-request-${Date.now()}-${requestIdCounter.current++}`;
    console.log(`[${requestId}] Fetching next lead for session: ${sessionId}`);
    
    try {
      const { data: queuedLeads, error: queueCheckError } = await supabase
        .from('dialing_session_leads')
        .select('count')
        .eq('session_id', sessionId)
        .eq('status', 'queued');
      
      if (queueCheckError) {
        console.error(`[${requestId}] Error checking for queued leads:`, queueCheckError);
        throw queueCheckError;
      }
      
      const queuedCount = queuedLeads && queuedLeads.length > 0 ? queuedLeads[0].count : 0;
      
      if (queuedCount === 0) {
        console.log(`[${requestId}] No more queued leads available in the session`);
        setNoMoreLeads(true);
        return null;
      }
      
      try {
        console.log(`[${requestId}] Calling get_next_session_lead RPC`);
        const { data: nextLead, error } = await supabase.rpc('get_next_session_lead', {
          p_session_id: sessionId
        });
        
        if (error) {
          console.error(`[${requestId}] Error calling get_next_session_lead:`, error);
          
          if (error.message?.includes('ambiguous') && error.code === '42702' && fixAttemptCount < 3) {
            setFixAttemptCount(count => count + 1);
            const fixed = await fixDatabaseFunction();
            
            if (fixed) {
              console.log(`[${requestId}] Retrying get_next_session_lead after fix...`);
              const retryResponse = await supabase.rpc('get_next_session_lead', {
                p_session_id: sessionId
              });
              
              if (retryResponse.error) {
                console.error(`[${requestId}] Error after fix attempt:`, retryResponse.error);
                
                console.log(`[${requestId}] Attempting direct SQL approach as last resort...`);
                const leadFromSQL = await getNextLeadDirectSQL(sessionId);
                return leadFromSQL;
              }
              
              if (!retryResponse.data || retryResponse.data.length === 0) {
                console.log(`[${requestId}] No lead returned after fix`);
                setNoMoreLeads(true);
                return null;
              }
              
              console.log(`[${requestId}] Next lead retrieved after fix:`, retryResponse.data[0]);
              return processFetchedLead(retryResponse.data[0], requestId);
            } else {
              return await getNextLeadDirectSQL(sessionId);
            }
          } else {
            return await getNextLeadDirectSQL(sessionId);
          }
        }
        
        if (!nextLead || nextLead.length === 0) {
          console.log(`[${requestId}] No lead returned from get_next_session_lead`);
          setNoMoreLeads(true);
          return null;
        }
        
        console.log(`[${requestId}] Next lead retrieved:`, nextLead[0]);
        return processFetchedLead(nextLead[0], requestId);
      } catch (error) {
        console.error(`[${requestId}] Error in getNextLead:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`[${requestId}] Error getting next lead:`, error);
      
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

  // Enhanced version of processFetchedLead with request ID for tracking
  const processFetchedLead = (lead: SessionLead, requestId: string): ProcessedSessionLead => {
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
        console.error(`[${requestId}] Error parsing lead notes:`, e);
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
              console.error(`[${requestId}] Error parsing lead notes:`, parseError);
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
            console.error(`[${requestId}] Error parsing lead_id as number:`, parseError);
          }
          
          return { id: null, phone1: null };
        } catch (error) {
          console.error(`[${requestId}] Error fetching lead details:`, error);
          return { id: null, phone1: null };
        }
      }
    };
    
    return processedLead;
  };

  const updateLeadStatus = useCallback(async (leadId: string, status: string, errorDetails?: string) => {
    if (!leadId) return false;
    
    // Generate a unique request ID for this status update
    const requestId = `status-update-${Date.now()}-${requestIdCounter.current++}`;
    
    try {
      console.log(`[${requestId}] Updating lead ${leadId} to status: ${status}${errorDetails ? ' with error: ' + errorDetails : ''}`);
      
      // First, get the current notes
      const { data: leadData, error: fetchError } = await supabase
        .from('dialing_session_leads')
        .select('notes')
        .eq('id', leadId)
        .single();
      
      if (fetchError) {
        console.error(`[${requestId}] Error fetching lead notes:`, fetchError);
        return false;
      }
      
      // Parse existing notes or initialize empty object
      let notesObj = {};
      try {
        if (leadData?.notes) {
          notesObj = JSON.parse(leadData.notes);
        }
      } catch (parseError) {
        console.error(`[${requestId}] Error parsing existing notes:`, parseError);
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
        console.error(`[${requestId}] Error updating lead status:`, error);
        return false;
      }
      
      console.log(`[${requestId}] Successfully updated lead ${leadId} to status: ${status}`);
      return true;
    } catch (error) {
      console.error(`[${requestId}] Error in updateLeadStatus:`, error);
      return false;
    }
  }, []);

  // Enhanced version of processNextLead with better race condition handling
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
    
    // Generate a unique request ID for this process
    const requestId = `process-lead-${Date.now()}-${requestIdCounter.current++}`;
    console.log(`[${requestId}] Starting to process next lead`);
    
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

      // Mark this lead as being processed to prevent race conditions
      if (processingLeadIdsRef.current.has(lead.id)) {
        console.log(`[${requestId}] Lead ${lead.id} is already being processed, skipping`);
        setIsProcessingCall(false);
        onCallComplete();
        return;
      }
      processingLeadIdsRef.current.add(lead.id);

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
        processingLeadIdsRef.current.delete(lead.id);
        return;
      }

      // Standardize phone number format for consistent tracking
      const standardizedPhone = phoneNumber.replace(/\D/g, '');
      
      // Check if this number is currently being dialed - prevents race conditions
      if (dialingPhoneNumbersRef.current.has(standardizedPhone)) {
        console.log(`[${requestId}] Phone number ${phoneNumber} is currently being dialed in another process, skipping`);
        await updateLeadStatus(lead.id, 'failed', `Phone number ${phoneNumber} is already being dialed`);
        setIsProcessingCall(false);
        onCallComplete();
        processingLeadIdsRef.current.delete(lead.id);
        return;
      }

      // Check if phone number is valid
      if (!isValidPhoneNumber(phoneNumber)) {
        console.log(`[${requestId}] Invalid phone number ${phoneNumber}, marking as failed and skipping`);
        
        await updateLeadStatus(lead.id, 'failed', `Invalid phone number: ${phoneNumber}`);
        setIsProcessingCall(false);
        onCallComplete();
        processingLeadIdsRef.current.delete(lead.id);
        return;
      }

      // Skip if we've already called this number
      if (processedPhoneNumbers.has(standardizedPhone)) {
        console.log(`[${requestId}] Already called ${phoneNumber}, marking as completed and skipping`);
        await updateLeadStatus(lead.id, 'completed', 'Phone number already called in this session');
        setIsProcessingCall(false);
        onCallComplete();
        processingLeadIdsRef.current.delete(lead.id);
        return;
      }

      // Track this lead and phone number
      setCurrentLeadId(lead.id);
      
      // Add to tracking sets BEFORE making the call
      setProcessedPhoneNumbers(prev => new Set(prev).add(standardizedPhone));
      dialingPhoneNumbersRef.current.add(standardizedPhone);
      
      // Update call state ref for tracking
      callStateRef.current = {
        isActiveCall: true,
        currentLeadId: lead.id,
        currentPhoneNumber: phoneNumber,
        callStartTime: Date.now(),
        callAttempts: 0,
      };

      // Initialize Twilio and make the call
      try {
        await twilioService.initializeTwilioDevice();
        
        console.log(`[${requestId}] Initiating call to ${phoneNumber} for lead ID ${lead.lead_id}`);
        const callResult = await twilioService.makeCall(phoneNumber, lead.lead_id);
        
        if (!callResult.success) {
          // Check if this is a blacklist error based on error message
          const isBlacklistedError = 
            callResult.error?.includes('blacklisted') || 
            callResult.error?.includes('13225');
            
          if (isBlacklistedError) {
            console.log(`[${requestId}] Phone number ${phoneNumber} is blacklisted by Twilio, adding to blacklist`);
            
            // Add to blacklisted numbers
            setBlacklistedNumbers(prev => new Set(prev).add(standardizedPhone));
            
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
          
          // Remove from processing sets after failure
          processingLeadIdsRef.current.delete(lead.id);
          dialingPhoneNumbersRef.current.delete(standardizedPhone);
        } else {
          toast({
            title: "Call Initiated",
            description: `Calling lead ${lead.lead_id}`
          });
          
          // Set a failsafe timeout to ensure call gets marked as completed
          setTimeout(async () => {
            // If the call is still marked as active after 60 seconds, forcibly mark it as completed
            if (callStateRef.current.currentLeadId === lead.id && callStateRef.current.isActiveCall) {
              console.log(`[${requestId}] Failsafe timeout triggered for lead ${lead.id} - forcing completion`);
              await updateLeadStatus(lead.id, 'completed');
              setCurrentLeadId(null);
              setIsProcessingCall(false);
              callStateRef.current.isActiveCall = false;
              onCallComplete();
              processingLeadIdsRef.current.delete(lead.id);
              dialingPhoneNumbersRef.current.delete(standardizedPhone);
            }
          }, 60000); // 60 second timeout
        }
      } catch (error) {
        console.error(`[${requestId}] Error making call:`, error);
        
        // Clean up tracking on error
        await updateLeadStatus(lead.id, 'failed', `Error making call: ${error?.message || 'Unknown error'}`);
        processingLeadIdsRef.current.delete(lead.id);
        dialingPhoneNumbersRef.current.delete(standardizedPhone);
        setIsProcessingCall(false);
        onCallComplete();
      }
    } catch (error) {
      console.error(`[${requestId}] Error processing lead:`, error);
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
    const requestId = `call-completion-${Date.now()}-${requestIdCounter.current++}`;
    console.log(`[${requestId}] Handling call completion, error code: ${errorCode || 'none'}`);
    
    if (callStateRef.current.currentLeadId && callStateRef.current.currentPhoneNumber) {
      // If we have an error code that indicates blacklisted number, add to blacklist
      if (errorCode === 13225 && callStateRef.current.currentPhoneNumber) {
        console.log(`[${requestId}] Adding phone number ${callStateRef.current.currentPhoneNumber} to blacklist due to error code ${errorCode}`);
        const standardizedPhone = callStateRef.current.currentPhoneNumber.replace(/\D/g, '');
        setBlacklistedNumbers(prev => new Set(prev).add(standardizedPhone));
        
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
      
      // Clean up tracking
      if (callStateRef.current.currentPhoneNumber) {
        const standardizedPhone = callStateRef.current.currentPhoneNumber.replace(/\D/g, '');
        dialingPhoneNumbersRef.current.delete(standardizedPhone);
      }
      
      processingLeadIdsRef.current.delete(callStateRef.current.currentLeadId);
      setCurrentLeadId(null);
      callStateRef.current.isActiveCall = false;
      callStateRef.current.currentPhoneNumber = null;
      callStateRef.current.currentLeadId = null;
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
      // Clear all tracking sets when session changes
      setProcessedPhoneNumbers(new Set());
      setBlacklistedNumbers(new Set());
      processingLeadIdsRef.current = new Set();
      dialingPhoneNumbersRef.current = new Set();
      
      setNoMoreLeads(false);
      callStateRef.current = {
        isActiveCall: false,
        currentLeadId: null,
        currentPhoneNumber: null,
        callStartTime: 0,
        callAttempts: 0,
      };
      
      // Reset request counter
      requestIdCounter.current = 0;
      
      console.log(`Session reset: ${sessionId}. All tracking data cleared.`);
    }
  }, [sessionId]);

  return null;
};
