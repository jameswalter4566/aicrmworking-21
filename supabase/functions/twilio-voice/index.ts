
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
        requestData = JSON.parse(text);
        
        // If no action in URL, try to get it from the request body
        if (!action && requestData.action) {
          action = requestData.action;
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
      const formData = await req.formData();
      
      console.log(`Generating TwiML for call to ${phoneNumber}`);
      console.log(`Stream URL: ${streamUrl}`);
      console.log("Call parameters:", Object.fromEntries(formData));
      
      // Create TwiML for the call with proper Media streaming
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Check if we have a stream URL
      if (streamUrl) {
        console.log("Setting up Media stream");
        
        // Add Stream for bidirectional audio - compatible with Voice SDK 2.x
        const stream = twiml.stream({
          url: streamUrl,
          track: 'both_tracks', // Stream both inbound and outbound audio
        });
        
        // Add custom parameters to the stream that will be sent in events
        stream.parameter({
          name: 'callSid',
          value: formData.get('CallSid') || 'unknown',
        });
        
        stream.parameter({
          name: 'phoneNumber',
          value: phoneNumber || 'unknown',
        });
        
        // Add some audio playback
        twiml.say("Hello! This call is being streamed through your browser. You should hear audio now.");
        
        // Also add Dial if you need to connect to another number
        // const dial = twiml.dial();
        // dial.number('+1234567890');
        
        // Add pause to keep the call open
        twiml.pause({ length: 60 });
        
        // And another message
        twiml.say("Still connected. The audio stream should be active.");
        
        // Add another long pause to keep the call open
        twiml.pause({ length: 120 });
        
        // Final message before hanging up
        twiml.say("Thank you for testing the audio streaming. Goodbye!");
      } else {
        twiml.say("Sorry, we encountered a technical issue. Please try again later.");
      }
      
      return new Response(twiml.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
    else if (action === 'statusCallback') {
      // Handle call status callbacks
      const formData = await req.formData();
      const callStatus = formData.get('CallStatus');
      const callSid = formData.get('CallSid');
      
      console.log(`Call ${callSid} status: ${callStatus}`);
      console.log("Status callback parameters:", Object.fromEntries(formData));
      
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
