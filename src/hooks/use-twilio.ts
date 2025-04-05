
import { useState, useEffect, useCallback, useRef } from 'react';
import { twilioService } from '@/services/twilio';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveCall {
  callSid: string;
  phoneNumber: string;
  status: 'queued' | 'connecting' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  leadId: string | number;
  startTime: Date;
  endTime?: Date;
  notes?: string;
}

export const useTwilio = () => {
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCalls, setActiveCalls] = useState<Record<string, ActiveCall>>({});
  const [callLog, setCallLog] = useState<string[]>([]);
  const statusCheckIntervals = useRef<Record<string, number>>({});

  // Add a new function to add log entries with timestamps
  const addLogEntry = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setCallLog(prev => [`[${timestamp}] ${message}`, ...prev]);
  }, []);

  // Initialize Twilio on component mount
  useEffect(() => {
    const initializeTwilio = async () => {
      setIsLoading(true);
      try {
        const micAccess = await twilioService.initializeAudioContext();
        if (!micAccess) {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use the dialer.",
            variant: "destructive",
          });
          addLogEntry("Microphone access denied");
          return;
        }

        const deviceInitialized = await twilioService.initializeTwilioDevice();
        setInitialized(deviceInitialized);
        
        if (!deviceInitialized) {
          toast({
            title: "Error",
            description: "Failed to initialize phone system. Please check the console for details.",
            variant: "destructive",
          });
          addLogEntry("Failed to initialize phone system");
        } else {
          toast({
            title: "Success",
            description: "Phone system initialized successfully.",
          });
          addLogEntry("Phone system initialized successfully");
        }
      } catch (error) {
        console.error('Error initializing Twilio:', error);
        toast({
          title: "Error",
          description: "Failed to set up phone system. Please check console for details.",
          variant: "destructive",
        });
        addLogEntry(`Error initializing Twilio: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTwilio();

    return () => {
      // Cleanup all status check intervals
      Object.values(statusCheckIntervals.current).forEach(intervalId => {
        clearInterval(intervalId);
      });
      
      twilioService.cleanup();
    };
  }, [addLogEntry]);

  // Function to start monitoring call status
  const monitorCallStatus = useCallback((leadId: string | number, callSid: string) => {
    const leadIdStr = String(leadId);
    addLogEntry(`Starting call monitoring for lead ${leadIdStr} (SID: ${callSid})`);
    
    // Clear any existing interval for this lead
    if (statusCheckIntervals.current[leadIdStr]) {
      clearInterval(statusCheckIntervals.current[leadIdStr]);
    }
    
    // Set up a new interval to check call status every 3 seconds
    const intervalId = window.setInterval(async () => {
      try {
        const status = await twilioService.checkCallStatus(callSid);
        addLogEntry(`Call status for lead ${leadIdStr}: ${status}`);
        
        if (["completed", "busy", "no-answer", "failed", "canceled"].includes(status)) {
          // Call has ended, clear the interval
          clearInterval(statusCheckIntervals.current[leadIdStr]);
          delete statusCheckIntervals.current[leadIdStr];
          
          // Update the call status
          setActiveCalls(prev => {
            if (!prev[leadIdStr]) return prev;
            
            return {
              ...prev,
              [leadIdStr]: {
                ...prev[leadIdStr],
                status: status as ActiveCall['status'],
                endTime: new Date()
              }
            };
          });
          
          // Show toast based on the status
          switch(status) {
            case "completed":
              toast({
                title: "Call Completed",
                description: `Call has ended normally.`,
              });
              break;
            case "busy":
              toast({
                title: "Line Busy",
                description: `The phone line was busy.`,
                variant: "destructive",
              });
              break;
            case "no-answer":
              toast({
                title: "No Answer",
                description: `The call was not answered.`,
                variant: "destructive",
              });
              break;
            default:
              toast({
                title: "Call Failed",
                description: `Call ended with status: ${status}`,
                variant: "destructive",
              });
          }
        } else if (status === "in-progress" && activeCalls[leadIdStr]?.status !== "in-progress") {
          // Update to in-progress if it wasn't already
          setActiveCalls(prev => ({
            ...prev,
            [leadIdStr]: {
              ...prev[leadIdStr],
              status: "in-progress"
            }
          }));
          
          toast({
            title: "Call Connected",
            description: `Call is now in progress.`,
          });
          addLogEntry(`Call connected for lead ${leadIdStr}`);
        }
      } catch (error) {
        console.error(`Error monitoring call ${callSid}:`, error);
        addLogEntry(`Error monitoring call ${callSid}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 3000);
    
    statusCheckIntervals.current[leadIdStr] = intervalId;
  }, [activeCalls, addLogEntry]);

  // Call a Thoughtly contact using our Edge Function
  const callThoughtlyContact = useCallback(async (contactId: string | number, interviewId: string = "interview_demo_123") => {
    try {
      addLogEntry(`Calling Thoughtly contact ${contactId}`);
      const { data, error } = await supabase.functions.invoke('call-contact', {
        body: { 
          contactId, 
          interviewId, 
          metadata: { 
            source: 'AI Dialer',
            timestamp: new Date().toISOString() 
          } 
        }
      });
      
      if (error) {
        addLogEntry(`Error calling contact ${contactId}: ${error.message}`);
        throw error;
      }
      
      addLogEntry(`Successfully initiated call to contact ${contactId}`);
      return { success: true, data };
    } catch (error) {
      console.error(`Error calling Thoughtly contact ${contactId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }, [addLogEntry]);

  const makeCall = useCallback(async (phoneNumber: string, leadId: string | number) => {
    if (!initialized) {
      toast({
        title: "Error",
        description: "Phone system not initialized. Please refresh and try again.",
        variant: "destructive",
      });
      addLogEntry(`Failed to make call - phone system not initialized`);
      return { success: false };
    }

    addLogEntry(`Initiating call to ${phoneNumber} for lead ${leadId}`);
    const result = await twilioService.makeCall(phoneNumber);
    
    if (result.success && result.callSid) {
      const leadIdStr = String(leadId);
      
      setActiveCalls(prev => ({
        ...prev,
        [leadIdStr]: { 
          callSid: result.callSid!,
          phoneNumber,
          status: 'connecting',
          leadId,
          startTime: new Date()
        }
      }));
      
      toast({
        title: "Dialing",
        description: `Calling ${phoneNumber}...`,
      });
      
      // Start monitoring the call status
      monitorCallStatus(leadId, result.callSid);
    } else {
      toast({
        title: "Call Failed",
        description: result.error || "Could not connect call.",
        variant: "destructive", 
      });
      addLogEntry(`Call failed to ${phoneNumber}: ${result.error || "Could not connect call"}`);
    }

    return result;
  }, [initialized, monitorCallStatus, addLogEntry]);

  const endCall = useCallback(async (leadId: string | number) => {
    const leadIdStr = String(leadId);
    
    if (activeCalls[leadIdStr]) {
      addLogEntry(`Ending call for lead ${leadIdStr}`);
      // Stop monitoring this call
      if (statusCheckIntervals.current[leadIdStr]) {
        clearInterval(statusCheckIntervals.current[leadIdStr]);
        delete statusCheckIntervals.current[leadIdStr];
      }
      
      // End the call
      await twilioService.endCall();
      
      // Remove from active calls
      setActiveCalls(prev => {
        const newCalls = {...prev};
        delete newCalls[leadIdStr];
        return newCalls;
      });
      
      toast({
        title: "Call Ended",
        description: `Call has been disconnected.`,
      });
      
      return true;
    }
    
    return false;
  }, [activeCalls, addLogEntry]);

  const endAllCalls = useCallback(async () => {
    addLogEntry(`Ending all active calls`);
    // Stop all monitoring
    Object.values(statusCheckIntervals.current).forEach(intervalId => {
      clearInterval(intervalId);
    });
    statusCheckIntervals.current = {};
    
    // End all calls
    await twilioService.endCall();
    setActiveCalls({});
    
    toast({
      title: "All Calls Ended",
      description: `All active calls have been disconnected.`,
    });
  }, [addLogEntry]);

  return {
    initialized,
    isLoading,
    activeCalls,
    callLog,
    makeCall,
    endCall,
    endAllCalls,
    addLogEntry,
    callThoughtlyContact
  };
};
