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
    
    // Clone request to safely read body multiple times if needed
    const reqClone = req.clone();
    
    // Parse request data
    let requestData: Record<string, any> = {};
    
    // Check content type to determine how to parse the body
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        // Parse JSON data
        requestData = await reqClone.json();
        console.log("Parsed JSON request data:", JSON.stringify(requestData).substring(0, 200));
      } catch (e) {
        console.error("Failed to parse JSON body:", e);
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data
      try {
        const formText = await reqClone.text();
        console.log("Received form data:", formText.substring(0, 200) + (formText.length > 200 ? '...' : ''));
        
        const params = new URLSearchParams(formText);
        params.forEach((value, key) => {
          requestData[key] = value;
        });
        
        console.log("Parsed form data:", Object.keys(requestData).length, "fields");
      } catch (e) {
        console.error("Failed to parse form data:", e);
      }
    } else {
      // Try to parse as text and check if it can be processed
      try {
        const text = await reqClone.text();
        console.log("Received text:", text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        
        if (text && text.trim()) {
          try {
            // Try parsing as JSON
            requestData = JSON.parse(text);
            console.log("Successfully parsed text as JSON");
          } catch (e) {
            // If not JSON, try parsing as form data
            console.log("Not JSON, trying to parse as form data");
            const params = new URLSearchParams(text);
            params.forEach((value, key) => {
              requestData[key] = value;
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse request body:", e);
      }
    }
    
    console.log("Action from URL params:", url.searchParams.get('action'));
    console.log("Action from request body:", requestData.action);
    
    // Check for Twilio callback data
    const callSid = requestData.CallSid;
    const callStatus = requestData.CallStatus;
    
    // If this is a Twilio status callback (has CallSid but no action)
    if (callSid && !action) {
      console.log(`Detected Twilio status callback for call ${callSid} with status: ${callStatus}`);
      action = 'statusCallback';
    }
    
    console.log("Final action being used:", action || requestData.action);

    // If no action in URL, try to get it from the request body
    if (!action && requestData.action) {
      action = requestData.action;
    }
    
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

    // Initialize Twilio client
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // If this appears to be a Twilio webhook request with no action specified,
    // return a valid TwiML response
    if (callSid && !action) {
      console.log("Handling Twilio webhook with no action specified");
      
      // Create a TwiML response using the Voice Response object
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Add some welcome message
      twiml.say("Thank you for calling. This is an automated response.");
      
      // Return the TwiML as XML with the correct content type
      return new Response(twiml.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
    
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
        
        // We need to use a PUBLIC URL for both TwiML and WebSocket
        // Using a proper public URL ensures Twilio can reach our functions
        const PUBLIC_URL = "https://imrmboyczebjlbnkgjns.supabase.co";
        
        // For WebSocket, we must use wss:// protocol
        const streamUrl = `wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream`;
        console.log(`Using stream URL: ${streamUrl}`);
        
        const call = await client.calls.create({
          to: phoneNumber,
          from: TWILIO_PHONE_NUMBER,
          url: `${PUBLIC_URL}/functions/v1/twilio-voice?action=handleVoice&phoneNumber=${encodeURIComponent(phoneNumber)}&streamUrl=${encodeURIComponent(streamUrl)}`,
          // NO SPECIAL PARAMS IN THE STATUS CALLBACK URL - keeping it simple:
          statusCallback: `${PUBLIC_URL}/functions/v1/twilio-voice`,
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
      
      if (!streamUrl) {
        console.error("No stream URL provided in handleVoice action");
        return new Response(
          JSON.stringify({ success: false, error: 'Stream URL is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Create TwiML for the call using the Voice Response object
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Add some initial audio playback
      twiml.say("Hello! This call is being processed by our system. Please wait while we connect you.");
      
      // Add a pause to keep the call open
      twiml.pause({ length: 2 });
      
      // Using Connect with a Stream
      const connect = twiml.connect();
      connect.stream({
        url: streamUrl,
        track: "both_tracks"
      });
      
      // Add a pause to keep the call open if needed
      twiml.pause({ length: 30 });
      
      // Add another message
      twiml.say("Still connected. The audio stream should be active.");
      
      // Add another long pause to keep the call open
      twiml.pause({ length: 60 });
      
      // Final message before hanging up
      twiml.say("Thank you for testing the audio streaming. Goodbye!");
      
      const generatedTwiML = twiml.toString();
      console.log("Generated TwiML:", generatedTwiML);
      
      return new Response(generatedTwiML, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
    else if (action === 'statusCallback' || (!action && requestData.CallSid)) {
      // Handle call status callbacks with improved error handling
      console.log("Status callback received");
      
      let callbackData: Record<string, any> = {};
      
      // Extract data from both URL query parameters and request body
      url.searchParams.forEach((value, key) => {
        callbackData[key] = value;
      });
      
      // Merge with request data
      callbackData = { ...callbackData, ...requestData };
      
      const callStatus = callbackData.CallStatus;
      const callSid = callbackData.CallSid;
      
      console.log(`Call ${callSid} status: ${callStatus}`);
      console.log("Status callback parameters:", callbackData);
      
      // Return a valid TwiML response (properly formatted XML)
      const twimlResponse = new twilio.twiml.VoiceResponse();
      return new Response(twimlResponse.toString(), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
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
    else if (action === 'endCall') {
      // End an active call
      const { callSid } = requestData;
      
      if (!callSid) {
        return new Response(
          JSON.stringify({ success: false, error: 'Call SID is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        console.log(`Ending call ${callSid}`);
        
        await client.calls(callSid).update({ status: 'completed' });
        
        return new Response(
          JSON.stringify({ success: true, message: 'Call ended' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error(`Error ending call ${callSid}:`, error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    else if (action === 'getConfig') {
      // Return Twilio configuration
      console.log('Returning Twilio configuration');
      return new Response(
        JSON.stringify({ 
          twilioPhoneNumber: TWILIO_PHONE_NUMBER,
          success: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else {
      // Default TwiML response - Always return valid TwiML for Twilio callbacks
      // even when the action is unknown
      console.log("No specific action matched, returning default TwiML response");
      
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("This is a default response from your application.");
      
      return new Response(twiml.toString(), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
  } catch (error) {
    console.error('Error in function:', error);
    
    // Return a simple valid TwiML response for error cases to avoid Twilio errors
    const errorTwiml = new twilio.twiml.VoiceResponse();
    errorTwiml.say("We're sorry, an error occurred with this call.");
    
    return new Response(errorTwiml.toString(), {
      status: 200, // Return 200 even on error to prevent Twilio error loops
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });
  }
});
