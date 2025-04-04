
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

    console.log(`Initiating call to ${to} from ${from}`);

    const client = twilio(accountSid, authToken);
    
    // Using Twilio's API to create a new call
    const call = await client.calls.create({
      to: to,
      from: from,
      url: `https://handler.twilio.com/twiml/EH${accountSid}`, // Default TwiML that allows the call
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallback: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-status?agentIdentity=${encodeURIComponent(agentIdentity)}`,
      statusCallbackMethod: 'POST'
    });

    return new Response(
      JSON.stringify({
        success: true,
        callSid: call.sid
      }),
      { headers: { ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error initiating Twilio call:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to initiate call" 
      }),
      { status: 400, headers: corsHeaders }
    );
  }
});
