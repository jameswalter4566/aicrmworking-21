
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
    const apiKey = Deno.env.get('TWILIO_API_KEY');
    const apiSecret = Deno.env.get('TWILIO_API_SECRET');
    const applicationSid = Deno.env.get('TWILIO_TWIML_APP_SID');

    if (!accountSid || (!authToken && (!apiKey || !apiSecret))) {
      console.error('Missing required Twilio credentials');
      throw new Error('Missing required Twilio credentials');
    }

    if (!applicationSid) {
      console.error('Missing Twilio TwiML Application SID');
      throw new Error('Missing Twilio TwiML Application SID');
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

    // Use AccessToken with API Key and Secret if available (preferred method)
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: applicationSid,
      incomingAllow: true
    });

    // Create an access token with a TTL of 1 hour (3600 seconds)
    let token;
    
    if (apiKey && apiSecret) {
      console.log("Using API Key/Secret for token generation");
      const accessToken = new AccessToken(
        accountSid,
        apiKey,
        apiSecret,
        { identity: identity, ttl: 3600 }
      );
      
      // Add the grant to the token
      accessToken.addGrant(voiceGrant);
      
      // Generate the token
      token = accessToken.toJwt();
    } else {
      console.log("Using Auth Token for token generation (fallback)");
      const accessToken = new AccessToken(
        accountSid,
        applicationSid, 
        authToken,
        { identity: identity, ttl: 3600 }
      );
      
      // Add the grant to the token
      accessToken.addGrant(voiceGrant);
      
      // Generate the token
      token = accessToken.toJwt();
    }
    
    console.log("Created AccessToken for:", identity, "length:", token.length);

    // Return the token and identity
    return new Response(
      JSON.stringify({
        token: token,
        identity: identity,
        tokenType: "AccessToken"
      }),
      { headers: { ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error generating Twilio token:", error);
    
    // Create a meaningful error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        message: "Failed to generate token. Check your Twilio credentials.",
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 400, headers: corsHeaders }
    );
  }
});
