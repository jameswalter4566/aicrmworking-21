import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import twilio from 'npm:twilio@4.23.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
};

console.log("Twilio Token function loaded and ready");

serve(async (req) => {
  console.log(`Received ${req.method} request to Twilio Voice function`);
  console.log(`Request URL: ${req.url}`);
  
  // Log all headers for debugging
  const headerEntries = [...req.headers.entries()];
  console.log(`Request headers (${headerEntries.length}):`, JSON.stringify(headerEntries));
  
  // Handle preflight requests properly
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request");
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Extract action from URL or request body
    const url = new URL(req.url);
    let action = url.searchParams.get('action');
    
    // Parse request data
    let requestData = {};
    try {
      const text = await req.text();
      console.log("Received text:", text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      if (text && text.trim()) {
        try {
          requestData = JSON.parse(text);
          
          // If no action in URL, try to get it from the request body
          if (!action && requestData.action) {
            action = requestData.action;
          }
        } catch (e) {
          // If parsing as JSON fails, it might be form data
          console.log("Not JSON, trying to parse as form data");
          const formData = new URLSearchParams(text);
          formData.forEach((value, key) => {
            // @ts-ignore
            requestData[key] = value;
          });
        }
      }
    } catch (e) {
      console.error("Failed to parse request body:", e);
    }
    
    console.log("Action from URL params:", url.searchParams.get('action'));
    console.log("Action from request body:", requestData.action);
    console.log("Final action being used:", action);

    // Get Twilio credentials
    console.log("Attempting to retrieve Twilio credentials from environment");
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
    const TWILIO_API_SECRET = Deno.env.get('TWILIO_API_SECRET');
    const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    console.log("Environment variables loaded:", {
      accountSidAvailable: !!TWILIO_ACCOUNT_SID,
      authTokenAvailable: !!TWILIO_AUTH_TOKEN,
      apiKeyAvailable: !!TWILIO_API_KEY,
      apiSecretAvailable: !!TWILIO_API_SECRET,
      twimlAppSidAvailable: !!TWILIO_TWIML_APP_SID,
      phoneNumberAvailable: !!TWILIO_PHONE_NUMBER
    });

    // If no action is specified at all, return an error
    if (!action) {
      console.error("No action specified in request");
      return new Response(
        JSON.stringify({ success: false, error: 'No action specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If requesting configuration
    if (action === 'getConfig') {
      console.log('Returning Twilio configuration');
      return new Response(
        JSON.stringify({ 
          twilioPhoneNumber: TWILIO_PHONE_NUMBER,
          success: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check for required credentials for token generation
    console.log("Checking for required Twilio credentials...");
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error("Missing required Twilio credentials:", {
        accountSidMissing: !TWILIO_ACCOUNT_SID,
        authTokenMissing: !TWILIO_AUTH_TOKEN
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required Twilio credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Twilio client
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Handle different actions
    if (action === 'makeCall') {
      // Make an outbound call
      const { phoneNumber } = requestData;
      
      if (!phoneNumber) {
        return new Response(
          JSON.stringify({ success: false, error: 'Phone number is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        console.log(`Making call to ${phoneNumber}`);
        
        const streamUrl = requestData.streamUrl || `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream`;
        console.log(`Using stream URL: ${streamUrl}`);
        
        const call = await client.calls.create({
          to: phoneNumber,
          from: TWILIO_PHONE_NUMBER,
          url: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=handleVoice&phoneNumber=${encodeURIComponent(phoneNumber)}&streamUrl=${encodeURIComponent(streamUrl)}`,
          statusCallback: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=statusCallback`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST',
          machineDetection: 'DetectMessageEnd',
          machineDetectionTimeout: 30,
          timeout: 30,
          record: true,
          trim: 'trim-silence',
          transcribe: false,
        });
        
        console.log(`Call initiated with SID: ${call.sid}`);
        
        return new Response(
          JSON.stringify({ success: true, callSid: call.sid }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error("Error making call:", error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } 
    else if (action === 'handleVoice') {
      // Handle TwiML generation for voice call
      const phoneNumber = url.searchParams.get('phoneNumber');
      const streamUrl = url.searchParams.get('streamUrl');
      
      console.log(`Generating TwiML for call to ${phoneNumber}`);
      console.log(`Stream URL: ${streamUrl}`);
      
      // Parse form data if available
      let formData = {};
      if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
        const formText = await req.text();
        const params = new URLSearchParams(formText);
        params.forEach((value, key) => {
          // @ts-ignore
          formData[key] = value;
        });
        console.log("Call parameters from form:", formData);
      }
      
      // Create TwiML for the call
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Add some audio playback
      twiml.say("Hello! This call is being processed by our system. Please wait while we connect you.");
      
      // Add a pause to keep the call open
      twiml.pause({ length: 2 });
      
      // Using standard <Connect> with a websocket
      if (streamUrl) {
        console.log("Setting up websocket connection");
        
        // Use Connect verb for websocket
        const connect = twiml.connect();
        connect.stream({ url: streamUrl });
        
        // Add pause to keep the call open
        twiml.pause({ length: 30 });
        
        // Add another message
        twiml.say("Still connected. The audio stream should be active.");
        
        // Add another long pause to keep the call open
        twiml.pause({ length: 60 });
        
        // Final message before hanging up
        twiml.say("Thank you for testing the audio streaming. Goodbye!");
      } else {
        twiml.say("Sorry, we encountered a technical issue. Please try again later.");
      }
      
      console.log("Generated TwiML:", twiml.toString());
      
      return new Response(twiml.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
    else if (action === 'statusCallback') {
      // Handle call status callbacks
      console.log("Status callback received, parsing form data");
      
      let callbackData = {};
      if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
        const formText = await req.text();
        const params = new URLSearchParams(formText);
        params.forEach((value, key) => {
          // @ts-ignore
          callbackData[key] = value;
        });
      }
      
      const callStatus = callbackData.CallStatus || requestData.CallStatus;
      const callSid = callbackData.CallSid || requestData.CallSid;
      
      console.log(`Call ${callSid} status: ${callStatus}`);
      console.log("Status callback parameters:", callbackData);
      
      return new Response(
        JSON.stringify({ success: true, message: `Call status recorded: ${callStatus}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else if (action === 'checkStatus') {
      // Check the status of a call
      const { callSid } = requestData;
      
      if (!callSid) {
        return new Response(
          JSON.stringify({ success: false, error: 'Call SID is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        console.log(`Checking status for call ${callSid}`);
        
        const call = await client.calls(callSid).fetch();
        
        return new Response(
          JSON.stringify({ success: true, status: call.status }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error(`Error checking status for call ${callSid}:`, error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    else {
      // Default response for unknown actions
      return new Response(
        JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
