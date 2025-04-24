
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import twilio from "https://esm.sh/twilio@4.18.1";

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Main function to handle requests
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Twilio client
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
  const twilioClient = twilio(twilioAccountSid, twilioAuthToken);
  
  // To track blacklisted numbers and prevent retries
  const blacklistedNumbers = new Set();
  
  try {
    const url = new URL(req.url);
    const dialAction = url.searchParams.get('dialAction') === 'true';

    if (req.headers.get("content-type")?.includes("application/json")) {
      // Handle JSON requests (used for hangupAll)
      const data = await req.json();
      
      if (data.action === 'hangupAll') {
        console.log('Handling hangupAll request');

        try {
          const calls = await twilioClient.calls.list({ status: 'in-progress', limit: 20 });
          let hungUpCount = 0;

          for (const call of calls) {
            try {
              await twilioClient.calls(call.sid).update({ status: 'completed' });
              hungUpCount++;
            } catch (callError) {
              console.error(`Error hanging up call ${call.sid}:`, callError);
            }
          }

          return new Response(JSON.stringify({
            success: true,
            hungUpCount,
            message: 'Initiated hangup for all active calls'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        } catch (error) {
          console.error('Error listing or updating calls:', error);

          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to hang up calls: ' + (error.message || error)
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unknown action' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    } else {
      // Handle form data (used for TwiML generation)
      console.log('Received request to Twilio Voice function');
      let formData;
      
      try {
        formData = await req.formData();
      } catch (error) {
        console.error('Error parsing form data:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid form data' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      
      // Convert formData to an object for easier access
      const params: Record<string, string> = {};
      for (const [key, value] of formData.entries()) {
        params[key] = value.toString();
      }

      console.log('Received form data request:', JSON.stringify(params));
      
      if (dialAction) {
        // This is a response to a dial action (call completed, not answered, etc.)
        console.log('Processing dial action with status:', params.DialCallStatus);
        
        // If failed with error code 13225, record in blacklisted numbers
        if (params.ErrorCode === '13225' && params.phoneNumber) {
          console.log(`Phone number ${params.phoneNumber} is blacklisted.`);
          blacklistedNumbers.add(params.phoneNumber);
        }
        
        // Return empty TwiML to complete the call
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200,
        });
      } else if (params.phoneNumber) {
        // This is a call from the browser to a phone
        console.log('Processing form outbound call request to:', params.phoneNumber);
        
        // Check for blacklisted number
        if (blacklistedNumbers.has(params.phoneNumber)) {
          console.log(`Blocked attempt to call blacklisted number: ${params.phoneNumber}`);
          return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>This number is blacklisted and cannot be called.</Say></Response>', {
            headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
            status: 200,
          });
        }
        
        console.log(`Form Request: Dialing ${params.phoneNumber} with caller ID: ${twilioPhoneNumber}`);
        
        // Generate TwiML to create the call
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${twilioPhoneNumber}" timeout="30" answerOnBridge="true" action="${url.origin}${url.pathname}?dialAction=true" method="POST"><Number>${params.phoneNumber}</Number></Dial></Response>`;
        
        console.log('Generated TwiML for form request:', twiml);
        
        return new Response(twiml, {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200,
        });
      } else {
        console.error('Missing required parameters');
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Missing required parameters</Say></Response>', {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 400,
        });
      }
    }
  } catch (error) {
    console.error('Error in Twilio Voice function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'An error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
