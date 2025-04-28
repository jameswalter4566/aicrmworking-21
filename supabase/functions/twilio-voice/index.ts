
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
// Fix the import of VoiceResponse - the correct import is from twilio@4.19.0/twiml
import { VoiceResponse } from 'https://esm.sh/twilio@4.19.0/twiml';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client for interactions with the database
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Phone number to use as caller ID (from environment variable)
const CALLER_ID = Deno.env.get('TWILIO_PHONE_NUMBER') || '+18158625164';

// Track call timeouts
const callTimeouts = new Map();
// Track dialing sessions
const dialingSessions = new Map();

// Helper function to notify the call disposition function with call status
async function notifyCallDisposition(callSid, status, formData) {
  try {
    const callDispositionUrl = formData.get('callDispositionUrl');
    if (!callDispositionUrl) return;

    console.log(`[${Deno.requestId}] Forwarding call data to call-disposition function: ${callSid}`);

    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      params.append(key, value);
    });
    params.append('action', 'call_status_update');
    params.append('call_status', status);

    const response = await fetch(callDispositionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (response.ok) {
      console.log(`[${Deno.requestId}] Successfully forwarded call status update to call-disposition function`);
    } else {
      console.error(`[${Deno.requestId}] Failed to forward call status update: ${response.status}`);
    }
  } catch (error) {
    console.error(`[${Deno.requestId}] Error forwarding call status update:`, error);
  }
}

