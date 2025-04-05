
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
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // Get Twilio credentials from environment variables
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY')
    const TWILIO_API_SECRET = Deno.env.get('TWILIO_API_SECRET')
    const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID')

    console.log("Checking for required Twilio credentials...")
    
    // Validate that all required credentials are available
    const missingCredentials = []
    if (!TWILIO_ACCOUNT_SID) missingCredentials.push('TWILIO_ACCOUNT_SID')
    if (!TWILIO_API_KEY) missingCredentials.push('TWILIO_API_KEY')
    if (!TWILIO_API_SECRET) missingCredentials.push('TWILIO_API_SECRET')
    if (!TWILIO_TWIML_APP_SID) missingCredentials.push('TWILIO_TWIML_APP_SID')
    
    if (missingCredentials.length > 0) {
      console.error(`Missing Twilio credentials: ${missingCredentials.join(', ')}`)
      return new Response(
        JSON.stringify({ 
          error: 'Missing required Twilio credentials', 
          missingCredentials 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a unique ID for this client
    const identity = `browser-${crypto.randomUUID()}`
    console.log(`Generating token for identity: ${identity}`)
    
    // Create JWT token for Twilio Client
    const AccessToken = twilio.jwt.AccessToken
    const VoiceGrant = AccessToken.VoiceGrant

    // Create an access token
    const accessToken = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY,
      TWILIO_API_SECRET,
      { identity }
    )

    // Create a Voice Grant and add it to the token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWILIO_TWIML_APP_SID,
      incomingAllow: true
    })

    // Add grants to the token
    accessToken.addGrant(voiceGrant)
    
    // Generate the JWT token string
    const token = accessToken.toJwt()
    console.log("Token generated successfully")
    
    // Return the token to the client
    return new Response(
      JSON.stringify({ token, identity }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error("Error generating token:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
