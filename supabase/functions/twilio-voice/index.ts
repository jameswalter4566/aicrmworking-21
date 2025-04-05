
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

// Function to normalize phone numbers
function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Ensure it has country code (assuming US/North America if none)
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  } else if (digitsOnly.length > 10 && !digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  } else if (digitsOnly.length > 10 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // If we can't normalize it properly, at least add a plus
  return digitsOnly ? `+${digitsOnly}` : '';
}

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
    const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID')
    
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

      // Format the phone number properly
      const formattedPhoneNumber = normalizePhoneNumber(phoneNumber)
      
      if (!formattedPhoneNumber) {
        console.error("Invalid phone number format:", phoneNumber)
        return new Response(
          JSON.stringify({ error: 'Invalid phone number format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log(`Making call from ${TWILIO_PHONE_NUMBER} to ${formattedPhoneNumber}`)
      
      try {
        // Create a new call
        const call = await client.calls.create({
          to: formattedPhoneNumber,
          from: TWILIO_PHONE_NUMBER,
          // Use the Twilio application instead of static TwiML
          applicationSid: TWILIO_TWIML_APP_SID,
          // This helps link the browser client with the outgoing call
          statusCallback: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=statusCallback`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST',
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
    } else if (action === 'handleVoice') {
      // Process incoming voice requests from Twilio (for browser-phone connections)
      console.log("Handling Voice Request")
      const twimlResponse = new twilio.twiml.VoiceResponse()
      const dial = twimlResponse.dial({
        callerId: TWILIO_PHONE_NUMBER,
      })
      
      // Get the phone number from the request parameters for outbound calls
      const to = (requestData as any).To || phoneNumber
      if (to) {
        const formattedNumber = normalizePhoneNumber(to)
        dial.number(formattedNumber)
      }
      
      return new Response(
        twimlResponse.toString(),
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      )
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
    } else if (action === 'statusCallback') {
      // Handle status callbacks from Twilio
      console.log("Status callback received:", requestData)
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
