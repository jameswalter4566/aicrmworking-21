
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import twilio from 'https://esm.sh/twilio@4.18.1';
import { v4 as uuid } from 'https://esm.sh/uuid@9.0.0';
import { SessionManager } from './session-manager.ts';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Twilio client
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
const twilioClient = twilio(twilioAccountSid, twilioAuthToken);
const VoiceResponse = twilio.twiml.VoiceResponse;

// Initialize session manager
const sessionManager = new SessionManager();
const DEFAULT_SESSION = 'default-session';
const defaultSessionTimeout = 30 * 60 * 1000; // 30 minutes

// Forward call data to the call disposition service
async function forwardCallData(callSid: string, status: string, callData: Record<string, any> = {}) {
  try {
    console.log(`Forwarding call data to call-disposition function: ${callSid}`);
    
    const response = await supabase.functions.invoke('call-disposition', {
      body: {
        action: 'call_status_update',
        callSid,
        status,
        timestamp: new Date().toISOString(),
        ...callData
      }
    });
    
    if (response.error) {
      console.error(`Error forwarding call data: ${response.error.message}`);
      return false;
    }
    
    console.log(`Successfully forwarded call status update to call-disposition function`);
    return true;
  } catch (error) {
    console.error('Error forwarding call data:', error);
    return false;
  }
}

// Handle dial action results
function handleDialAction(formData: FormData) {
  const callSid = formData.get('CallSid')?.toString();
  const dialCallStatus = formData.get('DialCallStatus')?.toString();
  const dialCallSid = formData.get('DialCallSid')?.toString();
  const dialCallDuration = formData.get('DialCallDuration')?.toString();
  const errorCode = formData.get('ErrorCode')?.toString();
  
  if (!callSid) return null;
  
  console.log(`Processing dial action response: Status=${dialCallStatus}, Error=${errorCode || ''}`);
  
  // Update session info
  let sessionId = formData.get('sessionId')?.toString() || DEFAULT_SESSION;
  const activeSession = sessionManager.getSession(sessionId) || sessionManager.createSession(sessionId);
  
  // Calculate how long the call has been active
  if (activeSession) {
    const callStartTime = activeSession.calls[callSid]?.startTime;
    if (callStartTime) {
      const callDuration = Date.now() - callStartTime;
      console.log(`Call ${callSid} has been active for ${callDuration}ms`);
    }
  }
  
  // Check if this was a completed call
  if (dialCallStatus === 'completed') {
    console.log(`Call ${callSid} was answered and completed normally`);
  } else if (dialCallStatus === 'busy') {
    console.log(`Call ${callSid} was busy`);
  } else if (dialCallStatus === 'no-answer') {
    console.log(`Call ${callSid} was not answered`);
  } else if (dialCallStatus === 'failed') {
    console.log(`Call ${callSid} failed with error code: ${errorCode}`);
  }
  
  // Forward to call disposition service
  forwardCallData(callSid, dialCallStatus || 'unknown', {
    dialCallSid,
    dialCallDuration,
    errorCode
  });
  
  // Generate TwiML response
  const twiml = new VoiceResponse();
  
  return twiml.toString();
}

