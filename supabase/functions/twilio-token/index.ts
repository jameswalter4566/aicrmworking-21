
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import twilio from 'npm:twilio@4.23.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
}

console.log("Twilio Token function loaded and ready")

serve(async (req) => {
  // Handle preflight requests properly
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    // Parse request data
    let requestData = {}
    try {
      const text = await req.text()
      if (text && text.trim()) {
        requestData = JSON.parse(text)
      }
    } catch (e) {
      console.error("Failed to parse request body:", e)
    }

    // Get Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY')
    const TWILIO_API_SECRET = Deno.env.get('TWILIO_API_SECRET')
    const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

    console.log("Environment variables loaded")

    const { action } = requestData as { action?: string }

    // If requesting configuration
    if (action === 'getConfig') {
      console.log('Returning Twilio configuration')
      return new Response(
        JSON.stringify({ 
          twilioPhoneNumber: TWILIO_PHONE_NUMBER,
          success: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check for required credentials for token generation
    console.log("Checking for required Twilio credentials...")
    if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Missing required Twilio credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a unique ID for this client
    const identity = `browser-${crypto.randomUUID()}`
    console.log(`Generating token for identity: ${identity}`)

    // Create JWT token for Twilio Client with enhanced permissions
    const AccessToken = twilio.jwt.AccessToken
    const VoiceGrant = AccessToken.VoiceGrant

    // Create Access Token with longer TTL (24 hours instead of default 1 hour)
    const accessToken = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY,
      TWILIO_API_SECRET,
      { 
        identity,
        ttl: 86400 // 24 hours in seconds
      }
    )

    // Create Voice Grant with explicit permissions
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWILIO_TWIML_APP_SID,
      incomingAllow: true, // Allow incoming calls
      pushCredentialSid: null // No push credentials needed for browser
    })

    accessToken.addGrant(voiceGrant)
    const token = accessToken.toJwt()
    console.log("Token generated successfully with 24-hour TTL")

    // Return additional debug information to help with troubleshooting
    return new Response(
      JSON.stringify({ 
        token, 
        identity,
        twilioAppSid: TWILIO_TWIML_APP_SID,
        twilioPhoneNumber: TWILIO_PHONE_NUMBER,
        accountSid: TWILIO_ACCOUNT_SID, // Safe to share the account SID (not a secret)
        success: true,
        ttl: 86400,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating token:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate token' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
