
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import twilio from "npm:twilio@4.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'text/xml',
};

const twiml = twilio.twiml;

// Server-side in-memory caches to track call data between function invocations
const callAttempts = new Map<string, Map<string, number>>();
const noAnswerTimeouts = new Map<string, Map<string, number>>();
const MAX_ATTEMPTS = 3;

// Track more granular call status data
const callStatusData = new Map<string, {
  callSid: string;
  sessionId: string;
  phoneNumber: string;
  startTime: number;
  lastUpdateTime: number;
  currentStatus: string;
  attempts: number;
  wasDialed: boolean;
  dialComplete: boolean;
  errorCode?: string;
  errorMessage?: string;
}>();

// Track active dialing attempts for concurrent call prevention
const activeDialingAttempts = new Map<string, Map<string, number>>();

// Track dial timeouts for proper call disposition
const dialTimeouts = new Map<string, number>();
const DIAL_TIMEOUT_MS = 30000; // 30 seconds as per requirement

serve(async (req) => {
  console.log("Received request to Twilio Voice function");

  // Helper function to normalize phone numbers for consistent tracking
  const normalizePhoneNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return '';
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    return digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
  };
  
  // Helper function to properly format phone numbers for Twilio
  const formatPhoneNumberForDialing = (phoneNumber: string): string => {
    if (!phoneNumber) return '';
    if (phoneNumber.startsWith('client:')) return phoneNumber;
    
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // For US numbers (10 digits), ensure they have +1 prefix
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    } 
    // For international numbers, ensure they have + prefix
    else if (digitsOnly.length > 10) {
      // If it already has a country code (doesn't start with 1), just add +
      return digitsOnly.startsWith('1') ? `+${digitsOnly}` : `+${digitsOnly}`;
    }
    // If it's a short code or incomplete number, just add + for consistency
    return `+${digitsOnly}`;
  };

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

    // Extract session ID
    const sessionId = formData.sessionId || formData.dialingSessionId || 'default-session';
    
    // Initialize session tracking if needed
    if (!callAttempts.has(sessionId)) {
      callAttempts.set(sessionId, new Map<string, number>());
      activeDialingAttempts.set(sessionId, new Map<string, number>());
      noAnswerTimeouts.set(sessionId, new Map<string, number>());
      console.log(`[${requestId}] Created new session tracking for session ${sessionId}`);
    }
    
    // Get the session-specific tracking data
    const sessionCallAttempts = callAttempts.get(sessionId)!;
    const sessionActiveDialing = activeDialingAttempts.get(sessionId)!;
    const sessionNoAnswerTimeouts = noAnswerTimeouts.get(sessionId)!;

    // Extract key data from the request
    let phoneNumber = formData.phoneNumber;
    // Get error codes and messages if they exist
    const errorCode = formData.ErrorCode || '';
    const errorMessage = formData.ErrorMessage || '';
    
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
    
    // If we have error information from Twilio, log it
    if (errorCode || errorMessage) {
      console.log(`[${requestId}] Twilio Error - Code: ${errorCode}, Message: ${errorMessage}`);
    }
    
    if (callSid && !callStatusData.has(callSid) && phoneNumber) {
      // Initialize call status tracking
      callStatusData.set(callSid, {
        callSid,
        sessionId,
        phoneNumber: normalizedPhone,
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        currentStatus: formData.CallStatus || 'unknown',
        attempts: 0,
        wasDialed: false,
        dialComplete: false,
        errorCode: errorCode || undefined,
        errorMessage: errorMessage || undefined
      });
    } else if (callSid && callStatusData.has(callSid) && (errorCode || errorMessage)) {
      // Update with error info if we get it later
      const callData = callStatusData.get(callSid)!;
      callData.errorCode = errorCode || callData.errorCode;
      callData.errorMessage = errorMessage || callData.errorMessage;
      callStatusData.set(callSid, callData);
    }
    
    // Start tracking dial timeout if this is a fresh outbound call
    if (phoneNumber && !isDialAction && callSid && !dialTimeouts.has(callSid)) {
      dialTimeouts.set(callSid, Date.now());
      console.log(`[${requestId}] Started dial timeout tracking for ${callSid}`);
      
      if (callStatusData.has(callSid)) {
        const statusData = callStatusData.get(callSid)!;
        statusData.wasDialed = true;
        statusData.attempts++;
        callStatusData.set(callSid, statusData);
      }
    }

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

    // Forward call data to lead-connected function for real-time monitoring
    const forwardCallData = async (callData: any) => {
      try {
        console.log(`[${requestId}] Forwarding call data to lead-connected function:`, callData.CallSid || 'No CallSid');
        
        // Create a new supabase client for this request
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
        
        if (!supabaseUrl || !supabaseAnonKey) {
          console.error(`[${requestId}] Missing Supabase configuration. Cannot forward call data.`);
          return;
        }
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Extract the leadId if present
        const leadId = formData.leadId || '';
        
        // Forward the call data to the lead-connected function
        await supabase.functions.invoke('lead-connected', {
          body: {
            leadId,
            callData: {
              callSid: callData.CallSid,
              status: callData.CallStatus,
              timestamp: new Date().toISOString()
            }
          }
        });
        
        console.log(`[${requestId}] Successfully forwarded call data to lead-connected function`);
      } catch (err) {
        console.error(`[${requestId}] Error forwarding call data to lead-connected: ${err.message}`);
      }
    };

    // Check if this is a transcription event
    const isTranscription = formData.hasOwnProperty('TranscriptionSid') || 
                            formData.hasOwnProperty('TranscriptionText') || 
                            formData.hasOwnProperty('TranscriptionStatus');
    
    // Handle transcription separately
    if (isTranscription && formData.CallSid) {
      try {
        console.log(`[${requestId}] Processing transcription for call ${formData.CallSid}`);
        
        const leadId = formData.leadId || '';
        
        if (leadId) {
          // Create a new supabase client for this request
          const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
          const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
          
          if (!supabaseUrl || !supabaseAnonKey) {
            console.error(`[${requestId}] Missing Supabase configuration. Cannot forward transcription.`);
          } else {
            const supabase = createClient(supabaseUrl, supabaseAnonKey);
            
            // Format transcription data
            const transcriptionData = {
              segment_text: formData.TranscriptionText || '',
              is_final: formData.TranscriptionStatus === 'completed',
              confidence: parseFloat(formData.Confidence || '0.8'),
              speaker: formData.From || 'Unknown',
              timestamp: new Date().toISOString(),
              call_sid: formData.CallSid
            };
            
            // Forward to lead-connected
            await supabase.functions.invoke('lead-connected', {
              body: {
                leadId,
                callData: {
                  callSid: formData.CallSid,
                  status: 'transcription',
                  timestamp: new Date().toISOString()
                },
                transcription: transcriptionData
              }
            });
            
            console.log(`[${requestId}] Successfully forwarded transcription to lead-connected`);
          }
        } else {
          console.log(`[${requestId}] Cannot forward transcription: no leadId provided`);
        }
        
        // Return an empty TwiML response for transcription requests
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          headers: corsHeaders
        });
      } catch (transcriptionError) {
        console.error(`[${requestId}] Error processing transcription: ${transcriptionError.message}`);
        
        // Return an empty TwiML response for transcription requests
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          headers: corsHeaders
        });
      }
    }

    // Forward call data when we have meaningful status updates
    if (callSid && (formData.CallStatus || dialCallStatus || errorCode)) {
      // Extract key call information
      const callData = {
        CallSid: callSid,
        CallStatus: formData.CallStatus || dialCallStatus || 'unknown',
        From: formData.From || formData.phoneNumber,
        To: formData.To || formData.phoneNumber,
        Direction: formData.Direction || 'outbound-api',
        CallDuration: formData.CallDuration,
        ErrorCode: errorCode || null,
        ErrorMessage: errorMessage || null,
        SessionId: sessionId,
        Timestamp: new Date().toISOString(),
        leadId: formData.leadId || null
      };
      
      // Don't await this to avoid slowing down the response
      forwardCallData(callData);
    }

    // Handle dial action with proper handling of error codes
    if (isDialAction) {
      console.log(`[${requestId}] Processing dial action response: Status=${dialCallStatus}, Error=${errorCode}`);
      
      // Clean up tracking for this number
      if (normalizedPhone) {
        const currentActive = sessionActiveDialing.get(normalizedPhone) || 0;
        if (currentActive > 0) {
          sessionActiveDialing.set(normalizedPhone, currentActive - 1);
        }
      }
      
      // Calculate how long the call has been in progress
      const dialStartTime = dialTimeouts.get(callSid) || 0;
      const dialDuration = Date.now() - dialStartTime;
      console.log(`[${requestId}] Call ${callSid} has been active for ${dialDuration}ms`);
      
      // Update call status data
      if (callStatusData.has(callSid)) {
        const statusData = callStatusData.get(callSid)!;
        statusData.lastUpdateTime = Date.now();
        statusData.currentStatus = dialCallStatus;
        statusData.dialComplete = true;
        statusData.errorCode = errorCode || statusData.errorCode;
        statusData.errorMessage = errorMessage || statusData.errorMessage;
        callStatusData.set(callSid, statusData);
      }

      // Handle call completion cases
      if (dialCallStatus === "completed" || dialCallStatus === "answered") {
        dialTimeouts.delete(callSid);
        console.log(`[${requestId}] Call ${callSid} was answered and completed normally`);
        
        const response = new twiml.VoiceResponse();
        response.hangup();
        return new Response(response.toString(), { headers: corsHeaders });
      } 
      else if (dialCallStatus === "no-answer" && dialDuration >= DIAL_TIMEOUT_MS) {
        console.log(`[${requestId}] Call ${callSid} rang for 30+ seconds with no answer`);
        
        const response = new twiml.VoiceResponse();
        response.say("This number did not answer after 30 seconds.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      }
      else if (dialCallStatus === "busy") {
        console.log(`[${requestId}] Number ${phoneNumber} is busy`);
        
        const response = new twiml.VoiceResponse();
        response.say("The number is busy. Please try again later.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      } 
      else if (dialCallStatus === "failed") {
        // Include error code in the log if available
        const logMessage = errorCode ? 
          `[${requestId}] Call to ${phoneNumber} failed with error code ${errorCode}: ${errorMessage}` :
          `[${requestId}] Call to ${phoneNumber} failed, will allow future attempts`;
        
        console.log(logMessage);
        
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
      // Handle JSON request for making a call
      console.log(`[${requestId}] Processing JSON outbound call request to: ${formData.phoneNumber}`);
      
      // Create TwiML for dialing
      const response = new twiml.VoiceResponse();
      const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
      
      // Format phone number (already happened above)
      const formattedPhone = phoneNumber; // Using the formatted version
      console.log(`[${requestId}] JSON Request: Dialing ${formattedPhone} with caller ID: ${callerId || "default"}`);
      
      // Add transcription if requested
      if (formData.transcribe === true || formData.transcribe === "true") {
        console.log(`[${requestId}] Enabling transcription for this call`);
        response.record({
          transcribe: true,
          transcribeCallback: formData.transcribeCallback || 
                            `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?leadId=${formData.leadId || ''}`,
          maxLength: 3600 // 1 hour max
        });
      }
      
      const dial = response.dial({
        callerId: callerId,
        timeout: 30,
        answerOnBridge: true,
        record: formData.record === "true" ? "record-from-answer" : "do-not-record",
        action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true&phoneNumber=${encodeURIComponent(formattedPhone)}&leadId=${formData.leadId || ''}`,
        method: "POST",
      });
      
      dial.number({
        statusCallback: formData.statusCallback || 
                      `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?leadId=${formData.leadId || ''}`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST"
      }, formattedPhone);
      
      const twimlResponse = response.toString();
      console.log(`[${requestId}] Generated TwiML for JSON request:`, twimlResponse);
      
      return new Response(twimlResponse, { headers: corsHeaders });
    } else if ((formData.CallStatus === "ringing" || !formData.CallStatus) && formData.phoneNumber) {
      // This is a form data request for an outbound call
      console.log(`[${requestId}] Processing form outbound call request to: ${formData.phoneNumber}`);
      
      const response = new twiml.VoiceResponse();
      const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
      
      // Format phone number (already happened above)
      const formattedPhone = phoneNumber; // Using the formatted version
      console.log(`[${requestId}] Form Request: Dialing ${formattedPhone} with caller ID: ${callerId || formData.From}`);
      
      // Setup transcription callbacks
      const transcribeCallback = formData.transcribeCallback || 
                                `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?leadId=${formData.leadId || ''}`;
      
      // Enable transcription if requested
      if (formData.transcribe === "true") {
        console.log(`[${requestId}] Enabling transcription for this call with callback: ${transcribeCallback}`);
        
        // Note: Direct <Record> before <Dial> doesn't work well for agent calls
        // It will record the entire call, but for transcription we'll handle it through Dial
      }
      
      const dial = response.dial({
        callerId: callerId || formData.From,
        timeout: 30,
        answerOnBridge: true,
        record: formData.record === "true" ? "record-from-answer" : "do-not-record",
        action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true&phoneNumber=${encodeURIComponent(formattedPhone)}&leadId=${formData.leadId || ''}`,
        method: "POST",
      });
      
      dial.number({
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
        statusCallback: formData.statusCallback || 
                      `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?leadId=${formData.leadId || ''}`,
      }, formattedPhone);
      
      const twimlResponse = response.toString();
      console.log(`[${requestId}] Generated TwiML for form request:`, twimlResponse);
      
      return new Response(twimlResponse, { headers: corsHeaders });
    } else if (formData.CallSid && formData.Caller && !formData.phoneNumber) {
      // This is an incoming call from Twilio
      console.log(`[${requestId}] Processing incoming call from Twilio: CallSid=${formData.CallSid}, Caller=${formData.Caller}`);
      
      // Look for phoneNumber in any potential parameter field
      let phoneNumber = null;
      for (const key in formData) {
        if (key.toLowerCase() === 'phonenumber' || (formData[key] && typeof formData[key] === 'string' && formData[key].match(/^\+?[0-9]+$/))) {
          phoneNumber = formData[key];
          break;
        }
      }
      
      if (phoneNumber) {
        console.log(`[${requestId}] Found phone number to dial: ${phoneNumber}`);
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        
        const response = new twiml.VoiceResponse();
        const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
        
        // Format phone number properly to ensure correct dialing
        const formattedPhone = formatPhoneNumberForDialing(phoneNumber);
        console.log(`[${requestId}] Dialing ${formattedPhone} with caller ID: ${callerId || formData.From}`);
        
        const dial = response.dial({
          callerId: callerId || formData.From,
          timeout: 30,
          answerOnBridge: true,
          action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true&phoneNumber=${encodeURIComponent(phoneNumber)}&leadId=${formData.leadId || ''}`,
          method: "POST",
        });
        
        dial.number(formattedPhone);
        
        const twimlResponse = response.toString();
        console.log(`[${requestId}] Generated TwiML for incoming call:`, twimlResponse);
        
        return new Response(twimlResponse, { headers: corsHeaders });
      } else {
        // This is just a status callback or other type of request
        console.log(`[${requestId}] Status update or unrecognized request with CallSid=${formData.CallSid}`);
        
        // Generate an empty TwiML response
        const response = new twiml.VoiceResponse();
        return new Response(response.toString(), { headers: corsHeaders });
      }
    } else {
      // Handle any other unrecognized request type
      console.log(`[${requestId}] Unrecognized request type`);
      
      // Generate an empty TwiML response
      const response = new twiml.VoiceResponse();
      return new Response(response.toString(), { headers: corsHeaders });
    }

  } catch (error) {
    console.error(`[${requestId}] Uncaught error in twilio-voice function:`, error);
    
    // Even on error, return a valid TwiML response
    const response = new twiml.VoiceResponse();
    response.say("An error occurred. Please try again later.");
    
    return new Response(response.toString(), { headers: corsHeaders });
  }
});
