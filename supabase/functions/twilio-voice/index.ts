
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
  // Handle preflight requests properly
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    // Parse request body - Twilio sends form data, not JSON
    let requestData: any = {}
    
    try {
      const contentType = req.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // Handle JSON data
        const text = await req.text();
        if (text && text.trim()) {
          requestData = JSON.parse(text);
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // Handle form data from Twilio
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) {
          requestData[key] = value;
        }
      } else {
        // Try to parse as text and then as JSON
        const text = await req.text();
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

    // Get Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
    const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Missing required Twilio credentials");
      return new Response(
        JSON.stringify({ error: 'Missing required Twilio credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Get action from request data - could be in body or URL
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
      
      console.log(`Making call from ${TWILIO_PHONE_NUMBER} to ${formattedPhoneNumber}`);
      
      try {
        // Create a new call with a VoiceUrl for handling the connection
        const call = await client.calls.create({
          to: formattedPhoneNumber,
          from: TWILIO_PHONE_NUMBER,
          url: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=handleVoice&To=${encodeURIComponent(formattedPhoneNumber)}`,
          method: 'POST'
        });
        
        console.log("Call created successfully:", call.sid);
        
        return new Response(
          JSON.stringify({ success: true, callSid: call.sid }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error("Error creating call:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || 'Failed to create call' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (action === 'handleVoice' || !action) {
      // If no action is specified but we have CallSid, treat as handleVoice
      // Process incoming voice requests from Twilio
      console.log("Handling Voice Request", JSON.stringify(requestData));
      
      const twimlResponse = new twilio.twiml.VoiceResponse();
      
      if (requestData.Caller && requestData.Caller.startsWith('client:')) {
        // This is a browser call to a phone
        console.log("Browser to phone call");
        if (phoneNumber) {
          const dial = twimlResponse.dial({
            callerId: TWILIO_PHONE_NUMBER,
          });
          const formattedNumber = normalizePhoneNumber(phoneNumber);
          dial.number(formattedNumber);
        } else {
          twimlResponse.say('No phone number provided for the call.');
        }
      } else if (phoneNumber && phoneNumber.startsWith('client:')) {
        // This is a phone call to a browser client
        console.log("Phone to browser call");
        const dial = twimlResponse.dial();
        dial.client(phoneNumber.replace('client:', ''));
      } else {
        // Standard phone to phone call
        console.log("Phone to phone call");
        if (phoneNumber) {
          const dial = twimlResponse.dial({
            callerId: TWILIO_PHONE_NUMBER,
          });
          const formattedNumber = normalizePhoneNumber(phoneNumber);
          dial.number(formattedNumber);
        } else {
          twimlResponse.say('Welcome to the phone system. No action specified.');
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
      // Handle status callbacks from Twilio
      console.log("Status callback received:", requestData);
      return new Response(
        JSON.stringify({ success: true }),
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
