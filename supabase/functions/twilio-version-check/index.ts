
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import twilio from 'npm:twilio';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Twilio package version
    const version = twilio.version || "Unknown";
    
    // Check if we have access to the JWT module
    const hasJwtModule = !!twilio.jwt;
    
    // Check if we have access to specific JWT constructors
    const hasCapabilityToken = !!twilio.jwt?.ClientCapability;
    const hasAccessToken = !!twilio.jwt?.AccessToken;
    
    // Return version information
    return new Response(
      JSON.stringify({
        version: version,
        hasJwtModule: hasJwtModule,
        hasCapabilityToken: hasCapabilityToken,
        hasAccessToken: hasAccessToken,
        twilioInfo: {
          description: "Twilio Server-side SDK",
          moduleInfo: Object.keys(twilio)
        }
      }),
      { headers: { ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error checking Twilio version:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
