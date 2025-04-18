
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("Twilio Voice function loaded");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const body = await req.text();
    console.log("Request body:", body);
    
    // Parse the form-urlencoded data from Twilio
    const params = new URLSearchParams(body);
    console.log("Parsed parameters:", Object.fromEntries(params.entries()));
    
    // Get the Twilio direction (inbound or outbound) and To parameter
    const direction = params.get('Direction') || 'outbound';
    const to = params.get('To') || '';
    const from = params.get('From') || '';
    
    console.log(`Call direction: ${direction}, To: ${to}, From: ${from}`);
    
    // Construct a TwiML response
    let twiml = '';
    
    if (direction === 'inbound') {
      // For incoming calls to Twilio number
      twiml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Thank you for calling. This is a test Twilio application.</Say>
          <Pause length="1"/>
          <Say voice="alice">Goodbye!</Say>
          <Hangup/>
        </Response>
      `;
    } else {
      // For outgoing calls initiated from our app
      twiml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Dial callerId="${from}">${to}</Dial>
        </Response>
      `;
    }
    
    console.log("Sending TwiML response:", twiml);
    
    // Send the TwiML response back to Twilio
    return new Response(twiml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  } catch (error) {
    console.error("Error in Twilio Voice function:", error);
    
    // Even in case of error, we need to return a valid TwiML response
    const errorTwiml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Sorry, an error occurred processing your call.</Say>
        <Hangup/>
      </Response>
    `;
    
    return new Response(errorTwiml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  }
});
