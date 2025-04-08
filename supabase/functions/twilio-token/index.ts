
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import twilio from "npm:twilio@4.23.0";
import { AccessToken } from "npm:twilio@4.23.0/jwt/AccessToken.js";
import { v4 as uuidv4 } from "https://deno.land/std@0.177.0/uuid/mod.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

console.log("Twilio token function loaded");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get Twilio credentials from environment variables
    const ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const API_KEY = Deno.env.get('TWILIO_API_KEY');
    const API_SECRET = Deno.env.get('TWILIO_API_SECRET');
    const TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID');
    const PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!ACCOUNT_SID || !API_KEY || !API_SECRET || !TWIML_APP_SID) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error. Missing required Twilio credentials."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate a random identity for this client
    const identity = `browser-${uuidv4()}`;
    console.log(`Generated identity: ${identity}`);

    // Create access token with Voice grant
    const VoiceGrant = AccessToken.VoiceGrant;
    const accessToken = new AccessToken(
      ACCOUNT_SID,
      API_KEY,
      API_SECRET,
      { identity, ttl: 86400 }
    );

    // Create Voice grant and add it to the access token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWIML_APP_SID,
      incomingAllow: true,
    });
    accessToken.addGrant(voiceGrant);

    // Generate the token
    const token = accessToken.toJwt();
    console.log("Token generated successfully");

    // Return the token as JSON
    return new Response(
      JSON.stringify({
        token,
        identity,
        twilioAppSid: TWIML_APP_SID,
        twilioPhoneNumber: PHONE_NUMBER,
        accountSid: ACCOUNT_SID,
        success: true,
        ttl: 86400,
        timestamp: new Date().toISOString(),
        refreshRequest: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error generating token:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to generate token"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
