
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
    // Get Twilio credentials from environment - only use the essential ones
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
    
    // Create a capability token that only uses accountSid and authToken
    const capability = new ClientCapability({
      accountSid: accountSid,
      authToken: authToken
    });
    
    // Allow incoming calls
    capability.addScope(new ClientCapability.IncomingClientScope(identity));
    
    // Allow outgoing calls if we have an applicationSid
    if (applicationSid) {
      capability.addScope(new ClientCapability.OutgoingClientScope({
        applicationSid: applicationSid,
        clientName: identity
      }));
    }

    // Generate the token
    const token = capability.toJwt();
    
    // Log token details for debugging (not the actual token for security)
    console.log("Capability token created for:", {
      identity,
      accountSid: accountSid.substring(0, 8) + "...",
      hasOutgoingCapability: !!applicationSid,
      hasIncomingCapability: true
    });

    // Generate the token and send it back
    return new Response(
      JSON.stringify({
        token: token,
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
