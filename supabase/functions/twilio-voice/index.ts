
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import twilio from 'npm:twilio@4.23.0';

// CORS headers
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
    
    // If no action in URL, try to get it from the request body
    if (!action && requestData.action) {
      action = requestData.action;
    }
    
    // Check for Twilio status callback (which doesn't include an action parameter)
    const isStatusCallback = requestData.CallSid && (
      requestData.CallStatus || 
      requestData.CallbackSource === 'call-progress-events' || 
      url.searchParams.get('statusCallback') ||
      requestData.statusCallback
    );

    if (isStatusCallback) {
      console.log("Detected Twilio status callback:", {
        callSid: requestData.CallSid,
        callStatus: requestData.CallStatus,
        callbackSource: requestData.CallbackSource
      });

      action = 'statusCallback';
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

    // If no action is specified at all, return a simple TwiML response
    if (!action) {
      console.log("No action specified, returning default TwiML response");
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("Welcome to the Twilio Voice API. No specific action was requested.");
      
      return new Response(twiml.toString(), { 
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' } 
      });
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
      
      // Return a TwiML response even for this error
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("There was a configuration error with the Twilio credentials.");
      
      return new Response(twiml.toString(), { 
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' } 
      });
    }

    // Initialize Twilio client
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Handle different actions
    if (action === 'makeCall') {
      // Make an outbound call
      const { phoneNumber, browserClientName } = requestData;
      
      if (!phoneNumber) {
        return new Response(
          JSON.stringify({ success: false, error: 'Phone number is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        console.log(`Making call to ${phoneNumber} using phone number ${TWILIO_PHONE_NUMBER}`);
        console.log(`Browser client name: ${browserClientName || 'not provided'}`);
        
        // Format phone number to ensure it has + and only digits
        let formattedPhoneNumber = phoneNumber;
        if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
          formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
          console.log(`Formatted phone number: ${formattedPhoneNumber}`);
        }
        
        // We need to use a PUBLIC URL for both TwiML and WebSocket
        // Using a proper public URL ensures Twilio can reach our functions
        const PUBLIC_URL = "https://imrmboyczebjlbnkgjns.supabase.co";
        
        // For WebSocket, we must use wss:// protocol
        const streamUrl = `wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream`;
        console.log(`Using stream URL: ${streamUrl}`);
        
        // Create a conference call to connect both the browser and the phone
        const conferenceOptions = {
          maxParticipants: 2,
          statusCallback: `${PUBLIC_URL}/functions/v1/twilio-voice?action=statusCallback`,
          statusCallbackEvent: ['join', 'leave', 'end', 'start'],
          endConferenceOnExit: true,
        };

        // First make the outbound call to the phone number
        // Fix: Creating the TwiML response properly without chaining methods
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("Hello! You're receiving a call from the Power Dialer. Please wait while we connect you.");
        twiml.conference('power-dialer-conference', conferenceOptions);
        
        const call = await client.calls.create({
          to: formattedPhoneNumber,
          from: TWILIO_PHONE_NUMBER,
          twiml: twiml.toString(),
          statusCallback: `${PUBLIC_URL}/functions/v1/twilio-voice?action=statusCallback`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST',
        });
        
        // Now if we have a browser client, make a second call to connect that client
        if (browserClientName) {
          console.log(`Connecting browser client: ${browserClientName}`);
          
          // Fix: Creating the browser TwiML response properly without chaining methods
          const browserTwiml = new twilio.twiml.VoiceResponse();
          browserTwiml.say("Connecting you to the call...");
          browserTwiml.conference('power-dialer-conference', conferenceOptions);
          
          const browserCall = await client.calls.create({
            to: `client:${browserClientName}`,
            from: TWILIO_PHONE_NUMBER,
            twiml: browserTwiml.toString(),
            statusCallback: `${PUBLIC_URL}/functions/v1/twilio-voice?action=statusCallback`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST',
          });
          
          console.log(`Browser call initiated with SID: ${browserCall.sid}`);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              callSid: call.sid,
              browserCallSid: browserCall.sid,
              conferenceEnabled: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`Call initiated with SID: ${call.sid}`);
        
        return new Response(
          JSON.stringify({ success: true, callSid: call.sid }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error("Error making call:", error);
        
        return new Response(
          JSON.stringify({ success: false, error: error.message || "Failed to make call" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } 
    else if (action === 'statusCallback' || (!action && requestData.CallSid)) {
      // Handle call status callbacks
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
      
      // Add a specific message based on call status
      if (callStatus) {
        twimlResponse.say(`Call status is ${callStatus}. Thank you for calling.`);
      } else {
        twimlResponse.say("Call status callback received.");
      }
      
      return new Response(twimlResponse.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
    else if (action === 'checkStatus') {
      // Check the status of a call
      const { callSid } = requestData;
      
      if (!callSid) {
        // Return a JSON response for this error
        return new Response(
          JSON.stringify({ success: false, error: "Call SID is required to check call status" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        console.log(`Checking status for call ${callSid}`);
        
        // Handle the case where callSid is "pending-sid"
        if (callSid === 'pending-sid') {
          console.log("Handling pending-sid special case");
          return new Response(
            JSON.stringify({ success: true, status: "pending" }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const call = await client.calls(callSid).fetch();
        console.log(`Call status retrieved: ${call.status} for SID: ${callSid}`);
        
        return new Response(
          JSON.stringify({ success: true, status: call.status }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error(`Error checking status for call ${callSid}:`, error);
        
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    else if (action === 'endCall') {
      // End an active call
      const { callSid } = requestData;
      
      if (!callSid) {
        return new Response(
          JSON.stringify({ success: false, error: "Call SID is required to end a call" }),
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
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    else {
      // Default response for unknown actions
      console.log(`Unknown action: ${action}, returning JSON error response`);
      
      return new Response(
        JSON.stringify({ success: false, error: `The requested action ${action} is not supported.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in function:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'An unexpected error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
