
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';
import twilio from 'https://esm.sh/twilio@4.10.0';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Generate a unique identity for this browser session
    // This helps prevent conflicts between different tabs/sessions
    const uniqueIdentifier = `browser-refresh-${Date.now()}`;
    console.log(`Generated identity: ${uniqueIdentifier}`);
    
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const twilioApiKey = Deno.env.get('TWILIO_API_KEY') || '';
    const twilioApiSecret = Deno.env.get('TWILIO_API_SECRET') || '';
    const twilioTwimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID') || '';
    
    // Use API Key authentication for creating tokens
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
    
    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twilioTwimlAppSid,
      incomingAllow: true, // Allow incoming calls
    });
    
    // Create an access token valid for 24 hours
    // Extended for debugging purposes
    const token = new AccessToken(
      twilioAccountSid,
      twilioApiKey,
      twilioApiSecret,
      { identity: uniqueIdentifier, ttl: 86400 }
    );
    
    // Add the voice grant to our token
    token.addGrant(voiceGrant);
    
    // Generate the JWT token
    const tokenString = token.toJwt();
    
    console.log(`Token generated successfully with 24-hour TTL (Identity: ${uniqueIdentifier})`);
    
    // Return the token to the client
    return new Response(JSON.stringify({ token: tokenString, identity: uniqueIdentifier }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error generating Twilio token:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
