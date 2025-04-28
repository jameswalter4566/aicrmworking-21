
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  console.log("Hangup-call function invoked with URL:", req.url);
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Received request body:", JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      throw new Error('Invalid JSON request body');
    }
    
    const { callSid, userId } = requestBody;

    if (!callSid) {
      console.error("Error: No callSid provided in request");
      throw new Error('Call SID is required');
    }

    console.log(`Attempting to end call ${callSid} by user ${userId || 'anonymous'}`);

    // Call Twilio's API to end the call
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls/${callSid}.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    console.log(`Making request to Twilio endpoint: ${twilioEndpoint}`);
    const twilioResponse = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'Status=completed'
    });

    const responseStatus = twilioResponse.status;
    console.log(`Twilio API response status: ${responseStatus}`);
    
    const responseText = await twilioResponse.text();
    console.log(`Twilio API response: ${responseText}`);

    if (!twilioResponse.ok) {
      console.error(`Twilio API error: ${responseStatus} - ${responseText}`);
      throw new Error(`Failed to end call: ${responseText}`);
    }

    // Log the hang-up action
    if (userId) {
      console.log(`Logging hang-up action for call ${callSid} by user ${userId}`);
      
      try {
        const { data, error } = await supabase.from('call_logs').insert({
          call_sid: callSid,
          user_id: userId,
          action: 'hangup',
          timestamp: new Date().toISOString()
        });
        
        if (error) {
          console.error('Error logging call action to database:', error);
        } else {
          console.log('Successfully logged call action to database');
        }
      } catch (dbError) {
        console.error('Error in database operation:', dbError);
      }
    }

    console.log("Successfully ended call");
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Call ended successfully" 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error ending call:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
