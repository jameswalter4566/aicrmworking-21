
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
const DEFAULT_HOLD_MUSIC = "https://api.twilio.com/cowbell.mp3"; // Changed to HTTPS
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
    // Parse data from Twilio in various formats
    let requestData: Record<string, any> = {};
    
    // Extract action and parameters from URL query params
    const url = new URL(req.url);
    let action = url.searchParams.get('action');
    url.searchParams.forEach((value, key) => {
      requestData[key] = value;
    });
    
    // Parse form data from Twilio (application/x-www-form-urlencoded)
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Clone request to safely read body
      const reqClone = req.clone();
      const formText = await reqClone.text();
      const params = new URLSearchParams(formText);
      
      params.forEach((value, key) => {
        requestData[key] = value;
      });
      
      console.log("Parsed form data:", JSON.stringify(requestData));
    } 
    else if (contentType.includes('application/json')) {
      try {
        // Clone request to safely read body as JSON
        const reqClone = req.clone();
        const jsonData = await reqClone.json();
        Object.assign(requestData, jsonData);
        console.log("Parsed JSON data:", JSON.stringify(jsonData));
      } catch (e) {
        console.error("Failed to parse JSON body:", e);
        
        // Attempt to parse as text if JSON fails
        try {
          const reqClone = req.clone();
          const text = await reqClone.text();
          console.log("Raw request body:", text);
        } catch (textErr) {
          console.error("Failed to read request body as text:", textErr);
        }
      }
    } 
    else {
      // For any other content types, try to read as text and parse
      try {
        const reqClone = req.clone();
        const text = await reqClone.text();
        console.log("Raw request body:", text.substring(0, 200));
        
        // Try to parse as form data first (most likely from Twilio)
        try {
          const params = new URLSearchParams(text);
          params.forEach((value, key) => {
            requestData[key] = value;
          });
          console.log("Parsed as form data:", JSON.stringify(requestData));
        } catch (formErr) {
          // If not form data, try as JSON
          try {
            const jsonData = JSON.parse(text);
            Object.assign(requestData, jsonData);
            console.log("Parsed as JSON:", JSON.stringify(jsonData));
          } catch (jsonErr) {
            console.error("Could not parse request body as form data or JSON");
          }
        }
      } catch (e) {
        console.error("Failed to read request body:", e);
      }
    }
    
    // If no action in URL params, try to get it from the request data
    if (!action && requestData.action) {
      action = requestData.action;
    }
    
    // Special handling for browser client call request
    if (!action && requestData.phoneNumber) {
      action = 'clientCall';
      console.log("Detected browser client call request with phoneNumber:", requestData.phoneNumber);
    }
    
    // Check for Twilio callback events
    const isStatusCallback = requestData.CallSid && 
      (requestData.CallStatus || requestData.CallbackSource === 'call-progress-events');
    
    if (isStatusCallback) {
      console.log("Detected Twilio status callback:", {
        callSid: requestData.CallSid,
        callStatus: requestData.CallStatus,
        callbackSource: requestData.CallbackSource
      });
      
      // Create a simple TwiML response for status callbacks
      const twiml = new twilio.twiml.VoiceResponse();
      return new Response(twiml.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }

    // Get Twilio credentials 
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
    
    // Handle dial status callback - NEW
    if (action === 'dialStatus') {
      const dialStatus = requestData.DialCallStatus ?? 'unknown';
      const callSid = requestData.CallSid ?? 'n/a';
      console.log(`Dial status for ${callSid}: ${dialStatus}`);
      
      // TODO: if needed, write dialStatus back to Supabase here
      
      // Always ACK with valid, empty TwiML so Twilio sees 200 OK
      return new Response('<Response/>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200,
      });
    }
    
    // Check if this is a direct call from Twilio's webhook (no specific action)
    // This is the main case we need to handle properly
    if (!action) {
      console.log("No specific action detected, handling as default Twilio webhook");
      
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Check if there's a phone number to call
      const phoneNumber = requestData.phoneNumber || requestData.To;
      const leadId = requestData.leadId || 'unknown';
      const clientName = requestData.From?.replace(/^client:/, '') || '';
      
      console.log(`Processing call with phone=${phoneNumber}, leadId=${leadId}, from=${requestData.From}`);
      
      if (phoneNumber && phoneNumber.match(/^\+?\d+$/)) {
        // Format phone number if needed
        let formattedPhoneNumber = phoneNumber;
        if (!phoneNumber.startsWith('+')) {
          formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
        }
        
        console.log(`Dialing number: ${formattedPhoneNumber}`);
        twiml.say("Connecting your call. Please wait.");
        
        const dial = twiml.dial({
          callerId: TWILIO_PHONE_NUMBER,
          timeout: DEFAULT_TIMEOUT,
          action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=dialStatus&leadId=${leadId}`,
          method: 'POST'
        });
        
        dial.number(formattedPhoneNumber);
      } 
      else if (requestData.From && requestData.From.startsWith('client:')) {
        // Browser client connected, but no destination
        twiml.say("Welcome to the phone system. Please provide a destination number.");
        twiml.pause({ length: 2 });
        twiml.say("No destination number detected. The call will now end.");
      } 
      else {
        // Generic fallback response
        twiml.say("Thank you for connecting. Your request is being processed.");
      }
      
      const twimlString = debugTwiML(twiml);
      
      return new Response(twimlString, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }

    // CRITICAL: Handle incoming client calls with phoneNumber parameter
    if (action === 'clientCall' || requestData.phoneNumber) {
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
        // Create TwiML for the browser client that will simply dial the phone number
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("Connecting your call. Please wait.");
        
        const dial = twiml.dial({
          callerId: TWILIO_PHONE_NUMBER,
          timeout: DEFAULT_TIMEOUT,
          action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=dialStatus&leadId=${leadId}`,
          method: 'POST'
        });
        
        dial.number(formattedPhoneNumber);
        
        // Debug the generated TwiML
        const twimlString = debugTwiML(twiml);
        
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
    
    // Handle other actions based on the original code
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
        
        // Format phone number to ensure it has + and only digits
        let formattedPhoneNumber = phoneNumber;
        if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
          formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
        }
        
        // Initialize Twilio client
        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        
        // Create simple TwiML for direct call
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("Connecting to the phone number. Please wait.");
        
        const dial = twiml.dial({
          callerId: TWILIO_PHONE_NUMBER,
          timeout: DEFAULT_TIMEOUT,
          action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=dialStatus&leadId=${leadId}`,
          method: 'POST'
        });
        
        dial.number(formattedPhoneNumber);
        
        // Place a direct call from browser client to phone number
        const call = await client.calls.create({
          twiml: twiml.toString(),
          to: formattedPhoneNumber,
          from: TWILIO_PHONE_NUMBER,
          statusCallback: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/dialer-webhook?callId=${leadId}`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST',
        });
        
        console.log(`Direct outbound call initiated with SID: ${call.sid}`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            callSid: call.sid,
            message: "Direct outbound call placed",
            leadId: leadId
          }),
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
    else if (action === 'hangupAll') {
      // Terminate all active calls for testing/reset purposes
      try {
        console.log("Attempting to hang up all active calls");
        
        // Initialize Twilio client
        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        
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
      // Handle unknown actions with a valid 200 response instead of 400
      console.warn(`Unknown action "${action}" - returning empty TwiML`);
      return new Response('<Response/>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200,
      });
    }
  } catch (error) {
    console.error('Error in function:', error);
    
    // For all errors, still return a valid TwiML response to prevent Twilio errors
    return new Response('<Response/>', { 
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200
    });
  }
});
