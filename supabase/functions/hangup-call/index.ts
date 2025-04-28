
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  try {
    console.log("=============== HANGUP FUNCTION INVOKED ===============");
    console.log("REQUEST URL:", req.url);
    console.log("REQUEST METHOD:", req.method);
    console.log("REQUEST HEADERS:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    // Handle CORS
    if (req.method === 'OPTIONS') {
      console.log("HANGUP FUNCTION - Handling CORS preflight request");
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Clone the request to read the body multiple times if needed
      const clonedReq = req.clone();
      
      // Try to get body as text first for logging
      const bodyText = await clonedReq.text();
      console.log("HANGUP FUNCTION - Raw request body:", bodyText);
      
      let requestBody;
      try {
        // Parse the text as JSON
        requestBody = JSON.parse(bodyText);
        console.log("HANGUP FUNCTION - Parsed request body:", JSON.stringify(requestBody, null, 2));
      } catch (parseError) {
        console.error("HANGUP FUNCTION - Error parsing request body:", parseError);
        throw new Error('Invalid JSON request body');
      }
      
      const { callSid, userId } = requestBody;

      if (!callSid) {
        console.error("HANGUP FUNCTION - Error: No callSid provided in request");
        throw new Error('Call SID is required');
      }

      console.log(`HANGUP FUNCTION - Attempting to end call ${callSid} by user ${userId || 'anonymous'}`);

      // Call Twilio's API to end the call
      const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls/${callSid}.json`;
      const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

      console.log(`HANGUP FUNCTION - Making request to Twilio endpoint: ${twilioEndpoint}`);
      console.log(`HANGUP FUNCTION - Using Twilio account SID: ${twilioAccountSid.substring(0, 5)}...`);
      console.log(`HANGUP FUNCTION - Auth token present: ${twilioAuthToken ? 'Yes' : 'No'}`);
      
      try {
        const twilioResponse = await fetch(twilioEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'Status=completed'
        });

        const responseStatus = twilioResponse.status;
        console.log(`HANGUP FUNCTION - Twilio API response status: ${responseStatus}`);
        
        let responseText;
        try {
          responseText = await twilioResponse.text();
          console.log(`HANGUP FUNCTION - Twilio API response: ${responseText}`);
        } catch (textError) {
          console.error("HANGUP FUNCTION - Error reading Twilio response text:", textError);
          responseText = "Error reading response";
        }

        if (!twilioResponse.ok) {
          console.error(`HANGUP FUNCTION - Twilio API error: ${responseStatus} - ${responseText}`);
          throw new Error(`Failed to end call: ${responseText}`);
        }

        // Log the hang-up action
        if (userId) {
          console.log(`HANGUP FUNCTION - Logging hang-up action for call ${callSid} by user ${userId}`);
          
          try {
            const { data, error } = await supabase.from('call_logs').insert({
              call_sid: callSid,
              user_id: userId,
              action: 'hangup',
              timestamp: new Date().toISOString()
            });
            
            if (error) {
              console.error('HANGUP FUNCTION - Error logging call action to database:', error);
            } else {
              console.log('HANGUP FUNCTION - Successfully logged call action to database');
            }
          } catch (dbError) {
            console.error('HANGUP FUNCTION - Error in database operation:', dbError);
          }
        }

        console.log("HANGUP FUNCTION - Successfully ended call");
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
      } catch (twilioError) {
        console.error("HANGUP FUNCTION - Error calling Twilio API:", twilioError);
        throw new Error(`Twilio API error: ${twilioError.message}`);
      }

    } catch (error) {
      console.error('HANGUP FUNCTION - Error ending call:', error);
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
  } catch (outerError) {
    console.error("HANGUP FUNCTION - CRITICAL ERROR IN HANDLER:", outerError);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Critical server error occurred"
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
