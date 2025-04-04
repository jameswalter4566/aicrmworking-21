
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import twilio from 'https://esm.sh/twilio@4.23.0'

// Enhanced CORS headers with broader support
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
}

console.log("Twilio Voice function loaded and ready")

serve(async (req) => {
  console.log(`Received ${req.method} request to ${req.url}`)
  
  // Handle preflight requests properly (critical for browser CORS)
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request")
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    console.log("Processing request body")
    
    // Get Twilio credentials from environment variables
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Missing required Twilio environment variables")
      const missing = []
      if (!TWILIO_ACCOUNT_SID) missing.push("TWILIO_ACCOUNT_SID")
      if (!TWILIO_AUTH_TOKEN) missing.push("TWILIO_AUTH_TOKEN")
      if (!TWILIO_PHONE_NUMBER) missing.push("TWILIO_PHONE_NUMBER")
      
      return new Response(
        JSON.stringify({ 
          error: 'Missing required Twilio credentials', 
          missingCredentials: missing 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log("Environment variables loaded")
    
    // Parse the request body
    let requestData
    try {
      requestData = await req.json()
      console.log("Request data parsed:", JSON.stringify(requestData))
    } catch (e) {
      console.error("Failed to parse request body:", e)
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
