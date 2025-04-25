
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

// Store call status update in memory and database
async function storeCallStatusUpdate(sessionId: string, statusData: any) {
  try {
    console.log(`Storing call status update for session ${sessionId}`);
    
    const { data, error } = await supabase
      .from('call_status_updates')
      .insert({
        call_sid: statusData.callSid,
        session_id: sessionId,
        status: statusData.status,
        timestamp: new Date().toISOString(),
        data: statusData
      });
      
    if (error) {
      console.error('Error storing call status update:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to store call status update:', error);
    throw error;
  }
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
    const sessionId = url.searchParams.get('sessionId');
    
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const callStatus = formData.get('CallStatus')?.toString();
    const callSid = formData.get('CallSid')?.toString();
    const callDuration = formData.get('CallDuration')?.toString();
    
    console.log(`Webhook received for call ${callId} with status: ${callStatus}`);
    console.log(`Session ID from request: ${sessionId}`);
    
    // Get the call record
    const { data: call, error: callError } = await supabase
      .from('predictive_dialer_calls')
      .select('*, contact:contact_id(*), agent:agent_id(*)')
      .eq('id', callId)
      .single();
      
    if (callError || !call) {
      throw new Error(`Call not found: ${callError?.message}`);
    }
    
    // Update call status based on Twilio webhook
    const updates: any = {
      status: callStatus === 'completed' ? 'completed' : 
              callStatus === 'in-progress' ? 'in_progress' : 
              callStatus === 'queued' ? 'queued' : 'failed'
    };
    
    if (sessionId && !call.session_id) {
      updates.session_id = sessionId;
    }
    
    if (callStatus === 'completed') {
      updates.end_timestamp = new Date().toISOString();
      updates.duration = callDuration ? parseInt(callDuration) : null;
    }
    
    // Update the call record
    await supabase
      .from('predictive_dialer_calls')
      .update(updates)
      .eq('id', callId);
      
    // Create status update for real-time tracking
    const statusUpdate = {
      callSid,
      status: callStatus,
      timestamp: Date.now(),
      agentId: call.agent_id,
      contactId: call.contact_id,
      phoneNumber: call.contact?.phone_number,
      leadName: call.contact?.name,
      company: call.contact?.company,
      duration: callDuration ? parseInt(callDuration) : undefined
    };
    
    // Store the status update
    if (sessionId) {
      await storeCallStatusUpdate(sessionId, statusUpdate);
    }
    
    // Return minimal response that Twilio expects
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
    
  } catch (error) {
    console.error('Error in predictive-dialer-webhook:', error);
    
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200, // Return 200 even for errors to avoid Twilio retries
    });
  }
});
