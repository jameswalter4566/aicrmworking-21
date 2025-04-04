
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import twilio from 'https://esm.sh/twilio@4.23.0'

// CORS headers for browser requests - properly configured for preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400', // 24 hours cache for preflight requests
}

serve(async (req) => {
  // Handle CORS preflight requests - this is critical for browser API calls to work
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 // No Content is the correct response for OPTIONS preflight
    });
  }

  try {
    // Get Twilio credentials from environment variables
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY')
    const TWILIO_API_SECRET = Deno.env.get('TWILIO_API_SECRET')
    const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID')

    console.log("Environment variables loaded, checking for required credentials...")

    // Validate credentials are present
    const missingCredentials = []
    if (!TWILIO_ACCOUNT_SID) missingCredentials.push('TWILIO_ACCOUNT_SID')
    if (!TWILIO_AUTH_TOKEN) missingCredentials.push('TWILIO_AUTH_TOKEN')
    if (!TWILIO_PHONE_NUMBER) missingCredentials.push('TWILIO_PHONE_NUMBER')

    if (missingCredentials.length > 0) {
      console.error(`Missing required Twilio credentials: ${missingCredentials.join(', ')}`)
      return new Response(
        JSON.stringify({ 
          error: 'Missing required Twilio credentials', 
          missingCredentials 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { action, phoneNumber, callbackUrl, callSid } = requestData
    console.log(`Processing action: ${action}`)

    switch (action) {
      case 'makeCall': {
        if (!phoneNumber) {
          return new Response(
            JSON.stringify({ error: 'Phone number is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`Initiating call to ${phoneNumber} from ${TWILIO_PHONE_NUMBER}`)
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`

        // Create TwiML to instruct Twilio how to handle the call
        const twimlResponse = `
          <Response>
            <Say voice="alice">Hello, this is a call from the CRM system.</Say>
            <Pause length="1"/>
            <Say voice="alice">Please hold while we connect you with a representative.</Say>
            <Dial callerId="${TWILIO_PHONE_NUMBER}" timeout="30">
              <Client>browser</Client>
            </Dial>
          </Response>
        `

        // Make API request to Twilio
        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          },
          body: new URLSearchParams({
            From: TWILIO_PHONE_NUMBER,
            To: phoneNumber,
            Twiml: twimlResponse,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Twilio API error (${response.status}): ${errorText}`)
          return new Response(
            JSON.stringify({ 
              error: 'Twilio API error', 
              status: response.status, 
              details: errorText 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const data = await response.json()
        console.log(`Call initiated with SID: ${data.sid}`)
        
        return new Response(
          JSON.stringify({ success: true, callSid: data.sid }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'getCallStatus': {
        if (!callSid) {
          return new Response(
            JSON.stringify({ error: 'Call SID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`Getting status for call: ${callSid}`)
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`

        const response = await fetch(twilioUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Twilio API error (${response.status}): ${errorText}`)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to retrieve call status', 
              status: response.status, 
              details: errorText 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const data = await response.json()
        console.log(`Call status: ${data.status}`)
        
        return new Response(
          JSON.stringify({ status: data.status }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'generateToken': {
        console.log("Generating token - checking credentials...")
        
        const tokenCredentialsMissing = []
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
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Twilio Voice Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
