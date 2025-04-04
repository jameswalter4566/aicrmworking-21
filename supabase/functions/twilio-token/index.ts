
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

    // Create a capability token using Twilio's ClientCapability constructor
    const ClientCapability = twilio.jwt.ClientCapability;
    
    // Create a capability token with the correct account credentials
    const capability = new ClientCapability({
      accountSid: accountSid,
      authToken: authToken,
      ttl: 3600 // Token time-to-live in seconds (1 hour)
    });
    
    // Allow incoming calls - use the identity as the client name
    capability.addScope(new ClientCapability.IncomingClientScope(identity));
    
    // Allow outgoing calls if we have an applicationSid
    if (applicationSid) {
      capability.addScope(new ClientCapability.OutgoingClientScope({
        applicationSid: applicationSid,
        clientName: identity,
        params: {
          // Add any additional parameters needed for your TwiML application
          identity: identity
        }
      }));
    } else {
      console.warn("No TWILIO_TWIML_APP_SID provided. Outgoing calls will not work.");
    }

    // Generate the token
    const token = capability.toJwt();
    
    // Log token details for debugging (not the actual token for security)
    console.log("Capability token created for:", {
      identity,
      accountSid: accountSid.substring(0, 8) + "...",
      hasOutgoingCapability: !!applicationSid,
      hasIncomingCapability: true,
      tokenLength: token.length
    });

    // Return the token and identity
    return new Response(
      JSON.stringify({
        token: token,
        identity: identity,
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