// Main function to handle requests
Deno.serve(async (req) => {
  console.log('Received request to Twilio Voice function');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${Deno.requestId}] Processing request`);
    
    const url = new URL(req.url);
    const isDialAction = url.searchParams.get('dialAction') === 'true';
    const phoneNumber = url.searchParams.get('phoneNumber');
    
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    console.log(`[${Deno.requestId}] Received form data request:`, Object.fromEntries(formData.entries()));
    
    const contentType = req.headers.get('Content-Type') || '';
    console.log(`[${Deno.requestId}] Content-Type: ${contentType}`);
    
    // Process the request
    if (contentType.includes('x-www-form-urlencoded') || contentType.includes('form-data')) {
      console.log(`[${Deno.requestId}] Processing form data request`);
      
      // Get essential parameters from form data
      const callSid = formData.get('CallSid');
      const callStatus = formData.get('CallStatus');
      const from = formData.get('From');
      
      // Track session
      let sessionId = formData.get('sessionId') || 'default-session';
      if (!dialingSessions.has(sessionId)) {
        console.log(`[${Deno.requestId}] Created new session tracking for session ${sessionId}`);
        dialingSessions.set(sessionId, {
          dialAttempts: 0,
          currentCallSid: null,
          startTime: Date.now()
        });
      }
      
      const session = dialingSessions.get(sessionId);
      
      // Handle dial action results
      if (isDialAction) {
        const dialStatus = formData.get('DialCallStatus');
        const errorCode = formData.get('ErrorCode');
        
        console.log(`[${Deno.requestId}] Processing dial action response: Status=${dialStatus}, Error=${errorCode || ''}`);
        
        const sessionAge = Date.now() - session.startTime;
        console.log(`[${Deno.requestId}] Call ${callSid} has been active for ${sessionAge}ms`);
        
        if (dialStatus === 'no-answer') {
          console.log(`[${Deno.requestId}] Call ${callSid} rang for 30+ seconds with no answer`);
          
          // Forward disposition data
          await notifyCallDisposition(callSid, 'no-answer', formData);
        }
        
        // Generate TwiML with empty response - call has ended
        const twiml = new VoiceResponse();
        return new Response(twiml.toString(), {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        });
      }
      
      // Handle outbound dialing
      if (phoneNumber) {
        // Process form for outbound call
        console.log(`[${Deno.requestId}] Processing form outbound call request to: ${phoneNumber}`);
        
        // Format phone number if needed
        let formattedNumber = phoneNumber;
        if (formattedNumber.startsWith('+')) {
          if (!formattedNumber.startsWith('+1') && formattedNumber.length === 11) {
            formattedNumber = '+1' + formattedNumber.substring(1);
            console.log(`[${Deno.requestId}] Formatted phone number from ${phoneNumber} to ${formattedNumber}`);
          }
        }
        
        // Track dialing attempt
        session.dialAttempts += 1;
        console.log(`[${Deno.requestId}] Now dialing ${formattedNumber}, attempt #${session.dialAttempts} for this session`);
        session.currentCallSid = callSid;
        
        // Start call timeout tracking
        console.log(`[${Deno.requestId}] Started dial timeout tracking for ${callSid}`);
        const timeoutId = setTimeout(() => {
          console.log(`[${Deno.requestId}] Call ${callSid} timeout reached`);
        }, 60000); // 60 second timeout
        callTimeouts.set(callSid, timeoutId);
        
        // Forward call data to disposition function
        await notifyCallDisposition(callSid, callStatus, formData);
        
        // Pass-through the call transcribe parameters to ensure recording
        const twiml = new VoiceResponse();
        const dialOptions = {
          callerId: CALLER_ID,
          timeout: 30,
          answerOnBridge: true,
          action: `${url.origin}/functions/v1/twilio-voice?dialAction=true&phoneNumber=${formattedNumber}`,
          method: 'POST',
          // Make sure to pass these parameters to enable recording and transcription
          record: formData.get('record') === 'true' ? 'record-from-answer' : undefined,
          recordingStatusCallback: formData.get('recordingStatusCallback'),
          recordingStatusCallbackMethod: 'POST',
          transcribe: formData.get('transcribe') === 'true',
          transcribeCallback: formData.get('transcribeCallback')
        };

        // Remove undefined values
        Object.keys(dialOptions).forEach(key => {
          if (dialOptions[key] === undefined) {
            delete dialOptions[key];
          }
        });
        
        console.log(`[${Deno.requestId}] Form Request: Dialing ${formattedNumber} with caller ID: ${CALLER_ID}`);
        console.log(`[${Deno.requestId}] Dial options:`, dialOptions);

        const dial = twiml.dial(dialOptions);
        dial.number(formattedNumber);
        
        const twimlString = twiml.toString();
        console.log(`[${Deno.requestId}] Generated TwiML for form request: ${twimlString}`);
        
        return new Response(twimlString, {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        });
      } 
      // Handle incoming calls
      else if (callStatus === 'ringing') {
        console.log(`[${Deno.requestId}] Processing incoming call from Twilio: CallSid=${callSid}, Caller=${from}`);
        
        // Forward call to disposition function
        await notifyCallDisposition(callSid, 'ringing', formData);
        
        // Generate TwiML for incoming call
        const twiml = new VoiceResponse();
        
        // For incoming calls with no number specified, use default handler
        console.log(`[${Deno.requestId}] Found phone number to dial: 0`);
        console.log(`[${Deno.requestId}] Dialing +0 with caller ID: ${CALLER_ID}`);
        
        const dial = twiml.dial({
          callerId: CALLER_ID,
          timeout: 30,
          answerOnBridge: true,
          action: `${url.origin}/functions/v1/twilio-voice?dialAction=true&phoneNumber=0`,
          method: 'POST'
        });
        dial.number('+0');
        
        const twimlString = twiml.toString();
        console.log(`[${Deno.requestId}] Generated TwiML for incoming call: ${twimlString}`);
        
        return new Response(twimlString, {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        });
      }
      // Handle status callbacks
      else {
        console.log(`[${Deno.requestId}] Processing call status update: ${callStatus}`);
        
        // Forward status to disposition function
        await notifyCallDisposition(callSid, callStatus, formData);
        
        // Return empty TwiML response for status callbacks
        const twiml = new VoiceResponse();
        return new Response(twiml.toString(), {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        });
      }
    } 
    
    // Return error for unexpected content type
    return new Response('Unexpected content type', { 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 400 
    });
    
  } catch (error) {
    console.error(`Error processing request: ${error.message}`);
    // Return a TwiML response even in case of error to avoid Twilio errors
    const twiml = new VoiceResponse();
    twiml.say('An error occurred processing your request.');
    return new Response(twiml.toString(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200, // Return 200 to avoid Twilio retries
    });
  }
});
