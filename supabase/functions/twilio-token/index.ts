
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

    if (!accountSid) {
      throw new Error('Missing TWILIO_ACCOUNT_SID');
    }

    if (!applicationSid) {
      throw new Error('Missing TWILIO_TWIML_APP_SID');
    }

    // Check for either authToken OR apiKey+apiSecret
    const hasAuthToken = !!authToken;
    const hasApiCreds = !!apiKey && !!apiSecret;
    
    if (!hasAuthToken && !hasApiCreds) {
      throw new Error('Missing credentials: either TWILIO_AUTH_TOKEN or TWILIO_API_KEY and TWILIO_API_SECRET must be provided');
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

    // Create an Access Token
    let token;
    if (hasApiCreds) {
      console.log("Using API Key/Secret for token generation");
      
      // Initialize the Twilio Access Token with API Key/Secret
      const AccessToken = twilio.jwt.AccessToken;
      token = new AccessToken(
        accountSid,
        apiKey,
        apiSecret,
        { identity: identity, ttl: 3600 }
      );
      
      // Create a Voice grant for this token
      const VoiceGrant = AccessToken.VoiceGrant;
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: applicationSid,
        incomingAllow: true
      });
      
      // Add the grant to the token
      token.addGrant(voiceGrant);
      
      // Generate the token string
      const tokenString = token.toJwt();
      console.log("Created AccessToken for:", identity, "length:", tokenString.length);
      
      // Return the token and identity
      return new Response(
        JSON.stringify({
          token: tokenString,
          identity: identity
        }),
        { headers: corsHeaders }
      );
    } else {
      console.log("Using Auth Token for token generation");
      
      // Create a simple capability token instead
      const ClientCapability = twilio.jwt.ClientCapability;
      const capability = new ClientCapability({
        accountSid,
        authToken,
        ttl: 3600
      });
      
      // Allow outgoing calls to the TwiML application
      capability.addScope(new ClientCapability.OutgoingClientScope({
        applicationSid: applicationSid
      }));
      
      // Allow incoming calls
      capability.addScope(new ClientCapability.IncomingClientScope(identity));
      
      // Generate the token string
      const tokenString = capability.toJwt();
      console.log("Created CapabilityToken for:", identity, "length:", tokenString.length);
      
      // Return the token and identity
      return new Response(
        JSON.stringify({
          token: tokenString,
          identity: identity,
          tokenType: "CapabilityToken"
        }),
        { headers: corsHeaders }
      );
    }
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
