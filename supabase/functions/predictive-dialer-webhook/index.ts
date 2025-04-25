
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
    
    if (!callId) {
      throw new Error('Call ID is required');
    }
    
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const callStatus = formData.get('CallStatus')?.toString();
    const callSid = formData.get('CallSid')?.toString();
    const callDuration = formData.get('CallDuration')?.toString();
    
    console.log(`Webhook received for call ${callId} with status: ${callStatus}`);
    
    // Get the call record
    const { data: call, error: callError } = await supabase
      .from('predictive_dialer_calls')
      .select('*, contact:contact_id(*), agent:agent_id(*), session_id')
      .eq('id', callId)
      .single();
      
    if (callError || !call) {
      throw new Error(`Call not found: ${callError?.message}`);
    }
    
    // Ensure we have a session_id
    if (!call.session_id) {
      console.error('No session_id associated with this call:', callId);
      
      // Try to get the session_id from the dialing_sessions table
      const { data: sessionData } = await supabase
        .from('dialing_sessions')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (sessionData && sessionData.length > 0) {
        console.log(`Found most recent session ${sessionData[0].id}, associating with call ${callId}`);
        
        // Update the call with the session_id
        await supabase
          .from('predictive_dialer_calls')
          .update({
            session_id: sessionData[0].id
          })
          .eq('id', callId);
          
        call.session_id = sessionData[0].id;
      } else {
        console.error('Could not find any dialing sessions to associate with call');
      }
    } else {
      console.log(`Call ${callId} is associated with session ${call.session_id}`);
    }
    
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
    
    // Create a call status update for real-time tracking
    const statusUpdate = {
      callSid,
      status: callStatus,
      timestamp: Date.now(),
      agentId: call.agent_id,
      leadId: call.contact_id,
      phoneNumber: call.contact?.phone_number,
      leadName: call.contact?.name,
      duration: callDuration ? parseInt(callDuration) : undefined,
      company: call.contact?.company
    };
    
    // Try to store the call status update in Supabase table
    if (call.session_id) {
      try {
        console.log(`Inserting status update into call_status_updates for session ${call.session_id} with status ${callStatus}`);
        
        const { data, error } = await supabase
          .from('call_status_updates')
          .insert({
            call_sid: callSid,
            session_id: call.session_id,
            status: callStatus,
            timestamp: new Date().toISOString(),
            data: statusUpdate
          });
          
        if (error) {
          console.error('Error writing to call_status_updates table:', error);
          // If the database write fails, use the memory store
          storeCallStatusUpdate(call.session_id, statusUpdate);
        } else {
          console.log('Successfully wrote call status update to database:', data);
        }
      } catch (dbError) {
        console.error('Error writing to call_status_updates table, using memory store instead:', dbError.message);
        // If the database write fails, use the memory store
        storeCallStatusUpdate(call.session_id, statusUpdate);
      }
    } else {
      console.warn('No session ID available for this call, cannot store status update');
    }
    
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
