
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
    const apiKey = Deno.env.get('TWILIO_API_KEY');
    const apiSecret = Deno.env.get('TWILIO_API_SECRET');
    const twimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID');

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      throw new Error('Missing required Twilio credentials');
    }

    // Parse request body
    const { identity } = await req.json();
    
    if (!identity) {
      throw new Error('Identity is required');
    }

    // Create an access token
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });

    // Create an access token which we will sign and return to the client
    const token = new AccessToken(accountSid, apiKey, apiSecret, { identity });
    token.addGrant(voiceGrant);

    // Generate the token and send it back
    return new Response(
      JSON.stringify({
        token: token.toJwt(),
        identity: identity,
      }),
      { headers: { ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error generating Twilio token:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate token" }),
      { status: 400, headers: corsHeaders }
    );
  }
});
