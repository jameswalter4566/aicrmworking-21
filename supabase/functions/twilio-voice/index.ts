
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

serve(async (req) => {
  // CRITICAL: Log every request in detail to diagnose auth issues
  console.log(`======== NEW REQUEST ${new Date().toISOString()} ========`);
  console.log(`Received ${req.method} request to Twilio Voice function`)
  console.log(`Request URL: ${req.url}`)
  
  // Log all headers for debugging
  const headerEntries = [...req.headers.entries()];
  console.log(`Request headers (${headerEntries.length}):`, JSON.stringify(headerEntries));
  
  // CRITICAL: Always handle preflight requests properly first
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request")
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    // Parse request data - enhanced for more robust parsing
    let requestData: any = {}
    
    try {
      const contentType = req.headers.get('content-type') || '';
      console.log(`Request content-type: ${contentType}`)
      
      if (contentType.includes('application/json')) {
        // Handle JSON data
        const text = await req.text();
        console.log("Received JSON text:", text.substring(0, 200) + (text.length > 200 ? '...' : ''))
        if (text && text.trim()) {
          requestData = JSON.parse(text);
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // Handle form data from Twilio
        const formData = await req.formData();
        console.log("Received form data with fields:", Array.from(formData.keys()).join(', '))
        for (const [key, value] of formData.entries()) {
          requestData[key] = value;
        }
      } else {
        // Try to parse as text and then as JSON
        const text = await req.text();
        console.log("Received text:", text.substring(0, 200) + (text.length > 200 ? '...' : ''))
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
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Twilio credentials - added extra logging to trace issues
    console.log("Attempting to retrieve Twilio credentials from environment");
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
    const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID');
    
    // Log credential availability (not the values themselves)
    console.log("Twilio credentials loaded:", {
      accountSidAvailable: !!TWILIO_ACCOUNT_SID,
      authTokenAvailable: !!TWILIO_AUTH_TOKEN,
      phoneNumberAvailable: !!TWILIO_PHONE_NUMBER,
      twimlAppSidAvailable: !!TWILIO_TWIML_APP_SID
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

    // Validate Twilio Account SID format (should start with 'AC')
    if (!TWILIO_ACCOUNT_SID.startsWith('AC')) {
      console.error("Invalid Twilio Account SID format - should start with 'AC'");
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Twilio Account SID format', 
          hint: 'Should start with AC'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let client;
    try {
      client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      console.log("Twilio client initialized successfully");
      
      // Verify credentials with a small test API call
      try {
        const account = await client.api.accounts(TWILIO_ACCOUNT_SID).fetch();
        console.log("Twilio credentials verified successfully:", account.friendlyName);
      } catch (verifyError) {
        console.error("Failed to verify Twilio credentials:", verifyError);
        // Continue anyway - we'll catch actual API errors later
      }
    } catch (err) {
      console.error("Error initializing Twilio client:", err);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to initialize Twilio client', 
          twilioError: err.message || String(err),
          suggestion: "Check your Twilio credentials in Supabase secrets"
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get action from request data
    const action = requestData.action;
    const phoneNumber = requestData.phoneNumber || requestData.To;

    console.log(`Processing ${action} action with phone ${phoneNumber}`);

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
      
      // Check if this is a browser-originated call or a direct REST API call
      const isBrowserCall = requestData.browser === true || requestData.browser === 'true';
      console.log(`Making call from ${TWILIO_PHONE_NUMBER} to ${formattedPhoneNumber}, browser mode: ${isBrowserCall}`);
      
      try {
        // Create a new call with enhanced TwiML for better audio
        const callOptions: any = {
          to: formattedPhoneNumber,
          from: TWILIO_PHONE_NUMBER,
          url: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=handleVoice&To=${encodeURIComponent(formattedPhoneNumber)}&browser=${isBrowserCall ? 'true' : 'false'}`,
          method: 'POST',
          // Add statusCallback to monitor call progress
          statusCallback: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=statusCallback`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST'
        };
        
        // For browser calls, we need to set up specific settings
        if (isBrowserCall) {
          // This is very important - we're telling Twilio to enable media streams for browser audio
          callOptions.twiml = `<Response><Dial><Number>${formattedPhoneNumber}</Number></Dial><Start><Stream url="wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream" track="both_tracks"/></Start></Response>`;
        }
        
        const call = await client.calls.create(callOptions);
        
        console.log("Call created successfully:", call.sid);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            callSid: call.sid,
            usingBrowser: isBrowserCall
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
    } else if (action === 'handleVoice' || !action) {
      // Process incoming voice requests from Twilio
      console.log("Handling Voice Request", JSON.stringify(requestData));
      
      const twimlResponse = new twilio.twiml.VoiceResponse();
      
      if (requestData.Caller && requestData.Caller.startsWith('client:')) {
        // This is a browser call to a phone - critical for audio in browser
        console.log("Browser to phone call - enhancing audio quality and setting up stream");
        if (phoneNumber) {
          // Set high quality audio settings for browser calls
          twimlResponse.say({ 
            voice: 'alice',
            language: 'en-US' 
          }, 'Connecting your call now.');
          
          const dial = twimlResponse.dial({
            callerId: TWILIO_PHONE_NUMBER,
            // Enhanced audio quality - crucial for browser audio
            answerOnBridge: true
          });
          
          const formattedNumber = normalizePhoneNumber(phoneNumber);
          dial.number({
            statusCallbackEvent: ['answered', 'completed'],
            statusCallback: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=statusCallback`
          }, formattedNumber);
          
          // Set up media stream for browser audio after the call connects
          twimlResponse.start().stream({
            url: 'wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream',
            track: 'both_tracks'
          });
        } else {
          twimlResponse.say({ voice: 'alice' }, 'No phone number provided for the call.');
        }
      } else if (phoneNumber && phoneNumber.startsWith('client:')) {
        // This is a phone call to a browser client
        console.log("Phone to browser call - enhancing audio quality");
        twimlResponse.say({ voice: 'alice' }, 'Connecting you to our representative.');
        
        const dial = twimlResponse.dial({
          answerOnBridge: true,
          callerId: TWILIO_PHONE_NUMBER
        });
        
        dial.client({
          statusCallbackEvent: ['answered', 'completed'],
          statusCallback: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=statusCallback`
        }, phoneNumber.replace('client:', ''));
      } else {
        // Standard phone to phone call - modified to enable browser audio if requested
        console.log("Processing call - checking if browser audio is requested");
        const isBrowserRequested = requestData.browser === 'true';
        
        if (phoneNumber) {
          if (isBrowserRequested) {
            console.log("Setting up call with browser audio support and media streaming");
            twimlResponse.say({ voice: 'alice' }, 'Connecting your call with browser audio.');
            
            // Special setup for browser audio feedback
            const dial = twimlResponse.dial({
              callerId: TWILIO_PHONE_NUMBER,
              answerOnBridge: true
            });
            
            const formattedNumber = normalizePhoneNumber(phoneNumber);
            dial.number(formattedNumber);
            
            // Add media streaming after dialing
            twimlResponse.start().stream({
              url: 'wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream',
              track: 'both_tracks'
            });
          } else {
            console.log("Standard phone call without browser audio");
            twimlResponse.say({ voice: 'alice' }, 'Connecting your call now.');
            
            const dial = twimlResponse.dial({
              callerId: TWILIO_PHONE_NUMBER,
              answerOnBridge: true
            });
            
            const formattedNumber = normalizePhoneNumber(phoneNumber);
            dial.number(formattedNumber);
          }
        } else {
          twimlResponse.say({ voice: 'alice' }, 'Welcome to the phone system. No action specified.');
        }
      }
      
      console.log("Generated TwiML:", twimlResponse.toString());
      
      return new Response(
        twimlResponse.toString(),
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    } else if (action === 'checkStatus') {
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
    } else if (action === 'endCall') {
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
    } else if (action === 'statusCallback') {
      // Enhanced status callbacks from Twilio with detailed logging
      console.log("Status callback received:", JSON.stringify(requestData));
      
      // Extract key call information
      const callSid = requestData.CallSid;
      const callStatus = requestData.CallStatus;
      const duration = requestData.CallDuration || '0';
      
      console.log(`Call ${callSid} status updated to: ${callStatus} (duration: ${duration}s)`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Call status recorded: ${callStatus}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
