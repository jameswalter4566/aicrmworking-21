
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import twilio from 'npm:twilio@4.23.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
}

console.log("Twilio Voice function loaded and ready")

// Function to normalize phone numbers
function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Ensure it has country code (assuming US/North America if none)
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  } else if (digitsOnly.length > 10 && !digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  } else if (digitsOnly.length > 10 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // If we can't normalize it properly, at least add a plus
  return digitsOnly ? `+${digitsOnly}` : '';
}

// Enhanced error handling wrapper for TwiML generation
function safeGenerateCallTwiML(phoneNumber: string, streamUrl: string): string {
  try {
    console.log(`Generating TwiML for call to ${phoneNumber} with stream URL ${streamUrl}`);
    
    const twimlResponse = new twilio.twiml.VoiceResponse();
    
    // CRITICAL FIX: Setup the stream connector FIRST to ensure it's established before dial
    twimlResponse.stream({
      url: streamUrl,
      track: 'both_tracks', // Capture both inbound and outbound audio
      name: 'browser_call',
      // Connect parameters that help debug stream issues
      connectRetry: true,
      maxRetries: 3,
      connectTimeout: 10
    });
    
    // Add a small pause to give the stream time to connect
    twimlResponse.pause({ length: 1 });
    
    // Add initial greeting after pause
    twimlResponse.say({ 
      voice: 'alice',
      language: 'en-US' 
    }, 'Connecting your call now.');
    
    // Then set up the dial - this order is crucial for audio flow
    if (phoneNumber) {
      const formattedNumber = normalizePhoneNumber(phoneNumber);
      
      twimlResponse.dial({
        callerId: Deno.env.get('TWILIO_PHONE_NUMBER'),
        answerOnBridge: true, // Important for maintaining connection
        timeout: 30,
        // Add record parameter to ensure audio is captured
        record: 'record-from-answer'
      }).number({
        statusCallbackEvent: ['answered', 'completed'],
        statusCallback: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=statusCallback`
      }, formattedNumber);
    }
    
    const twimlString = twimlResponse.toString();
    console.log("Generated TwiML:", twimlString);
    
    return twimlString;
  } catch (e) {
    console.error("Error generating TwiML:", e);
    // Return simple TwiML that won't error
    const fallbackTwiml = new twilio.twiml.VoiceResponse();
    fallbackTwiml.say('Sorry, we encountered a technical issue. Please try again later.');
    return fallbackTwiml.toString();
  }
}

serve(async (req) => {
  // CRITICAL: Log every request in detail to diagnose auth issues
  console.log(`======== NEW REQUEST ${new Date().toISOString()} ========`);
  console.log(`Received ${req.method} request to Twilio Voice function`);
  console.log(`Request URL: ${req.url}`);
  
  // Log all headers for debugging
  const headerEntries = [...req.headers.entries()];
  console.log(`Request headers (${headerEntries.length}):`, JSON.stringify(headerEntries));
  
  try {
    // CRITICAL: Always handle preflight requests properly first
    if (req.method === 'OPTIONS') {
      console.log("Handling OPTIONS preflight request");
      return new Response(null, { 
        status: 204,
        headers: corsHeaders
      });
    }

    // Enhanced request parsing with better error handling
    let requestData: any = {};
    
    try {
      const contentType = req.headers.get('content-type') || '';
      console.log(`Request content-type: ${contentType}`);
      
      if (contentType.includes('application/json')) {
        // Handle JSON data
        const text = await req.text();
        console.log("Received JSON text:", text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        if (text && text.trim()) {
          requestData = JSON.parse(text);
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // Handle form data from Twilio
        const formData = await req.formData();
        console.log("Received form data with fields:", Array.from(formData.keys()).join(', '));
        for (const [key, value] of formData.entries()) {
          requestData[key] = value;
        }
      } else {
        // Try to parse as text and then as JSON
        const text = await req.text();
        console.log("Received text:", text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        if (text && text.trim()) {
          try {
            requestData = JSON.parse(text);
          } catch (e) {
            // Not JSON, try to parse as URL encoded
            const params = new URLSearchParams(text);
            for (const [key, value] of params.entries()) {
              requestData[key] = value;
            }
          }
        }
      }
      
      // Always check URL query parameters and merge them
      const url = new URL(req.url);
      for (const [key, value] of url.searchParams.entries()) {
        if (!requestData[key]) {
          requestData[key] = value;
        }
      }
      
      console.log("Request data parsed:", JSON.stringify(requestData));
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: e.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Twilio credentials - added extra logging to trace issues
    console.log("Retrieving Twilio credentials from environment");
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
    
    // Log credential availability (not the values themselves)
    console.log("Twilio credentials loaded:", {
      accountSidAvailable: !!TWILIO_ACCOUNT_SID,
      authTokenAvailable: !!TWILIO_AUTH_TOKEN,
      phoneNumberAvailable: !!TWILIO_PHONE_NUMBER
    });
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Missing required Twilio credentials");
      return new Response(
        JSON.stringify({ 
          error: 'Missing required Twilio credentials',
          details: {
            accountSidMissing: !TWILIO_ACCOUNT_SID,
            authTokenMissing: !TWILIO_AUTH_TOKEN,
            phoneNumberMissing: !TWILIO_PHONE_NUMBER
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Twilio client
    let client;
    try {
      client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      console.log("Twilio client initialized successfully");
    } catch (err) {
      console.error("Error initializing Twilio client:", err);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to initialize Twilio client', 
          twilioError: err.message || String(err)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get action from request data
    const action = requestData.action;
    const phoneNumber = requestData.phoneNumber || requestData.To;

    console.log(`Processing ${action || 'default'} action with phone ${phoneNumber}`);

    if (action === 'makeCall') {
      if (!phoneNumber) {
        console.error("Phone number is required for makeCall action");
        return new Response(
          JSON.stringify({ error: 'Phone number is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Format the phone number properly
      const formattedPhoneNumber = normalizePhoneNumber(phoneNumber);
      
      if (!formattedPhoneNumber) {
        console.error("Invalid phone number format:", phoneNumber);
        return new Response(
          JSON.stringify({ error: 'Invalid phone number format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Set WebSocket URL for audio stream
      const streamUrl = `wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream`;
      
      const callOptions = {
        to: formattedPhoneNumber,
        from: TWILIO_PHONE_NUMBER,
        statusCallback: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=statusCallback`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        url: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=handleVoice&phoneNumber=${encodeURIComponent(formattedPhoneNumber)}&streamUrl=${encodeURIComponent(streamUrl)}`,
        method: 'POST',
        machineDetection: 'DetectMessageEnd',
        timeout: 30,
        record: true, // Enable recording to ensure audio quality
      };
      
      try {
        console.log("Creating call with options:", JSON.stringify(callOptions));
        const call = await client.calls.create(callOptions);
        console.log("Call created successfully:", {
          callSid: call.sid,
          status: call.status
        });
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            callSid: call.sid,
            status: call.status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error("Error creating call:", error);
        
        // More detailed error logging
        const errorResponse = {
          success: false, 
          error: error.message || 'Failed to create call'
        };
        
        // Add Twilio specific error details if available
        if (error.code) errorResponse.code = error.code;
        if (error.status) errorResponse.status = error.status;
        if (error.moreInfo) errorResponse.moreInfo = error.moreInfo;
        
        return new Response(
          JSON.stringify(errorResponse),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } 
    else if (action === 'handleVoice' || !action) {
      try {
        // Extract stream URL from query parameters if available
        const url = new URL(req.url);
        const streamUrl = url.searchParams.get('streamUrl') || `wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream`;
        const phoneNumberParam = url.searchParams.get('phoneNumber') || phoneNumber;
        
        console.log(`Handling voice with streamUrl=${streamUrl} and phoneNumber=${phoneNumberParam}`);
        
        // Generate TwiML with fallback handling
        const twiml = safeGenerateCallTwiML(phoneNumberParam, streamUrl);
        
        console.log("Returning TwiML response");
        return new Response(twiml, { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/xml' 
          } 
        });
      } catch (error) {
        console.error("Error in handleVoice:", error);
        
        // Provide a fallback TwiML that won't error
        const fallbackTwiml = new twilio.twiml.VoiceResponse();
        fallbackTwiml.say('Sorry, there was an error processing your call. Please try again later.');
        
        return new Response(fallbackTwiml.toString(), { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/xml' 
          } 
        });
      }
    }
    else if (action === 'streamStatus') {
      // Handle stream status callbacks
      console.log("Stream status update:", requestData);
      
      // CRITICAL: Log and respond to specific stream events
      if (requestData.streamSid) {
        console.log(`Stream status for ${requestData.streamSid}: ${requestData.status || 'unknown'}`);
        
        // If we have a streamSid and callSid, store this association
        if (requestData.callSid) {
          console.log(`Associated stream ${requestData.streamSid} with call ${requestData.callSid}`);
        }
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else if (action === 'checkStatus') {
      const { callSid } = requestData;
      
      if (!callSid) {
        return new Response(
          JSON.stringify({ error: 'Call SID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        // Fetch call status
        const call = await client.calls(callSid).fetch();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: call.status,
            duration: call.duration
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error("Error checking call status:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || 'Failed to check call status' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    else if (action === 'endCall') {
      const { callSid } = requestData;
      
      if (!callSid) {
        return new Response(
          JSON.stringify({ error: 'Call SID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        // End the call
        await client.calls(callSid).update({ status: 'completed' });
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error("Error ending call:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || 'Failed to end call' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    else if (action === 'statusCallback') {
      // Enhanced status callbacks from Twilio with detailed logging
      console.log("Status callback received:", JSON.stringify(requestData));
      
      // Extract key call information
      const callSid = requestData.CallSid;
      const callStatus = requestData.CallStatus;
      const duration = requestData.CallDuration || '0';
      
      console.log(`Call ${callSid} status updated to: ${callStatus} (duration: ${duration}s)`);
      
      // For in-progress calls, check if we need to associate with a stream
      if (callStatus === 'in-progress') {
        // This will be handled by the streaming function, but we log it here
        console.log(`Call ${callSid} is now in-progress - audio streaming should be active`);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Call status recorded: ${callStatus}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else if (action === 'recordingStatus') {
      // Handle recording status updates
      console.log("Recording status update received:", JSON.stringify(requestData));
      
      const recordingSid = requestData.RecordingSid;
      const recordingStatus = requestData.RecordingStatus;
      const recordingUrl = requestData.RecordingUrl;
      
      console.log(`Recording ${recordingSid} status: ${recordingStatus}, URL: ${recordingUrl}`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Recording status updated: ${recordingStatus}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else {
      return new Response(
        JSON.stringify({ error: 'Invalid action', action: action }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
