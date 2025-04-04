
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

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

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(
        JSON.stringify({ error: 'Missing Twilio credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, phoneNumber, callbackUrl } = await req.json()

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
            <Connect>
              <Stream url="wss://${callbackUrl}"/>
            </Connect>
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
        const { callSid } = await req.json()
        
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
        // Generate a token for Twilio Client - in a production app this would be more sophisticated
        const identity = crypto.randomUUID()
        
        return new Response(
          JSON.stringify({ token: identity }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
