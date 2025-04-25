import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import twilio from "npm:twilio@4.10.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'text/xml',
};

const twiml = twilio.twiml;

// Create Supabase client for logging
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to log call status
async function logCallStatus(data: any) {
  try {
    const callLog = {
      sid: data.CallSid,
      status: data.CallStatus,
      from_number: data.From,
      to_number: data.To,
      duration: data.CallDuration ? parseInt(data.CallDuration) : 0,
      timestamp: new Date().toISOString(),
      line_number: 1 // Hardcoded to Line 1 for now
    };

    const { error } = await supabase
      .from('call_logs')
      .insert([callLog]);

    if (error) {
      console.error('Error logging call status:', error);
    } else {
      console.log('Successfully logged call status:', callLog);
    }
  } catch (err) {
    console.error('Error in logCallStatus:', err);
  }
}

// Main serve function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Generate a unique request ID for logging
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  console.log(`[${requestId}] Processing request`);

  try {
    let method;
    let formData: any = {};

    if (req.headers.get('Content-Type')?.includes('application/json')) {
      method = 'json';
      formData = await req.json();
      console.log(`[${requestId}] Received JSON request:`, JSON.stringify(formData));
    } else {
      method = 'form';
      const params = await req.formData();
      for (const [key, value] of params.entries()) {
        formData[key] = value;
      }
      console.log(`[${requestId}] Received form data request:`, JSON.stringify(formData));
    }

    // Log call status for any incoming status updates
    if (formData.CallSid && formData.CallStatus) {
      await logCallStatus(formData);
    }

    // Extract session ID
    const sessionId = formData.sessionId || formData.dialingSessionId || 'default-session';
    
    // Initialize session tracking if needed
    if (!callAttempts.has(sessionId)) {
      callAttempts.set(sessionId, new Map<string, number>());
      activeDialingAttempts.set(sessionId, new Map<string, number>());
      console.log(`[${requestId}] Created new session tracking for session ${sessionId}`);
    }
    
    // Get the session-specific tracking data
    const sessionCallAttempts = callAttempts.get(sessionId)!;
    const sessionActiveDialing = activeDialingAttempts.get(sessionId)!;

    // Extract key data from the request
    let phoneNumber = formData.phoneNumber;
    
    // Format the phone number properly 
    if (phoneNumber && !phoneNumber.startsWith('client:')) {
      const originalPhoneNumber = phoneNumber;
      phoneNumber = formatPhoneNumberForDialing(phoneNumber);
      if (originalPhoneNumber !== phoneNumber) {
        console.log(`[${requestId}] Formatted phone number from ${originalPhoneNumber} to ${phoneNumber}`);
      }
    }
    
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : '';
    const callSid = formData.CallSid || '';
    const dialCallStatus = formData.DialCallStatus || '';
    const isDialAction = formData.dialAction === "true" || req.url.includes('dialAction=true');

    if (phoneNumber) {
      // Check for concurrent dialing attempts to the same number
      const currentAttempts = sessionActiveDialing.get(normalizedPhone) || 0;
      if (currentAttempts > 0 && !isDialAction) {
        console.log(`[${requestId}] Already dialing ${phoneNumber} (${currentAttempts} active attempts), preventing concurrent dial`);
        
        const response = new twiml.VoiceResponse();
        response.say("A call to this number is already in progress.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      }
      
      // Mark this number as being dialed
      if (!isDialAction) {
        sessionActiveDialing.set(normalizedPhone, (currentAttempts || 0) + 1);
        const attempts = sessionCallAttempts.get(normalizedPhone) || 0;
        sessionCallAttempts.set(normalizedPhone, attempts + 1);
        console.log(`[${requestId}] Now dialing ${phoneNumber}, attempt #${attempts + 1} for this session`);
      }
    }

    // Handle dial action with proper handling of error codes
    if (isDialAction) {
      console.log(`[${requestId}] Processing dial action response: Status=${dialCallStatus}`);
      
      // Clean up tracking for this number
      if (normalizedPhone) {
        const currentActive = sessionActiveDialing.get(normalizedPhone) || 0;
        if (currentActive > 0) {
          sessionActiveDialing.set(normalizedPhone, currentActive - 1);
        }
      }

      // Handle call completion cases
      if (dialCallStatus === "completed") {
        console.log(`[${requestId}] Call ${callSid} was answered and completed normally`);
        
        const response = new twiml.VoiceResponse();
        response.hangup();
        return new Response(response.toString(), { headers: corsHeaders });
      } else if (dialCallStatus === "no-answer") {
        console.log(`[${requestId}] Number ${phoneNumber} did not answer`);
        
        const response = new twiml.VoiceResponse();
        response.say("This number did not answer. Please try again later.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      } else if (dialCallStatus === "busy") {
        console.log(`[${requestId}] Number ${phoneNumber} is busy`);
        
        const response = new twiml.VoiceResponse();
        response.say("The number is busy. Please try again later.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      } else if (dialCallStatus === "failed") {
        console.log(`[${requestId}] Call to ${phoneNumber} failed, will allow future attempts`);
        
        const response = new twiml.VoiceResponse();
        response.say("The call could not be connected. The system will try again later.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      }
    }

    // Handle different request types
    if (method === 'json' && formData.action === 'hangupAll') {
      // Handle request to hang up all active calls
      console.log(`[${requestId}] Attempting to hang up all active calls`);
      
      try {
        const twilioClient = twilio(
          Deno.env.get("TWILIO_ACCOUNT_SID"),
          Deno.env.get("TWILIO_AUTH_TOKEN")
        );
        
        // Get all active calls
        const calls = await twilioClient.calls.list({status: 'in-progress'});
        console.log(`[${requestId}] Found ${calls.length} active calls`);
        
        // Hang up each active call
        for (const call of calls) {
          try {
            await twilioClient.calls(call.sid).update({status: 'completed'});
            console.log(`[${requestId}] Hung up call ${call.sid}`);
          } catch (err) {
            console.error(`[${requestId}] Failed to hang up call ${call.sid}:`, err);
          }
        }
        
        return new Response(JSON.stringify({ success: true, hungUpCount: calls.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error(`[${requestId}] Error hanging up calls:`, error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (method === 'json' && formData.action === 'clearSessionData') {
      // Add handler to clear a session's data
      const targetSessionId = formData.sessionId || 'default-session';
      
      if (callAttempts.has(targetSessionId)) {
        callAttempts.set(targetSessionId, new Map<string, number>());
        activeDialingAttempts.set(targetSessionId, new Map<string, number>());
        console.log(`[${requestId}] Cleared call attempts for session ${targetSessionId}`);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Session data cleared for ${targetSessionId}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (method === 'json' && formData.phoneNumber) {
      // For outbound calls, generate TwiML with status callback URL
      const response = new twiml.VoiceResponse();
      const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
      
      console.log(`JSON Request: Dialing ${formData.phoneNumber} with caller ID: ${callerId || "default"}`);
      
      const dial = response.dial({
        callerId: callerId,
        timeout: 30,
        answerOnBridge: true,
        action: `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-voice?dialAction=true`,
        method: "POST",
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallback: `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-voice`,
        statusCallbackMethod: 'POST'
      });
      
      dial.number(formData.phoneNumber);
      
      return new Response(response.toString(), { headers: corsHeaders });
    } else {
      // Default fallback - log the full request for debugging
      console.warn(`[${requestId}] Unhandled request type received:`, JSON.stringify(formData, null, 2));
      
      // Return a basic TwiML response
      const response = new twiml.VoiceResponse();
      response.say("We're sorry, but we couldn't process your request.");
      return new Response(response.toString(), { headers: corsHeaders });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Return a proper TwiML response even for errors
    const response = new twiml.VoiceResponse();
    response.say("We encountered an error processing your request.");
    
    return new Response(response.toString(), { 
      status: 200,  // Return 200 even for errors to avoid Twilio retries
      headers: corsHeaders
    });
  }
});
