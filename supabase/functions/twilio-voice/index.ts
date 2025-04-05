
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import twilio from 'npm:twilio@4.23.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
}

console.log("Twilio Voice function loaded and ready")

serve(async (req) => {
  // Handle preflight requests properly
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    let requestData = {}
    try {
      const text = await req.text()
      if (text && text.trim()) {
        requestData = JSON.parse(text)
      }
    } catch (e) {
      console.error("Failed to parse request body:", e)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log("Request data:", JSON.stringify(requestData))

    // Get Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Missing required Twilio credentials")
      return new Response(
        JSON.stringify({ error: 'Missing required Twilio credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    const { action, phoneNumber } = requestData as { action?: string; phoneNumber?: string }

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'makeCall') {
      if (!phoneNumber) {
        console.error("Phone number is required for makeCall action")
        return new Response(
          JSON.stringify({ error: 'Phone number is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Format phone number if needed (ensure it starts with +)
      const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
      
      console.log(`Making call from ${TWILIO_PHONE_NUMBER} to ${formattedPhoneNumber}`)
      
      try {
        // Create a new call
        const call = await client.calls.create({
          to: formattedPhoneNumber,
          from: TWILIO_PHONE_NUMBER,
          twiml: '<Response><Say>Hello, this is a call from SalesPro CRM. We are calling to check in with you. One of our representatives will be with you shortly.</Say></Response>'
        })
        
        console.log("Call created successfully:", call.sid)
        
        return new Response(
          JSON.stringify({ success: true, callSid: call.sid }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error("Error creating call:", error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || 'Failed to create call' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (action === 'checkStatus') {
      const { callSid } = requestData as { callSid?: string }
      
      if (!callSid) {
        return new Response(
          JSON.stringify({ error: 'Call SID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      try {
        // Fetch call status
        const call = await client.calls(callSid).fetch()
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: call.status,
            duration: call.duration
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error("Error checking call status:", error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || 'Failed to check call status' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (action === 'endCall') {
      const { callSid } = requestData as { callSid?: string }
      
      if (!callSid) {
        return new Response(
          JSON.stringify({ error: 'Call SID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      try {
        // End the call
        await client.calls(callSid).update({ status: 'completed' })
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error("Error ending call:", error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || 'Failed to end call' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
