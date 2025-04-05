import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import twilio from 'npm:twilio@4.23.0'

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
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY')
    const TWILIO_API_SECRET = Deno.env.get('TWILIO_API_SECRET')
    const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID')

    console.log("Environment variables loaded")
    
    // Parse the request body based on content-type
    let requestData = {}
    const contentType = req.headers.get('content-type') || ''
    console.log('Received content type:', contentType)
    
    try {
      if (contentType.includes('application/json')) {
        console.log('Processing JSON data')
        try {
          const text = await req.text()
          console.log('Raw JSON text:', text)
          if (text && text.trim()) {
            requestData = JSON.parse(text)
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError)
          return new Response(
            JSON.stringify({ error: 'JSON parse error', details: parseError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        console.log('Processing form data')
        const text = await req.text()
        console.log('Raw form data:', text)
        if (text && text.trim()) {
          try {
            requestData = Object.fromEntries(text.split('&').map((pair) => {
              const [key, value] = pair.split('=')
              return [
                key,
                value ? decodeURIComponent(value.replace(/\+/g, ' ')) : ''
              ]
            }))
          } catch (formError) {
            console.error('Form data parse error:', formError)
            return new Response(
              JSON.stringify({ error: 'Form data parse error', details: formError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
        console.log('Parsed form data:', requestData)
      } else {
        console.log('Unexpected content type, treating as text')
        const text = await req.text()
        console.log('Raw request body:', text)
        try {
          if (text && text.trim()) {
            requestData = JSON.parse(text)
          }
        } catch (error) {
          console.log('Not valid JSON, continuing with empty request data')
        }
      }
      console.log("Request data parsed:", JSON.stringify(requestData))
    } catch (e) {
      console.error("Failed to parse request body:", e)
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: e.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Handle Twilio callback webhooks
    if (requestData.RecordingSid || requestData.RecordingUrl || requestData.CallSid) {
      console.log('📞 Received webhook callback from Twilio:', {
        callSid: requestData.callSid || requestData.CallSid,
        recordingSid: requestData.RecordingSid,
        recordingUrl: requestData.RecordingUrl,
        duration: requestData.Duration
      })
      
      return new Response(
        JSON.stringify({
          success: true,
          recordingSid: requestData.RecordingSid,
          recordingUrl: requestData.RecordingUrl,
          callSid: requestData.CallSid,
          duration: requestData.Duration
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Extract action and parameters from the request
    const { action, phoneNumber, callbackUrl, callSid } = requestData

    // If no specific action is defined, fallback to makeCall
    const actionToPerform = action || 'makeCall'
    console.log(`Processing action: ${actionToPerform}`)

    switch (actionToPerform) {
      case 'makeCall': {
        // Log the full request data for debugging
        console.log(`Request data for makeCall:`, JSON.stringify(requestData, null, 2))
        
        if (!phoneNumber) {
          return new Response(
            JSON.stringify({ error: 'Phone number is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!TWILIO_PHONE_NUMBER) {
          return new Response(
            JSON.stringify({ error: 'Twilio phone number is not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`Initiating call to ${phoneNumber} from ${TWILIO_PHONE_NUMBER}`)

        // Create Twilio client if we need to use the API directly
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
          return new Response(
            JSON.stringify({ error: 'Twilio credentials not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        try {
          // Method 1: Use Twilio REST API directly
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`
  
          // Create TwiML to instruct Twilio how to handle the call
          // Update the TwiML to ensure proper audio connection to the browser client
          const twimlResponse = `
            <Response>
              <Say voice="alice">Hello, this is a call from the CRM system.</Say>
              <Pause length="1"/>
              <Say voice="alice">Please hold while we connect you with a representative.</Say>
              <Dial callerId="${TWILIO_PHONE_NUMBER}" timeout="30" record="record-from-answer">
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
              // Enable recording for this call
              Record: 'true',
              // Ensure these parameters for better reliability
              MachineDetection: 'DetectMessageEnd',
              AsyncAmd: 'true',
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
        } catch (callError) {
          console.error('Error making call:', callError)
          return new Response(
            JSON.stringify({ error: 'Failed to initiate call', details: callError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      case 'getCallStatus': {
        if (!callSid) {
          return new Response(
            JSON.stringify({ error: 'Call SID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`Getting status for call: ${callSid}`)
        try {
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
        } catch (statusError) {
          console.error('Error getting call status:', statusError)
          return new Response(
            JSON.stringify({ error: 'Failed to check call status', details: statusError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      case 'check_recording': {
        if (!callSid) {
          return new Response(
            JSON.stringify({ error: 'Call SID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('🎥 Checking recordings for call:', callSid)
        
        try {
          const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
          const recordings = await client.recordings.list({ callSid })
          
          if (recordings && recordings.length > 0) {
            const recording = recordings[0]
            console.log('✅ Found recording:', {
              sid: recording.sid,
              mediaUrl: recording.mediaUrl,
              duration: recording.duration
            })
            
            return new Response(JSON.stringify({
              success: true,
              hasRecording: true,
              recordingUrl: recording.mediaUrl,
              recordingSid: recording.sid,
              duration: recording.duration,
              status: recording.status
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
          
          return new Response(JSON.stringify({
            success: true,
            hasRecording: false,
            message: 'No recording found yet'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (error) {
          console.error('Error checking recordings:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to check recordings', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
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
          JSON.stringify({ error: 'Invalid action', receivedAction: actionToPerform }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Twilio Voice Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error', stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
