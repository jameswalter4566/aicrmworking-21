
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import twilio from 'npm:twilio';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    const twimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID');

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      console.error('Missing required Twilio credentials:', {
        accountSid: !!accountSid,
        authToken: !!authToken,
        twilioPhoneNumber: !!twilioPhoneNumber
      });
      throw new Error('Missing required Twilio credentials');
    }

    // Initialize with default values in case request body is missing fields
    let to = '';
    let from = twilioPhoneNumber;
    let agentIdentity = 'anonymous';
    
    try {
      // Parse request body
      const requestData = await req.json();
      to = requestData.phoneNumber || requestData.to || '';
      from = requestData.from || twilioPhoneNumber;
      agentIdentity = requestData.agentIdentity || 'anonymous';
    } catch (e) {
      console.error("Error parsing request body:", e);
      throw new Error('Invalid request body format');
    }
    
    if (!to) {
      throw new Error('Missing required parameter: phone number');
    }

    // Ensure phone number is in E.164 format (add + if missing)
    if (to && !to.startsWith('+')) {
      to = '+' + to.replace(/\D/g, '');
    }

    console.log(`Initiating call to ${to} from ${from}`);

    const client = twilio(accountSid, authToken);
    
    // TwiML URL for the call
    // First check if we have a TwiML App SID configured, otherwise use a default URL
    const twimlUrl = twimlAppSid 
      ? null // When using twimlAppSid, we don't need a URL
      : `https://handler.twilio.com/twiml/EH${accountSid.substring(0, 8)}`;
    
    // Call parameters
    const callParams: any = {
      to: to,
      from: from,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallback: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-status?agentIdentity=${encodeURIComponent(agentIdentity)}`,
      statusCallbackMethod: 'POST'
    };

    // Add either applicationSid or url based on what's available
    if (twimlAppSid) {
      callParams.applicationSid = twimlAppSid;
    } else if (twimlUrl) {
      callParams.url = twimlUrl;
    } else {
      // If neither is available, use a simple TwiML string
      callParams.twiml = '<Response><Say>Hello. This is a test call from your application.</Say></Response>';
    }

    // Using Twilio's API to create a new call
    const call = await client.calls.create(callParams);

    console.log("Call initiated with SID:", call.sid);

    return new Response(
      JSON.stringify({
        success: true,
        callSid: call.sid,
        to: to,
        from: from
      }),
      { headers: { ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error initiating Twilio call:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to initiate call",
        stack: error.stack // Include stack trace for debugging
      }),
      { status: 400, headers: corsHeaders }
    );
  }
});
