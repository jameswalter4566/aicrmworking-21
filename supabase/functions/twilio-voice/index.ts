import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import twilio from 'npm:twilio@4.23.0';

// CORS headers for better interoperability
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
};

console.log("Twilio Voice function loaded and ready");

serve(async (req) => {
  console.log(`Received ${req.method} request to Twilio Voice function`);
  console.log(`Request URL: ${req.url}`);
  
  // Handle preflight requests properly
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request");
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error("Missing required Twilio credentials");
      return new Response(
        JSON.stringify({ error: 'Missing required Twilio credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Twilio client
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Parse URL to get query parameters
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    console.log(`Action: ${action || 'none'}`);
    
    // Handle different actions
    if (action === 'makeCall') {
      // Make an outbound call
      const body = await req.json();
      const { phoneNumber } = body;
      
      if (!phoneNumber) {
        return new Response(
          JSON.stringify({ success: false, error: 'Phone number is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        console.log(`Making call to ${phoneNumber}`);
        
        const call = await client.calls.create({
          to: phoneNumber,
          from: TWILIO_PHONE_NUMBER,
          url: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=handleVoice&phoneNumber=${encodeURIComponent(phoneNumber)}&streamUrl=${encodeURIComponent('wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream')}`,
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
      const body = await req.json();
      const { callSid } = body;
      
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
        JSON.stringify({ error: 'Unknown action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
