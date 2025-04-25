
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
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body:", JSON.stringify(requestBody));
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      throw new Error("Invalid request body: " + parseError.message);
    }
    
    const { callSid, sessionId, forceRefresh } = requestBody;
    console.log(`Fetching call status for SID: ${callSid}, Session: ${sessionId}, Force Refresh: ${forceRefresh}`);
    
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    // Check Twilio credentials
    if (!twilioAccountSid || !twilioAuthToken) {
      console.error("Missing Twilio credentials");
      throw new Error("Missing Twilio credentials. Please check your environment variables.");
    }
    
    // Directly fetch call details from Twilio API
    console.log(`Calling Twilio API for call ${callSid}`);
    let call;
    try {
      call = await twilioClient.calls(callSid).fetch();
      console.log(`Received Twilio data for call ${callSid}:`, JSON.stringify(call, null, 2));
    } catch (twilioError) {
      console.error(`Error fetching call ${callSid} from Twilio API:`, twilioError);
      throw new Error(`Twilio API error: ${twilioError.message}`);
    }
    
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
      try {
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
      } catch (dbError) {
        console.error('Database error storing call status:', dbError);
        // Continue even if there's a database error to ensure we return the call data
      }
    }
    
    // Find associated call record in our database
    if (callSid) {
      console.log(`Looking for call record with Twilio SID ${callSid}`);
      try {
        const { data: callRecord, error: callError } = await supabase
          .from('predictive_dialer_calls')
          .select('*')
          .eq('twilio_call_sid', callSid)
          .maybeSingle();
          
        if (callRecord) {
          console.log(`Found call record:`, JSON.stringify(callRecord, null, 2));
          
          // Update the call status in our database
          const twilioStatus = call.status;
          let internalStatus;
          
          // Map Twilio status to internal status
          if (twilioStatus === 'completed') {
            internalStatus = 'completed';
          } else if (twilioStatus === 'in-progress') {
            internalStatus = 'in_progress';
          } else if (twilioStatus === 'queued') {
            internalStatus = 'queued';
          } else if (twilioStatus === 'ringing') {
            internalStatus = 'in_progress';
          } else if (twilioStatus === 'busy' || twilioStatus === 'failed' || twilioStatus === 'no-answer') {
            internalStatus = 'failed';
          } else {
            internalStatus = twilioStatus;
          }
          
          const { error: updateError } = await supabase
            .from('predictive_dialer_calls')
            .update({
              status: internalStatus,
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
      } catch (findError) {
        console.error('Error finding or updating call record:', findError);
      }
    }
    
    // Also trigger the get-call-updates function to ensure it has the latest data
    try {
      if (sessionId) {
        console.log("🔄 Directly triggering get-call-updates function to push update...");
        
        const triggerBody = JSON.stringify({
          sessionId: sessionId,
          lastTimestamp: 0,
          updateSource: 'webhook_direct',
          lastStatus: call.status,
          callSid: callSid
        });
        
        const triggerResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/get-call-updates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: triggerBody
        });
        
        if (!triggerResponse.ok) {
          const errorText = await triggerResponse.text();
          console.error(`Failed to trigger get-call-updates: ${triggerResponse.status}`, errorText);
        } else {
          console.log('Successfully triggered get-call-updates function');
        }
      }
    } catch (triggerError) {
      console.error('Error triggering get-call-updates function:', triggerError);
    }
    
    // Return the success response with the call data
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
      status: 500,
    });
  }
});
