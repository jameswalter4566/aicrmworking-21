
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
    
    // Enhanced request parsing logic from your working version
    let requestData;
    const contentType = req.headers.get('content-type');
    console.log('Received content type:', contentType);

    if (contentType?.includes('application/json')) {
      console.log('Processing JSON data');
      requestData = await req.json();
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      console.log('Processing form data');
      const text = await req.text();
      requestData = Object.fromEntries(text.split('&').map((pair) => {
        const [key, value] = pair.split('=');
        return [
          key,
          decodeURIComponent(value.replace(/\+/g, ' '))
        ];
      }));
      console.log('Parsed form data:', requestData);
    } else {
      console.log('Unexpected content type, treating as text');
      const text = await req.text();
      console.log('Raw request body:', text);
      try {
        requestData = JSON.parse(text);
      } catch {
        requestData = {};
      }
    }
    
    console.log('Processed request data:', requestData);
    
    // Handle Twilio webhook callbacks (from your working version)
    const { 
      action = 'makeCall', 
      phoneNumber, 
      callbackUrl, 
      callSid, 
      RecordingSid, 
      RecordingUrl, 
      CallSid, 
      Duration, 
      propertyDetails 
    } = requestData;
    
    // Handle Twilio webhook callbacks
    if (RecordingSid || RecordingUrl || CallSid) {
      console.log("Processing webhook callback from Twilio:", {
        callSid: CallSid || callSid,
        RecordingUrl,
        RecordingSid,
        Duration
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          recordingSid: RecordingSid,
          recordingUrl: RecordingUrl,
          callSid: CallSid,
          duration: Duration
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Twilio client
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    switch (action) {
      case 'makeCall': {
        if (!phoneNumber) {
          return new Response(
            JSON.stringify({ error: 'Phone number is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`Initiating call to ${phoneNumber} from ${TWILIO_PHONE_NUMBER}`)
        
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

        try {
          const projectRef = req.url.split('/functions/')[0].split('//')[1].split('.')[0];
          console.log(`Project ref determined as: ${projectRef}`);
          
          const baseUrl = `https://${projectRef}.functions.supabase.co`;
          console.log(`Using base URL: ${baseUrl}`);
          
          const call = await client.calls.create({
            twiml: twimlResponse,
            to: phoneNumber,
            from: TWILIO_PHONE_NUMBER,
            record: true,
            recordingStatusCallback: `${baseUrl}/twilio-voice`,
            recordingStatusCallbackMethod: 'POST',
            statusCallback: `${baseUrl}/twilio-voice`,
            statusCallbackEvent: [
              'initiated',
              'ringing',
              'answered',
              'completed'
            ],
            statusCallbackMethod: 'POST'
          });
          
          console.log(`Call initiated with SID: ${call.sid}`);
          
          return new Response(
            JSON.stringify({ success: true, callSid: call.sid }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Error making call:', error);
          return new Response(
            JSON.stringify({ error: error.message || 'Call failed' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      case 'check_recording': {
        if (!callSid) {
          return new Response(
            JSON.stringify({ error: 'Call SID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Checking recordings for call:', callSid);
        
        try {
          const recordings = await client.recordings.list({ callSid });
          
          if (recordings && recordings.length > 0) {
            const recording = recordings[0];
            console.log('Found recording:', {
              sid: recording.sid,
              mediaUrl: recording.mediaUrl,
              duration: recording.duration
            });
            
            return new Response(
              JSON.stringify({
                success: true,
                hasRecording: true,
                recordingUrl: recording.mediaUrl,
                recordingSid: recording.sid,
                duration: recording.duration,
                status: recording.status
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          return new Response(
            JSON.stringify({
              success: true,
              hasRecording: false,
              message: 'No recording found yet'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } catch (error) {
          console.error('Error checking recording:', error);
          return new Response(
            JSON.stringify({ error: error.message || 'Failed to check recording' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      case 'getCallStatus': {
        if (!callSid) {
          return new Response(
            JSON.stringify({ error: 'Call SID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Getting status for call: ${callSid}`);
        
        try {
          const call = await client.calls(callSid).fetch();
          console.log(`Call status: ${call.status}`);
          
          return new Response(
            JSON.stringify({ status: call.status }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Error fetching call status:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to retrieve call status', 
              details: error.message 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
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
