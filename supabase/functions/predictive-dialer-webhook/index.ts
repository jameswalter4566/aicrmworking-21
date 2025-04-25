import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Temporary memory store for call statuses when database table is not available
const memoryCallStatusStore: Record<string, any[]> = {};

// Store call status update in memory
function storeCallStatusUpdate(sessionId: string, statusData: any) {
  if (!memoryCallStatusStore[sessionId]) {
    memoryCallStatusStore[sessionId] = [];
  }
  
  const update = {
    session_id: sessionId,
    timestamp: Date.now(),
    data: statusData,
  };
  
  memoryCallStatusStore[sessionId].push(update);
  
  // Keep only the latest 100 updates per session to avoid memory issues
  if (memoryCallStatusStore[sessionId].length > 100) {
    memoryCallStatusStore[sessionId] = memoryCallStatusStore[sessionId].slice(-100);
  }
  
  return update;
}

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get callId from URL parameters
    const url = new URL(req.url);
    const callId = url.searchParams.get('callId');
    
    // Parse form data or JSON from Twilio webhook
    let formData: any;
    let sessionId: string | null = null;
    
    if (req.headers.get('Content-Type')?.includes('application/json')) {
      formData = await req.json();
      sessionId = formData.sessionId || formData.SessionId || null;
    } else {
      formData = await req.formData();
      sessionId = formData.get('SessionId')?.toString() || null;
    }
    
    const callStatus = formData.CallStatus || formData.get('CallStatus')?.toString();
    const callSid = formData.CallSid || formData.get('CallSid')?.toString();
    const callDuration = formData.CallDuration || formData.get('CallDuration')?.toString();
    const phoneNumber = formData.To || formData.get('To')?.toString();
    
    console.log(`Webhook received for call ${callId || callSid} with status: ${callStatus}`);
    console.log(`Session ID from request: ${sessionId}`);
    
    // If we don't have a callId but we have a callSid, try to look up the call
    if (!callId && callSid) {
      const { data: callData } = await supabase
        .from('predictive_dialer_calls')
        .select('id')
        .eq('twilio_call_sid', callSid)
        .maybeSingle();
        
      if (callData) {
        console.log(`Found call ID ${callData.id} for Twilio SID ${callSid}`);
        callId = callData.id;
      } else {
        console.log(`No existing call found for Twilio SID ${callSid}`);
      }
    }
    
    let call: any = null;
    
    // Get the call record if callId exists
    if (callId) {
      const { data: callRecord, error: callError } = await supabase
        .from('predictive_dialer_calls')
        .select('*, contact:contact_id(*), agent:agent_id(*), session_id')
        .eq('id', callId)
        .single();
        
      if (callError || !callRecord) {
        console.error(`Call not found: ${callError?.message}`);
      } else {
        call = callRecord;
        
        // If the call has a session_id but we don't, use it
        if (call.session_id && !sessionId) {
          sessionId = call.session_id;
          console.log(`Using session ID ${sessionId} from call record`);
        }
      }
    }
    
    // If we have a call but no session_id, try to get one from the dialing_sessions table
    if (call && !sessionId) {
      console.error('No session_id associated with this call:', callId);
      
      // Try to get the session_id from the dialing_sessions table
      const { data: sessionData } = await supabase
        .from('dialing_sessions')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (sessionData && sessionData.length > 0) {
        sessionId = sessionData[0].id;
        console.log(`Found most recent session ${sessionId}, associating with call ${callId}`);
        
        // Update the call with the session_id if it exists
        if (callId) {
          await supabase
            .from('predictive_dialer_calls')
            .update({
              session_id: sessionId
            })
            .eq('id', callId);
            
          if (call) call.session_id = sessionId;
        }
      } else {
        console.error('Could not find any dialing sessions to associate with call');
        sessionId = 'default-session';
      }
    } else if (!sessionId) {
      // Last resort - use default session ID
      sessionId = 'default-session';
      console.log('Using default session ID: default-session');
    }
    
    // Create a call status update for real-time tracking
    const statusUpdate = {
      callSid: callSid || `unknown-${Date.now()}`,
      status: callStatus || 'unknown',
      timestamp: Date.now(),
      agentId: call?.agent_id,
      leadId: call?.contact_id,
      phoneNumber: call?.contact?.phone_number || phoneNumber || 'unknown',
      leadName: call?.contact?.name || 'Unknown',
      duration: callDuration ? parseInt(callDuration) : undefined,
      company: call?.contact?.company
    };
    
    console.log(`Created status update: ${JSON.stringify(statusUpdate)}`);
    
    // Try to store the call status update in Supabase table
    try {
      console.log(`Inserting status update into call_status_updates for session ${sessionId} with status ${callStatus}`);
      
      const { data, error } = await supabase
        .from('call_status_updates')
        .insert({
          call_sid: callSid || `unknown-${Date.now()}`,
          session_id: sessionId,
          status: callStatus || 'unknown',
          timestamp: new Date().toISOString(),
          data: statusUpdate
        });
        
      if (error) {
        console.error('Error writing to call_status_updates table:', error);
        // If the database write fails, use the memory store
        storeCallStatusUpdate(sessionId, statusUpdate);
        console.log(`Stored in memory instead for session: ${sessionId}`);
      } else {
        console.log('Successfully wrote call status update to database:', data);
      }
    } catch (dbError) {
      console.error('Error writing to call_status_updates table, using memory store instead:', dbError.message);
      // If the database write fails, use the memory store
      storeCallStatusUpdate(sessionId, statusUpdate);
      console.log(`Stored in memory due to error for session: ${sessionId}`);
    }
    
    // If we've got a real callId and call status, process status updates
    if (callId && callStatus && call) {
      // Update call status based on Twilio webhook
      switch(callStatus) {
        case 'completed':
        case 'busy':
        case 'no-answer':
        case 'failed':
        case 'canceled':
          // Call ended, update the record
          await supabase
            .from('predictive_dialer_calls')
            .update({
              status: 'completed',
              end_timestamp: new Date().toISOString(),
              duration: callDuration ? parseInt(callDuration) : null
            })
            .eq('id', callId);
            
          // If there was an agent assigned, update their status
          if (call.agent_id) {
            await supabase
              .from('predictive_dialer_agents')
              .update({
                status: 'available',
                current_call_id: null
              })
              .eq('id', call.agent_id);
          }
          
          // Update contact status if needed
          if (call.contact_id) {
            let contactStatus = 'contacted';
            
            if (callStatus === 'no-answer') {
              contactStatus = 'no_answer';
            } else if (callStatus === 'busy' || callStatus === 'failed') {
              contactStatus = 'not_contacted'; // Could retry later
            }
            
            await supabase
              .from('predictive_dialer_contacts')
              .update({
                status: contactStatus,
                last_call_timestamp: new Date().toISOString()
              })
              .eq('id', call.contact_id);
          }
          
          // Remove from queue if it was there
          await supabase
            .from('predictive_dialer_call_queue')
            .delete()
            .eq('call_id', callId);
          
          break;
          
        case 'in-progress':
          // Call is connected
          await supabase
            .from('predictive_dialer_calls')
            .update({
              status: 'in_progress'
            })
            .eq('id', callId);
          break;
          
        default:
          // For other statuses (ringing, queued, etc.), just log
          console.log(`Received status update: ${callStatus} for call ${callId}`);
      }
    }
    
    // Return minimal response that Twilio expects
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in predictive-dialer-webhook function:', error);
    
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200, // Return 200 even for errors to avoid Twilio retries
    });
  }
});
