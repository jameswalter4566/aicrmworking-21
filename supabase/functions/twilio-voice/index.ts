
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("Twilio voice function loaded");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Import twilio as a module with proper ESM syntax
    const twilioModule = await import('npm:twilio@4.10.0');
    const twilio = twilioModule.default;
    
    // Create TwiML response
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    
    // Get request body
    const body = await req.json().catch(() => ({}));
    console.log("Received request body:", JSON.stringify(body));
    
    // Default response if no specific parameters are provided
    twiml.say({
      voice: 'Polly.Matthew-Neural',
    }, 'Thank you for calling. This is a response from the Twilio Voice Edge Function.');
    
    // Outputting the generated TwiML as a string
    const twimlString = twiml.toString();
    console.log("Generated TwiML response:", twimlString);
    
    // Return TwiML response to Twilio
    return new Response(twimlString, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  } catch (error) {
    console.error('Error in Twilio voice function:', error);
    
    // Return a properly formatted error response for Twilio
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Sorry, an error occurred processing your request. Please try again later.</Say>
      </Response>`,
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/xml' 
        },
        status: 500 
      }
    );
  }
});
