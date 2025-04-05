
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import twilio from "npm:twilio@4.23.0"

// Enhanced CORS headers with broader support
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
}

console.log("Twilio Token function loaded and ready")

serve(async (req) => {
  // Handle preflight requests properly (critical for browser CORS)
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request")
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    // Get Twilio credentials from environment variables
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY')
    const TWILIO_API_SECRET = Deno.env.get('TWILIO_API_SECRET')
    const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID')

    console.log("Environment variables loaded")
    
    // Check if all required environment variables are present
    const tokenCredentialsMissing = []
    if (!TWILIO_ACCOUNT_SID) tokenCredentialsMissing.push('TWILIO_ACCOUNT_SID')
    if (!TWILIO_API_KEY) tokenCredentialsMissing.push('TWILIO_API_KEY')
    if (!TWILIO_API_SECRET) tokenCredentialsMissing.push('TWILIO_API_SECRET')
    if (!TWILIO_TWIML_APP_SID) tokenCredentialsMissing.push('TWILIO_TWIML_APP_SID')
    
    if (tokenCredentialsMissing.length > 0) {
      console.error(`Missing token generation credentials: ${tokenCredentialsMissing.join(', ')}`)
      return new Response(
        JSON.stringify({ 
          error: 'Missing required Twilio credentials for token generation',
          missingCredentials: tokenCredentialsMissing
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log("All credentials present, generating Twilio Client token")
    
    // Create a unique ID for this client
    const identity = crypto.randomUUID()
    
    try {
      // Create JWT token for Twilio Client
      const AccessToken = twilio.jwt.AccessToken
      const VoiceGrant = AccessToken.VoiceGrant

      const accessToken = new AccessToken(
        TWILIO_ACCOUNT_SID,
        TWILIO_API_KEY,
        TWILIO_API_SECRET,
        { identity }
      )

      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: TWILIO_TWIML_APP_SID,
        incomingAllow: true
      })

      accessToken.addGrant(voiceGrant)
      const token = accessToken.toJwt()
      console.log(`Token generated for identity: ${identity}`)
      
      return new Response(
        JSON.stringify({ token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (tokenError) {
      console.error('Error generating token:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate token', details: tokenError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Twilio Token Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
