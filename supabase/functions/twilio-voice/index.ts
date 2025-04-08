
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

// Debugging helper function
function debugTwiML(twiml: any) {
  try {
    const twimlString = twiml.toString();
    console.log("Generated TwiML:", twimlString);
    
    // Validate TwiML structure
    if (!twimlString.includes("<Response>")) {
      console.warn("WARNING: TwiML does not contain <Response> tag!");
    }
    
    return twimlString;
  } catch (err) {
    console.error("Error debugging TwiML:", err);
    throw err;
  }
}

// Name of the conference room
const CONFERENCE_ROOM_PREFIX = "Conference_Room_";
const DEFAULT_HOLD_MUSIC = "https://assets.twilio.com/resources/hold-music.mp3";

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

    // Special handling for browser client call request
    if (!action && requestData.phoneNumber) {
      action = 'incomingCall';
      console.log("Detected browser client call request with phoneNumber:", requestData.phoneNumber);
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

    // If no action is specified at all, handle as a direct client call
    // This is crucial for browser client initiated calls
    if (!action) {
      console.log("No action specified, handling as a potential client-initiated call");
      
      // Extract any parameters that might have been sent
      const phoneNumber = requestData.phoneNumber || requestData.params?.phoneNumber || requestData.To || url.searchParams.get('phoneNumber');
      const leadId = requestData.leadId || requestData.params?.leadId || url.searchParams.get('leadId');
      
      console.log(`Extracted phoneNumber: ${phoneNumber}, leadId: ${leadId}`);
      
      if (phoneNumber) {
        console.log(`Will dial out to: ${phoneNumber}`);
        
        // Format phone number if needed
        let formattedPhoneNumber = phoneNumber;
        if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
          formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
          console.log(`Formatted phone number: ${formattedPhoneNumber}`);
        }
        
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("Please wait while we connect your call.");
        
        const dial = twiml.dial({
          callerId: TWILIO_PHONE_NUMBER,
          timeout: 20,
          action: `https://${req.headers.get('host')}/functions/v1/twilio-voice?action=dialStatus&leadId=${leadId || ''}`,
          method: 'POST'
        });
        
        dial.number({
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallback: `https://${req.headers.get('host')}/functions/v1/twilio-voice?action=statusCallback&leadId=${leadId || ''}`,
          statusCallbackMethod: 'POST'
        }, formattedPhoneNumber);
        
        console.log("Returning TwiML response for direct dialing");
        const twimlString = debugTwiML(twiml);
        
        return new Response(twimlString, { 
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' } 
        });
      } else {
        // If no phone number given
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("No phone number was provided. Please try your call again.");
        
        return new Response(twiml.toString(), { 
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' } 
        });
      }
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
    
    // Handle inbound voice request from the Browser client
    if (action === 'incomingCall') {
      console.log("Processing incoming call from browser client");
      
      // Extract the desired phone number to call (likely passed as a parameter)
      const phoneNumber = requestData.phoneNumber || requestData.To || requestData.Digits;
      const params = requestData.params || {};
      const leadId = params.leadId || requestData.leadId;
      
      if (phoneNumber) {
        console.log(`Will dial out to: ${phoneNumber}, Lead ID: ${leadId || 'none'}`);
        
        // Format phone number if needed
        let formattedPhoneNumber = phoneNumber;
        if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
          formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
          console.log(`Formatted phone number: ${formattedPhoneNumber}`);
        }
        
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("Please wait while we connect your call.");
        
        const dial = twiml.dial({
          callerId: TWILIO_PHONE_NUMBER,
          timeout: 30,
          action: `https://${req.headers.get('host')}/functions/v1/twilio-voice?action=dialStatus&leadId=${leadId || ''}`,
          method: 'POST'
        });
        
        dial.number({
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallback: `https://${req.headers.get('host')}/functions/v1/twilio-voice?action=statusCallback&leadId=${leadId || ''}`,
          statusCallbackMethod: 'POST'
        }, formattedPhoneNumber);
        
        console.log("Returning TwiML response for browser client");
        const twimlString = debugTwiML(twiml);
        
        // Return TwiML response
        return new Response(twimlString, { 
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' } 
        });
      } else {
        // If no phone number given, just add the user to a waiting state
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("No phone number was provided. Please try your call again.");
        
        return new Response(twiml.toString(), { 
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' } 
        });
      }
    }
    
    // Handle different actions
    if (action === 'makeCall') {
      // Make an outbound call
      const { phoneNumber, browserClientName, leadId } = requestData;
      
      if (!phoneNumber) {
        return new Response(
          JSON.stringify({ success: false, error: 'Phone number is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        console.log(`Making call to ${phoneNumber} using phone number ${TWILIO_PHONE_NUMBER}`);
        console.log(`Browser client name: ${browserClientName || 'not provided'}`);
        console.log(`Lead ID: ${leadId || 'not provided'}`);
        
        // Format phone number to ensure it has + and only digits
        let formattedPhoneNumber = phoneNumber;
        if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
          formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
          console.log(`Formatted phone number: ${formattedPhoneNumber}`);
        }
        
        // We need to use a PUBLIC URL for both TwiML and WebSocket
        // Using a proper public URL ensures Twilio can reach our functions
        const PUBLIC_URL = "https://imrmboyczebjlbnkgjns.supabase.co";
        
        // Create a unique conference ID for this call
        const conferenceName = `${CONFERENCE_ROOM_PREFIX}${Date.now()}`;
        console.log(`Created conference room: ${conferenceName}`);
        
        // Check if we need to make a call with browser client involved
        if (browserClientName) {
          console.log(`Connecting browser client: ${browserClientName} with phone: ${formattedPhoneNumber}`);
          
          // Create a VoiceResponse for the browser client that will join a conference
          const browserTwiml = new twilio.twiml.VoiceResponse();
          browserTwiml.say("Connecting you to the call...");
          
          // Create a Dial with conference
          const dial = browserTwiml.dial();
          
          // Configure the conference
          dial.conference(
            conferenceName,
            {
              statusCallback: `${PUBLIC_URL}/functions/v1/twilio-voice?action=conferenceStatus`,
              statusCallbackEvent: ['start', 'end', 'join', 'leave'],
              startConferenceOnEnter: true,
              endConferenceOnExit: false,
              waitUrl: DEFAULT_HOLD_MUSIC,
              beep: true,
              record: 'false'
            }
          );
          
          // Debug the generated browser TwiML
          const browserTwimlString = debugTwiML(browserTwiml);
          
          // Make the call to the browser client first to join the conference
          const browserCall = await client.calls.create({
            to: `client:${browserClientName}`,
            from: TWILIO_PHONE_NUMBER,
            twiml: browserTwimlString,
            statusCallback: `${PUBLIC_URL}/functions/v1/twilio-voice?action=statusCallback`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST',
          });
          
          console.log(`Browser call initiated with SID: ${browserCall.sid} to client:${browserClientName}`);
          
          // Now make a second call to join the phone to the same conference
          const phoneTwiml = new twilio.twiml.VoiceResponse();
          phoneTwiml.say("You're being connected to a call.");
          
          // Add the phone to the same conference
          const phoneDialer = phoneTwiml.dial();
          phoneDialer.conference(
            conferenceName,
            {
              statusCallback: `${PUBLIC_URL}/functions/v1/twilio-voice?action=conferenceStatus`,
              statusCallbackEvent: ['start', 'end', 'join', 'leave'],
              startConferenceOnEnter: true,
              endConferenceOnExit: true,
              waitUrl: DEFAULT_HOLD_MUSIC,
              beep: true
            }
          );
          
          // Debug the generated phone TwiML
          const phoneTwimlString = debugTwiML(phoneTwiml);
          
          // Make the call to the phone to join the conference
          const phoneCall = await client.calls.create({
            to: formattedPhoneNumber,
            from: TWILIO_PHONE_NUMBER,
            twiml: phoneTwimlString,
            statusCallback: `${PUBLIC_URL}/functions/v1/twilio-voice?action=statusCallback`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST',
          });
          
          console.log(`Phone call initiated with SID: ${phoneCall.sid} to ${formattedPhoneNumber}`);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              browserCallSid: browserCall.sid,
              phoneCallSid: phoneCall.sid,
              conferenceName: conferenceName,
              leadId: leadId
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Just make a direct outbound call to the phone
          console.log(`Making direct call to ${formattedPhoneNumber}`);
          
          // Create simple TwiML for direct call
          const twiml = new twilio.twiml.VoiceResponse();
          twiml.say("Hello! This is a test call from your Power Dialer.");
          twiml.pause({ length: 1 });
          twiml.say("If you can hear this message, your outbound calling is working correctly.");
          
          // Debug the generated TwiML
          const twimlString = debugTwiML(twiml);
          
          // Place the call directly
          const call = await client.calls.create({
            to: formattedPhoneNumber,
            from: TWILIO_PHONE_NUMBER,
            twiml: twimlString,
            statusCallback: `${PUBLIC_URL}/functions/v1/twilio-voice?action=statusCallback`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST',
          });
          
          console.log(`Direct outbound call initiated with SID: ${call.sid} to ${formattedPhoneNumber}`);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              callSid: call.sid,
              message: "Direct outbound call placed",
              leadId: leadId
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.error("Error making call:", error);
        
        return new Response(
          JSON.stringify({ success: false, error: error.message || "Failed to make call" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } 
    else if (action === 'conferenceStatus') {
      // Log the conference status updates
      console.log("Conference status update received:");
      console.log(JSON.stringify(requestData, null, 2));
      
      // Return empty TwiML for status callbacks
      const twiml = new twilio.twiml.VoiceResponse();
      return new Response(twiml.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
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
      
      // Only add Say element for completed status - for other statuses, return empty response
      if (callStatus === 'completed') {
        twimlResponse.say("Thank you for using our service. Goodbye.");
      }
      
      return new Response(twimlResponse.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
    else if (action === 'dialStatus') {
      console.log("Dial status callback received:");
      console.log(JSON.stringify(requestData, null, 2));
      
      const dialCallStatus = requestData.DialCallStatus;
      
      const twiml = new twilio.twiml.VoiceResponse();
      
      if (dialCallStatus === 'completed') {
        twiml.say("The call has ended. Thank you for using our service.");
      } else {
        twiml.say(`The call status is ${dialCallStatus || 'unknown'}. Goodbye.`);
      }
      
      return new Response(twiml.toString(), {
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
