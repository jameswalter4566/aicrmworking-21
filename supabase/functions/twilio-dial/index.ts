
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
    const authToken = Deno.env.get('TWILIO_API_SECRET');

    if (!accountSid || !authToken) {
      throw new Error('Missing required Twilio credentials');
    }

    // Parse request body
    const { to, from, agentIdentity } = await req.json();
    
    if (!to || !from || !agentIdentity) {
      throw new Error('Missing required parameters: to, from, and agentIdentity are required');
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${from}">
    <Number>${to}</Number>
  </Dial>
</Response>`;

    const client = twilio(accountSid, authToken);
    
    // Using Twilio's API to create a new call
    const call = await client.calls.create({
      to: to,
      from: from,
      twiml: twiml,
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
      JSON.stringify({ error: error.message || "Failed to initiate call" }),
      { status: 400, headers: corsHeaders }
    );
  }
});
