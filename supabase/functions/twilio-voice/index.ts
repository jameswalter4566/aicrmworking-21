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
const DEFAULT_TIMEOUT = 20; // Reduced from 30 to 20 seconds to get faster no-answer responses

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

      // Log the detailed status
      if (requestData.CallStatus) {
        console.log(`Call ${requestData.CallSid} status: ${requestData.CallStatus}`);
        
        // Special handling for no-answer status
        if (requestData.CallStatus === 'no-answer') {
          console.log(`Call ${requestData.CallSid} was not answered within timeout period`);
        } else if (requestData.CallStatus === 'busy') {
          console.log(`Call ${requestData.CallSid} received busy signal`);
        } else if (requestData.CallStatus === 'failed') {
          console.log(`Call ${requestData.CallSid} failed to connect`);
        }
      }
      
      // For status callbacks, always return a simple TwiML response
      const twimlResponse = new twilio.twiml.VoiceResponse();
      return new Response(twimlResponse.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
    
    // Check if this is a direct call from browser with no action specified
    // IMPORTANT: This detection is key for handling the incoming calls from browser client
    const isClientInitiatedCall = 
      requestData.From && 
      requestData.From.startsWith('client:') && 
      requestData.phoneNumber;
    
    if (isClientInitiatedCall) {
      action = 'clientCall';
      console.log("Detected client-initiated call from:", requestData.From, "to:", requestData.phoneNumber);
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
    
    // Ensure we have a caller ID to use
    if (!TWILIO_PHONE_NUMBER) {
      console.error("Missing TWILIO_PHONE_NUMBER for caller ID");
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("There was a configuration error. The system is missing a phone number to use as caller ID.");
      return new Response(twiml.toString(), { 
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' } 
      });
    }

    // CRITICAL: Handle incoming client calls with phoneNumber parameter
    if (action === 'clientCall' || isClientInitiatedCall) {
      console.log("Handling client-initiated call with phoneNumber");
      
      // Extract phone number and lead ID
      const phoneNumber = requestData.phoneNumber;
      const leadId = requestData.leadId || 'unknown';
      
      if (!phoneNumber) {
        console.error("No phone number provided for outbound call");
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("No phone number was provided. Please try your call again.");
        
        return new Response(twiml.toString(), { 
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' } 
        });
      }
      
      // Format phone number if needed
      let formattedPhoneNumber = phoneNumber;
      if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
        formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
        console.log(`Formatted phone number: ${formattedPhoneNumber}`);
      }
      
      try {
        // Get the host for constructing full URLs
        const host = req.headers.get('host') || '';
        const protocol = req.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = `${protocol}://${host}`;
        
        // Create a unique conference name for this call
        const conferenceName = `${CONFERENCE_ROOM_PREFIX}${Date.now()}_${leadId}`;
        console.log(`Created conference room: ${conferenceName}`);
        
        // Create TwiML for the browser client that ANSWERS THE CALL and puts it in a conference
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("Please wait while we connect your call.");
        
        const dial = twiml.dial({
          answerOnBridge: true,
          callerId: TWILIO_PHONE_NUMBER
        });
        
        // Add the browser client to the conference
        dial.conference({
          statusCallback: `${baseUrl}/functions/v1/twilio-voice?action=conferenceStatus&leadId=${leadId}`,
          statusCallbackEvent: ['start', 'end', 'join', 'leave'],
          startConferenceOnEnter: true,
          endConferenceOnExit: false,
          waitUrl: DEFAULT_HOLD_MUSIC,
          beep: true,
          record: 'false'
        }, conferenceName);
        
        // Now create a second call to join the target phone to the same conference
        if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
          const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
          
          // TwiML for the outbound leg
          const outboundTwiml = new twilio.twiml.VoiceResponse();
          outboundTwiml.say("You're being connected to a call.");
          
          // Join the same conference
          const outboundDial = outboundTwiml.dial();
          outboundDial.conference({
            statusCallback: `${baseUrl}/functions/v1/twilio-voice?action=conferenceStatus&leadId=${leadId}`,
            statusCallbackEvent: ['start', 'end', 'join', 'leave'],
            startConferenceOnEnter: true,
            endConferenceOnExit: true,
            waitUrl: DEFAULT_HOLD_MUSIC,
            beep: true
          }, conferenceName);
          
          try {
            // Create the outbound call
            const call = await client.calls.create({
              to: formattedPhoneNumber,
              from: TWILIO_PHONE_NUMBER,
              twiml: outboundTwiml.toString(),
              statusCallback: `${baseUrl}/functions/v1/twilio-voice?action=statusCallback&leadId=${leadId}`,
              statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
              statusCallbackMethod: 'POST',
            });
            
            console.log(`Initiated outbound call to ${formattedPhoneNumber} with SID: ${call.sid}`);
          } catch (err) {
            console.error("Error initiating outbound call:", err);
            // We'll still return the TwiML for the browser client even if the outbound call fails
            // This ensures the browser client call is answered and not immediately hung up
          }
        }
        
        // Debug the generated TwiML
        const twimlString = debugTwiML(twiml);
        console.log("Returning TwiML response for the browser client:", twimlString);
        
        return new Response(twimlString, { 
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' } 
        });
      } catch (err) {
        console.error("Error generating TwiML for call:", err);
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("Sorry, there was an error connecting your call. Please try again later.");
        
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
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error("Missing required Twilio credentials");
      
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
        const host = req.headers.get('host') || '';
        const protocol = req.headers.get('x-forwarded-proto') || 'https';
        const PUBLIC_URL = `${protocol}://${host}`;
        
        // Create a unique conference ID for this call
        const conferenceName = `${CONFERENCE_ROOM_PREFIX}${Date.now()}_${leadId || 'unknown'}`;
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
            statusCallback: `${PUBLIC_URL}/functions/v1/twilio-voice?action=statusCallback&leadId=${leadId}`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST',
          });
          
          console.log(`Browser call initiated with SID: ${browserCall.sid} to client:${browserClientName}`);
          
          // Now make a second call to join the phone to the same conference
          const phoneTwiml = new twilio.twiml.VoiceResponse();
          phoneTwiml.say("You're being connected to a call.");
          
          // Add the phone to the same conference
          const phoneDialer = phoneTwiml.dial({
            timeout: DEFAULT_TIMEOUT, // Reduced timeout to prevent long waits
          });
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
            statusCallback: `${PUBLIC_URL}/functions/v1/twilio-voice?action=statusCallback&leadId=${leadId}`,
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
            statusCallback: `${PUBLIC_URL}/functions/v1/twilio-voice?action=statusCallback&leadId=${leadId}`,
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
      const leadId = callbackData.leadId || url.searchParams.get('leadId');
      
      console.log(`Call ${callSid} status: ${callStatus} for leadId: ${leadId || 'unknown'}`);
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
      const callId = requestData.callId || 'unknown';
      
      const twiml = new twilio.twiml.VoiceResponse();
      
      if (dialCallStatus === 'completed') {
        twiml.say("The call has ended. Thank you for using our service.");
      } else if (dialCallStatus === 'busy') {
        twiml.say("The number you called is busy. Please try again later.");
        console.log(`CallID ${callId} reported busy status`);
      } else if (dialCallStatus === 'no-answer') {
        twiml.say("There was no answer. Please try again later.");
        console.log(`CallID ${callId} reported no-answer status`);
      } else if (dialCallStatus === 'failed') {
        twiml.say("The call failed to connect. Please check the number and try again.");
      } else {
        twiml.say(`Call status is ${dialCallStatus || 'unknown'}. Goodbye.`);
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
        if (callSid === 'pending-sid' || callSid === 'browser-call') {
          console.log("Handling pending-sid or browser-call special case");
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
        
        if (callSid === 'browser-call') {
          console.log("Special case: 'browser-call' ID detected, returning success without API call");
          return new Response(
            JSON.stringify({ success: true, message: 'Browser call handling managed client-side' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
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
    else if (action === 'hangupAll') {
      // Terminate all active calls for testing/reset purposes
      try {
        console.log("Attempting to hang up all active calls");
        
        // Get all active calls
        const callsList = await client.calls.list({ status: 'in-progress' });
        console.log(`Found ${callsList.length} active calls`);
        
        // Hang up each call
        const hangupPromises = callsList.map(call => 
          client.calls(call.sid).update({ status: 'completed' })
        );
        
        await Promise.all(hangupPromises);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Terminated ${callsList.length} active calls` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error("Error hanging up all calls:", error);
        
        return new Response(
          JSON.stringify({ success: false, error: error.message || 'Failed to hang up all calls' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    else {
      // If no specific action is defined but we have a call coming in, treat it as client call
      if (requestData.From && requestData.From.startsWith('client:')) {
        console.log("Detected basic incoming client call without action");
        
        // Create a TwiML response for this call
        const twiml = new twilio.twiml.VoiceResponse();
        
        // If there's a phone number specified, we should use it
        const phoneNumber = requestData.phoneNumber;
        
        if (!phoneNumber) {
          // No phone number provided, just say something and hang up
          console.log("No target phone number provided");
          twiml.say("No phone number was provided for this call. Please specify a phone number to call.");
          twiml.pause({ length: 1 });
          twiml.hangup();
        } else {
          // There is a phone number, treat like a client call
          console.log(`Handling incoming client call with phone number: ${phoneNumber}`);
          twiml.say("Please wait while we connect your call.");
          
          // Format phone number if needed
          let formattedPhoneNumber = phoneNumber;
          if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
            formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
          }
          
          // Dial the number
          twiml.dial({
            callerId: TWILIO_PHONE_NUMBER,
            timeout: DEFAULT_TIMEOUT
          }, formattedPhoneNumber);
        }
        
        // Debug the generated TwiML
        const twimlString = debugTwiML(twiml);
        
        return new Response(twimlString, {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
        });
      }
      
      // Default response for unknown actions
      console.log(`Unknown action: ${action}, returning JSON error response`);
      
      return new Response(
        JSON.stringify({ success: false, error: `The requested action ${action} is not supported.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    // Ensure we always return a valid TwiML response even for errors
    console.error('Error in function:', error);
    
    const twimlResponse = new twilio.twiml.VoiceResponse();
    return new Response(twimlResponse.toString(), {
      status: 200,  // Always return 200 for Twilio to accept the response
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' } 
    });
  }
});
