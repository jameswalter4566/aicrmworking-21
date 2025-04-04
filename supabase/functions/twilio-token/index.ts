
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
    const apiKey = Deno.env.get('TWILIO_API_KEY'); // Optional, but recommended
    const apiSecret = Deno.env.get('TWILIO_API_SECRET'); // Optional, but recommended
    const applicationSid = Deno.env.get('TWILIO_TWIML_APP_SID');

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

    // Create an access token using Twilio's AccessToken constructor
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      incomingAllow: true,
      outgoingApplicationSid: applicationSid,
    });

    // Create an access token with the correct parameters
    // If API Key/Secret are available, use them. Otherwise, fall back to accountSid/authToken
    const token = apiKey && apiSecret
      ? new AccessToken(accountSid, apiKey, apiSecret, { identity, ttl: 3600 })
      : new AccessToken(accountSid, accountSid, authToken, { identity, ttl: 3600 });
    
    // Add the voice grant to the token
    token.addGrant(voiceGrant);

    // Log token details for debugging (not the actual token for security)
    console.log("Token created for:", {
      identity,
      accountSid: accountSid.substring(0, 8) + "...",
      hasApiKey: !!apiKey,
      hasVoiceGrant: !!voiceGrant,
      ttl: "3600 seconds (1 hour)"
    });

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
      JSON.stringify({ 
        error: error.message || "Failed to generate token",
        stack: error.stack // Include stack trace for debugging
      }),
      { status: 400, headers: corsHeaders }
    );
  }
});
