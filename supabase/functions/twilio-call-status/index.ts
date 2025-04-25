
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import twilio from 'https://esm.sh/twilio@4.18.1';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Twilio client
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

// Main function to handle requests
Deno.serve(async (req) => {
  console.log("🔍 TWILIO-CALL-STATUS FUNCTION CALLED");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { callSid, sessionId, forceRefresh } = await req.json();
    console.log(`Fetching call status for SID: ${callSid}, Session: ${sessionId}, Force Refresh: ${forceRefresh}`);
    
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    // Directly fetch call details from Twilio API
    console.log(`Calling Twilio API for call ${callSid}`);
    const call = await twilioClient.calls(callSid).fetch();
    console.log(`Received Twilio data:`, JSON.stringify(call, null, 2));
    
    // Format the call data
    const callData = {
      callSid: call.sid,
      status: call.status,
      direction: call.direction,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
      answeredBy: call.answeredBy,
      from: call.from,
      to: call.to,
      price: call.price,
      timestamp: Date.now()
    };
    
    console.log(`Formatted call data:`, JSON.stringify(callData, null, 2));
    
    // If sessionId is provided, store the call data in the call_status_updates table
    if (sessionId) {
      console.log(`Storing call status update for session ${sessionId}`);
      const { data: insertData, error: insertError } = await supabase
        .from('call_status_updates')
        .insert({
          session_id: sessionId,
          call_sid: callSid,
          status: call.status,
          timestamp: new Date().toISOString(),
          data: callData
        });
        
      if (insertError) {
        console.error('Error storing call status:', insertError);
      } else {
        console.log('Successfully stored call status update');
      }
    }
    
    // Find associated call record in our database
    if (callSid) {
      console.log(`Looking for call record with Twilio SID ${callSid}`);
      const { data: callRecord, error: callError } = await supabase
        .from('predictive_dialer_calls')
        .select('*')
        .eq('twilio_call_sid', callSid)
        .maybeSingle();
        
      if (callRecord) {
        console.log(`Found call record:`, JSON.stringify(callRecord, null, 2));
        
        // Update the call status in our database
        const { error: updateError } = await supabase
          .from('predictive_dialer_calls')
          .update({
            status: call.status === 'completed' ? 'completed' : 
                   call.status === 'in-progress' ? 'in_progress' : 
                   call.status === 'queued' ? 'queued' : call.status,
            duration: call.duration ? parseInt(call.duration) : null,
            end_timestamp: call.endTime ? new Date(call.endTime).toISOString() : null
          })
          .eq('twilio_call_sid', callSid);
          
        if (updateError) {
          console.error('Error updating call record:', updateError);
        } else {
          console.log('Successfully updated call record with latest status');
        }
      } else {
        console.log(`No call record found for SID ${callSid}`);
        if (callError) {
          console.error('Database query error:', callError);
        }
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      data: callData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in twilio-call-status function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || 500,
    });
  }
});
