
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import twilio from 'https://esm.sh/twilio@4.23.0'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get Twilio credentials from environment variables
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY')
    const TWILIO_API_SECRET = Deno.env.get('TWILIO_API_SECRET')
    const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID')

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(
        JSON.stringify({ error: 'Missing Twilio credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, phoneNumber, callbackUrl, callSid } = await req.json()

    switch (action) {
      case 'makeCall': {
        if (!phoneNumber) {
          throw new Error('Phone number is required')
        }

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`

        // Create TwiML to instruct Twilio how to handle the call
        const twimlResponse = `
          <Response>
            <Say>Hello, this is a call from the CRM system.</Say>
            <Pause length="1"/>
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

        const data = await response.json()
        
        return new Response(
          JSON.stringify({ success: true, callSid: data.sid }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'getCallStatus': {
        if (!callSid) {
          throw new Error('Call SID is required')
        }

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`

        const response = await fetch(twilioUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          },
        })

        const data = await response.json()
        
        return new Response(
          JSON.stringify({ status: data.status }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'generateToken': {
        if (!TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_TWIML_APP_SID) {
          return new Response(
            JSON.stringify({ 
              error: 'Missing required Twilio credentials for token generation',
              missingCredentials: {
                apiKey: !TWILIO_API_KEY,
                apiSecret: !TWILIO_API_SECRET,
                twimlAppSid: !TWILIO_TWIML_APP_SID
              }
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create a unique ID for this client
        const identity = crypto.randomUUID()
        
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
        
        return new Response(
          JSON.stringify({ token: accessToken.toJwt() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Twilio Voice Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