// Handle form data request for outbound call
function handleFormRequest(formData: FormData) {
  // Extract parameters
  const phoneNumber = formData.get('phoneNumber')?.toString();
  const callerId = twilioPhoneNumber;
  const sessionId = formData.get('sessionId')?.toString() || DEFAULT_SESSION;
  const callSid = formData.get('CallSid')?.toString();
  
  if (!phoneNumber) {
    console.log('No phone number provided in form request');
    const twiml = new VoiceResponse();
    twiml.say('No phone number was provided to call.');
    return twiml.toString();
  }
  
  console.log(`Form Request: Dialing ${phoneNumber} with caller ID: ${callerId}`);
  
  // Format phone number if needed
  let formattedPhone = phoneNumber;
  if (phoneNumber.startsWith('+')) {
    // Already formatted
  } else if (/^\d+$/.test(phoneNumber)) {
    // Numbers only, add country code
    formattedPhone = `+1${phoneNumber}`;
    console.log(`Formatted phone number from ${phoneNumber} to ${formattedPhone}`);
  }
  
  // Create or update session
  let activeSession = sessionManager.getSession(sessionId);
  if (!activeSession) {
    console.log(`Created new session tracking for session ${sessionId}`);
    activeSession = sessionManager.createSession(sessionId, defaultSessionTimeout);
  }
  
  // Track the call in the session
  if (callSid) {
    activeSession.calls[callSid] = {
      phoneNumber: formattedPhone,
      startTime: Date.now(),
      attemptCount: activeSession.attempts[formattedPhone] || 0
    };
    
    // Start dial timeout tracking
    console.log(`Started dial timeout tracking for ${callSid}`);
  }
  
  // Count this attempt
  activeSession.attempts[formattedPhone] = (activeSession.attempts[formattedPhone] || 0) + 1;
  
  console.log(`Now dialing ${formattedPhone}, attempt #${activeSession.attempts[formattedPhone]} for this session`);
  
  // Forward to call disposition
  if (callSid) {
    forwardCallData(callSid, 'dialing', { phoneNumber: formattedPhone });
  }
  
  // Generate TwiML to call the number
  const twiml = new VoiceResponse();
  const dialParams: any = {
    callerId,
    timeout: 30,  // Seconds to ring before giving up
    answerOnBridge: true,  // For improved call quality
    action: `${supabaseUrl}/functions/v1/twilio-voice?dialAction=true&phoneNumber=${encodeURIComponent(formattedPhone)}`,
    method: 'POST',
    record: 'record-from-answer', // IMPORTANT: Record call for transcription
    recordingStatusCallback: `${supabaseUrl}/functions/v1/dialer-webhook?callId=${formData.get('leadId') || formData.get('sessionId')}`,
    recordingStatusCallbackMethod: 'POST'
  };
  
  // Create the dial command
  const dial = twiml.dial(dialParams);
  dial.number(formattedPhone);
  
  // Log the generated TwiML
  console.log(`Generated TwiML for form request: ${twiml.toString()}`);
  
  return twiml.toString();
}

// Handle JSON requests
async function handleJsonRequest(req: Request) {
  const { action } = await req.json();
  
  if (action === 'hangupAll') {
    try {
      // Fetch active calls
      const calls = await twilioClient.calls.list({status: 'in-progress'});
      let hungUpCount = 0;
      
      // Loop through each call and hang up
      for (const call of calls) {
        try {
          await twilioClient.calls(call.sid).update({status: 'completed'});
          hungUpCount++;
        } catch (e) {
          console.error(`Failed to hang up call ${call.sid}:`, e);
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, hungUpCount, message: `Hung up ${hungUpCount} calls` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (e) {
      console.error('Error hanging up all calls:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to hang up calls' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } 
  
  return new Response(
    JSON.stringify({ success: false, error: 'Unknown action' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
  );
}

// Main function to handle requests
Deno.serve(async (req) => {
  console.log('Received request to Twilio Voice function');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Generate a request ID for tracing
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 12)}`;
  console.log(`[${requestId}] Processing request`);
  
  try {
    // Check request content type
    const contentType = req.headers.get('content-type') || '';
    console.log(`[${requestId}] Content-Type: ${contentType}`);
    
    // Handle different request types
    if (contentType.includes('application/x-www-form-urlencoded') || 
        contentType.includes('multipart/form-data')) {
      // Process form data from Twilio
      console.log(`[${requestId}] Processing form data request`);
      const formData = await req.formData();
      
      // Log form data for debugging
      console.log(`[${requestId}] Received form data request:`, Object.fromEntries(formData.entries()));
      
      // Check URL parameters
      const url = new URL(req.url);
      const isDialAction = url.searchParams.get('dialAction') === 'true';
      const phoneNumber = url.searchParams.get('phoneNumber');
      
      // Handle form data appropriately
      let twimlResponse;
      
      if (isDialAction) {
        // Handle dial action results
        twimlResponse = handleDialAction(formData);
      } else {
        // Process outbound call request
        const formPhoneNumber = formData.get('phoneNumber')?.toString();
        console.log(`[${requestId}] Processing form outbound call request to: ${formPhoneNumber || phoneNumber}`);
        twimlResponse = handleFormRequest(formData);
      }
      
      // Return TwiML response
      return new Response(twimlResponse, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200,
      });
    } else if (contentType.includes('application/json')) {
      // Process JSON API request
      console.log(`[${requestId}] Processing API request (JSON)`);
      return handleJsonRequest(req);
    } else {
      // Handle unexpected content type
      return new Response('Unsupported content type', {
        headers: corsHeaders,
        status: 415,
      });
    }
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
