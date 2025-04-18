
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
    // Import Twilio as a module with proper ESM syntax
    const twilioModule = await import('npm:twilio@4.10.0');
    const twilio = twilioModule.default;
    
    // Get our variables from the request body or query params
    let params;
    
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        params = await req.json();
      } else {
        const formData = await req.formData();
        params = Object.fromEntries(formData.entries());
      }
    } else {
      const url = new URL(req.url);
      params = Object.fromEntries(url.searchParams.entries());
    }
    
    console.log("Received params:", params);
    
    // Create a TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Check what the user wants to do based on the request parameters
    if (params.To) {
      // If there's a "To" parameter, the user is making an outgoing call
      console.log(`Outbound call to: ${params.To}`);
      
      // Create a <Dial> action to connect the call
      const dial = twiml.dial({
        callerId: params.From || Deno.env.get('TWILIO_PHONE_NUMBER'),
        // Add recording, timeLimit, or other options here if needed
      });
      
      if (params.To.startsWith('client:')) {
        // Call to another browser client
        dial.client(params.To.replace('client:', ''));
      } else {
        // Call to a phone number
        dial.number(params.To);
      }
    } else {
      // Handle incoming calls
      console.log("Incoming call received");
      
      // Answer with a welcome message
      twiml.say(
        { voice: 'alice' },
        'Welcome to my Twilio app. This call is being handled by a Supabase Edge Function.'
      );
      
      // Play some DTMF tones for effect
      twiml.play({ digits: '5' });
      
      // Add a short pause
      twiml.pause({ length: 1 });
      
      // Add more TwiML elements as needed
      twiml.say(
        { voice: 'alice' },
        'Have a nice day!'
      );
    }
    
    console.log("Generated TwiML:", twiml.toString());
    
    // Return the TwiML response
    return new Response(twiml.toString(), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
    
  } catch (error) {
    console.error('Error in Twilio Voice function:', error);
    
    // Create a simple error response in TwiML format
    // Import Twilio if we need to create TwiML
    try {
      const twilioModule = await import('npm:twilio@4.10.0');
      const twilio = twilioModule.default;
      
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say(
        { voice: 'alice' },
        'Sorry, there was an error processing your request.'
      );
      
      return new Response(twiml.toString(), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/xml'
        },
        status: 500,
      });
    } catch (twimlError) {
      // If even creating TwiML fails, return a plain error response
      return new Response(JSON.stringify({ 
        error: error.message || 'An unknown error occurred' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
  }
});
