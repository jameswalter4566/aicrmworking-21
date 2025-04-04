
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

    if (!accountSid || !authToken) {
      console.error('Missing required Twilio credentials:', {
        accountSid: !!accountSid,
        authToken: !!authToken
      });
      throw new Error('Missing required Twilio credentials');
    }

    // Get the identity from the request body or set a default
    let identity;
    try {
      const requestData = await req.json();
      identity = requestData.identity || "user" + Math.floor(Math.random() * 10000);
    } catch (e) {
      // If request parsing fails, use a default identity
      identity = "user" + Math.floor(Math.random() * 10000);
    }
    
    console.log("Creating token for identity:", identity);

    // Create an access token using Twilio client
    const client = twilio(accountSid, authToken);
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      incomingAllow: true,
    });

    // Create an access token which we will sign and return to the client
    const token = new AccessToken(accountSid, accountSid, authToken, { identity });
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
