
// Twilio Voice Edge Function
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import twilio from "npm:twilio@4.10.0";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'text/xml',
};

const twiml = twilio.twiml;

// Server-side in-memory caches to track call data between function invocations
// These are session-scoped rather than permanent blacklists
const sessionTemporaryBlacklists = new Map<string, Set<string>>();
// Specifically track numbers that Twilio has directly indicated are blacklisted
const twilioBlacklistedNumbers = new Map<string, Set<string>>();
// Track call attempts for each session
const callAttempts = new Map<string, Map<string, number>>();
// Track no-answer timeouts for each session
const noAnswerTimeouts = new Map<string, Map<string, number>>();
const MAX_ATTEMPTS = 3;

// Track more granular call status data - required for proper tracking of call disposition
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
}>();

const lastAttemptTimestamps = new Map<string, Map<string, number>>();
const MIN_RETRY_INTERVAL_MS = 10000; // 10 seconds minimum between retries
const activeDialingAttempts = new Map<string, Map<string, number>>();

// Track dial timeouts for proper call disposition
const dialTimeouts = new Map<string, number>();
const DIAL_TIMEOUT_MS = 30000; // 30 seconds as per requirement

// Error codes that should cause temporary blacklisting
// Note: We'll only track session-specific blacklisting now, not global blacklisting
const BLACKLIST_ERROR_CODES = new Set(['13225']);

// Error codes that should cause session-temporary restrictions but NOT blacklisting
const RESTRICTION_ERROR_CODES = new Set(['13227', '21215', '21211']);

serve(async (req) => {
  console.log("Received request to Twilio Voice function");

  // Helper function to normalize phone numbers for consistent tracking
  const normalizePhoneNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return '';
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    return digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
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
      // Handle JSON requests from our own frontend
      method = 'json';
      formData = await req.json();
      console.log(`[${requestId}] Received JSON request:`, JSON.stringify(formData));
    } else {
      // Handle form data from Twilio webhooks
      method = 'form';
      const params = await req.formData();
      for (const [key, value] of params.entries()) {
        formData[key] = value;
      }
      console.log(`[${requestId}] Received form data request:`, JSON.stringify(formData));
    }

    // Extract session ID (for session-scoped blacklisting)
    // This could be provided as a parameter or extracted from the leadId
    const sessionId = formData.sessionId || formData.dialingSessionId || 'default-session';
    
    // Initialize session blacklist if it doesn't exist
    if (!sessionTemporaryBlacklists.has(sessionId)) {
      sessionTemporaryBlacklists.set(sessionId, new Set<string>());
      twilioBlacklistedNumbers.set(sessionId, new Set<string>());
      callAttempts.set(sessionId, new Map<string, number>());
      lastAttemptTimestamps.set(sessionId, new Map<string, number>());
      activeDialingAttempts.set(sessionId, new Map<string, number>());
      noAnswerTimeouts.set(sessionId, new Map<string, number>());
      console.log(`[${requestId}] Created new session tracking for session ${sessionId}`);
    }
    
    // Get the session-specific tracking data
    const sessionBlacklist = sessionTemporaryBlacklists.get(sessionId)!;
    const twilioReportedBlacklist = twilioBlacklistedNumbers.get(sessionId)!;
    const sessionCallAttempts = callAttempts.get(sessionId)!;
    const sessionLastAttempts = lastAttemptTimestamps.get(sessionId)!;
    const sessionActiveDialing = activeDialingAttempts.get(sessionId)!;
    const sessionNoAnswerTimeouts = noAnswerTimeouts.get(sessionId)!;

    // Extract key data from the request
    const phoneNumber = formData.phoneNumber;
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : '';
    const callSid = formData.CallSid || '';
    const dialCallStatus = formData.DialCallStatus || '';
    const errorCode = formData.ErrorCode || '';
    const errorMessage = formData.ErrorMessage || '';
    const isDialAction = formData.dialAction === "true" || req.url.includes('dialAction=true');
    
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
        dialComplete: false
      });
    }
    
    // Start tracking dial timeout if this is a fresh outbound call
    if (phoneNumber && !isDialAction && callSid && !dialTimeouts.has(callSid)) {
      // Record the start time for this dial attempt
      dialTimeouts.set(callSid, Date.now());
      console.log(`[${requestId}] Started dial timeout tracking for ${callSid}`);
      
      // Update call status data
      if (callStatusData.has(callSid)) {
        const statusData = callStatusData.get(callSid)!;
        statusData.wasDialed = true;
        statusData.attempts++;
        callStatusData.set(callSid, statusData);
      }
    }

    // Check if Twilio has already blacklisted this number - this is an external blacklist we can't control
    if (phoneNumber && twilioReportedBlacklist.has(normalizedPhone)) {
      console.log(`[${requestId}] Phone number ${phoneNumber} was previously reported as blacklisted by Twilio`);
      const response = new twiml.VoiceResponse();
      response.say("This number has been blacklisted by Twilio and cannot be called.");
      response.hangup();
      return new Response(response.toString(), { headers: corsHeaders });
    }

    // Handle phone number check early - but only session blacklist numbers that have proper call status recorded
    if (phoneNumber && sessionBlacklist.has(normalizedPhone)) {
      console.log(`[${requestId}] Phone number ${phoneNumber} is session-blacklisted, preventing dial`);
      
      const response = new twiml.VoiceResponse();
      response.say("This number is temporarily restricted in the current session due to previous failed call attempts.");
      response.hangup();
      
      return new Response(response.toString(), { headers: corsHeaders });
    }
    
    // Check for throttling (too many rapid attempts)
    if (phoneNumber && sessionLastAttempts.has(normalizedPhone)) {
      const now = Date.now();
      const lastAttempt = sessionLastAttempts.get(normalizedPhone)!;
      if (now - lastAttempt < MIN_RETRY_INTERVAL_MS) {
        console.log(`[${requestId}] Too many rapid attempts for ${phoneNumber}, throttling`);
        
        const response = new twiml.VoiceResponse();
        response.say("Please wait before trying this number again.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      }
    }
    
    // Track this attempt time if we have a valid phone number
    if (phoneNumber) {
      sessionLastAttempts.set(normalizedPhone, Date.now());
      
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
        
        // Increment attempt counter for this number
        const attempts = sessionCallAttempts.get(normalizedPhone) || 0;
        sessionCallAttempts.set(normalizedPhone, attempts + 1);
        
        console.log(`[${requestId}] Now dialing ${phoneNumber}, attempt #${attempts + 1} for this session`);
      }
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
        callStatusData.set(callSid, statusData);
      }
      
      // Check if this is a Twilio blacklist error - this means the number is blacklisted by Twilio, not by our system
      if (errorCode === "13225" || errorMessage?.includes("blacklisted")) {
        console.log(`[${requestId}] Phone number ${phoneNumber} is blacklisted by Twilio`);
        
        // Add to Twilio blacklist tracking
        if (phoneNumber) {
          twilioReportedBlacklist.add(normalizedPhone);
          console.log(`[${requestId}] Added ${phoneNumber} (${normalizedPhone}) to Twilio blacklist tracking`);
        }
        
        // Return TwiML that ends the call
        const response = new twiml.VoiceResponse();
        response.say("This number is blacklisted by Twilio and cannot be called.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      }
      
      // Handle session-temporary restrictions (not blacklisting)
      if (RESTRICTION_ERROR_CODES.has(errorCode)) {
        console.log(`[${requestId}] Phone number ${phoneNumber} has a restriction error: ${errorCode} - ${errorMessage}`);
        
        // Return TwiML that ends the call with appropriate message
        const response = new twiml.VoiceResponse();
        response.say("This number cannot be called due to restrictions. Please verify the number and try again later.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      }
      
      // Handle call completion cases for proper session blacklisting
      if (dialCallStatus === "completed" || dialCallStatus === "answered") {
        // Call was answered - remove any dial timeout tracking
        dialTimeouts.delete(callSid);
        console.log(`[${requestId}] Call ${callSid} was answered and completed normally`);
        
        const response = new twiml.VoiceResponse();
        response.hangup();
        return new Response(response.toString(), { headers: corsHeaders });
      } 
      else if (dialCallStatus === "no-answer" && dialDuration >= DIAL_TIMEOUT_MS) {
        // Call rang for 30+ seconds with no answer - add to session blacklist to prevent retries
        console.log(`[${requestId}] Call ${callSid} rang for 30+ seconds with no answer, adding to session blacklist`);
        
        if (phoneNumber) {
          sessionBlacklist.add(normalizedPhone);
          console.log(`[${requestId}] Added ${phoneNumber} (${normalizedPhone}) to session blacklist due to no-answer timeout`);
        }
        
        const response = new twiml.VoiceResponse();
        response.say("This number did not answer after 30 seconds and has been temporarily restricted for this session.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      }
      else if (dialCallStatus === "busy") {
        // Number is busy - don't blacklist, but end the call
        console.log(`[${requestId}] Number ${phoneNumber} is busy`);
        
        const response = new twiml.VoiceResponse();
        response.say("The number is busy. Please try again later.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      } 
      else if (dialCallStatus === "failed") {
        // Check for too many attempts
        const attempts = sessionCallAttempts.get(normalizedPhone) || 0;
        
        if (attempts >= MAX_ATTEMPTS) {
          console.log(`[${requestId}] Max attempts (${MAX_ATTEMPTS}) reached for ${phoneNumber}, adding to session blacklist`);
          
          if (phoneNumber) {
            sessionBlacklist.add(normalizedPhone);
            console.log(`[${requestId}] Added ${phoneNumber} (${normalizedPhone}) to session blacklist due to max attempts reached`);
          }
          
          const response = new twiml.VoiceResponse();
          response.say("The call cannot be completed at this time. Maximum retry attempts reached.");
          response.hangup();
          
          return new Response(response.toString(), { headers: corsHeaders });
        }
        
        // Retry logic for failed calls - typically through the AutoDialer
        const response = new twiml.VoiceResponse();
        response.say("Call failed. You may retry this number later.");
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
    } else if (method === 'json' && formData.action === 'clearSessionBlacklist') {
      // Add handler to clear a session's blacklist
      const targetSessionId = formData.sessionId || 'default-session';
      
      if (sessionTemporaryBlacklists.has(targetSessionId)) {
        sessionTemporaryBlacklists.set(targetSessionId, new Set<string>());
        console.log(`[${requestId}] Cleared blacklist for session ${targetSessionId}`);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Blacklist cleared for session ${targetSessionId}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (method === 'json' && formData.phoneNumber) {
      // Handle JSON request for making a call
      console.log(`[${requestId}] Processing JSON outbound call request to: ${formData.phoneNumber}`);
      
      // Create TwiML for dialing
      const response = new twiml.VoiceResponse();
      
      // Get caller ID from environment
      const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
      
      // Format phone number
      let formattedPhone = formData.phoneNumber;
      if (!formattedPhone.startsWith('+') && !formattedPhone.includes('client:')) {
        formattedPhone = '+' + formattedPhone.replace(/\D/g, '');
      }
      
      console.log(`[${requestId}] JSON Request: Dialing ${formattedPhone} with caller ID: ${callerId || "default"}`);
      
      // Use <Dial> verb with proper options and include phoneNumber in action URL
      const dial = response.dial({
        callerId: callerId,
        timeout: 30,
        answerOnBridge: true,
        action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true&phoneNumber=${encodeURIComponent(formData.phoneNumber)}`,
        method: "POST",
      });
      
      // Add the number to dial
      dial.number(formattedPhone);
      
      const twimlResponse = response.toString();
      console.log(`[${requestId}] Generated TwiML for JSON request:`, twimlResponse);
      
      return new Response(twimlResponse, { headers: corsHeaders });
    } else if (formData.CallStatus === "ringing" && formData.phoneNumber) {
      // This is a form data request for an outbound call
      console.log(`[${requestId}] Processing form outbound call request to: ${formData.phoneNumber}`);
      
      // Create TwiML for dialing
      const response = new twiml.VoiceResponse();
      
      // Get caller ID from environment
      const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
      
      // Format phone number
      let formattedPhone = formData.phoneNumber;
      if (!formattedPhone.startsWith('+') && !formattedPhone.includes('client:')) {
        formattedPhone = '+' + formattedPhone.replace(/\D/g, '');
      }
      
      console.log(`[${requestId}] Form Request: Dialing ${formattedPhone} with caller ID: ${callerId || formData.From}`);
      
      // Use <Dial> verb with proper options and include phoneNumber in action URL
      const dial = response.dial({
        callerId: callerId || formData.From,
        timeout: 30,
        answerOnBridge: true,
        action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true&phoneNumber=${encodeURIComponent(formData.phoneNumber)}`,
        method: "POST",
      });
      
      // Add the number to dial
      dial.number(formattedPhone);
      
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
        // Found a phone number to dial
        console.log(`[${requestId}] Found phone number to dial: ${phoneNumber}`);
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        
        // Check if this number is session-blacklisted or Twilio-blacklisted
        if (sessionBlacklist.has(normalizedPhone)) {
          console.log(`[${requestId}] Rejecting call to session-blacklisted number ${phoneNumber}`);
          
          const response = new twiml.VoiceResponse();
          response.say("This number has been temporarily restricted in the current session due to failed call attempts.");
          response.hangup();
          
          return new Response(response.toString(), { headers: corsHeaders });
        }
        
        if (twilioReportedBlacklist.has(normalizedPhone)) {
          console.log(`[${requestId}] Rejecting call to Twilio-blacklisted number ${phoneNumber}`);
          
          const response = new twiml.VoiceResponse();
          response.say("This number has been blacklisted by Twilio and cannot be called.");
          response.hangup();
          
          return new Response(response.toString(), { headers: corsHeaders });
        }
        
        // Create TwiML for dialing
        const response = new twiml.VoiceResponse();
        
        // Get caller ID from environment
        const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
        
        // Format phone number
        let formattedPhone = phoneNumber;
        if (!formattedPhone.startsWith('+') && !formattedPhone.includes('client:')) {
          formattedPhone = '+' + formattedPhone.replace(/\D/g, '');
        }
        
        console.log(`[${requestId}] Dialing ${formattedPhone} with caller ID: ${callerId || formData.From}`);
        
        // Use <Dial> verb with proper options and include phoneNumber in action URL
        const dial = response.dial({
          callerId: callerId || formData.From,
          timeout: 30,
          answerOnBridge: true,
          action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true&phoneNumber=${encodeURIComponent(phoneNumber)}`,
          method: "POST",
        });
        
        // Add the number to dial
        dial.number(formattedPhone);
        
        const twimlResponse = response.toString();
        console.log(`[${requestId}] Generated TwiML for incoming call:`, twimlResponse);
        
        return new Response(twimlResponse, { headers: corsHeaders });
      } else {
        // This is just a status callback or other type of request
        console.log(`[${requestId}] No phone number found to dial, handling as a status callback`);
        const response = new twiml.VoiceResponse();
        return new Response(response.toString(), { headers: corsHeaders });
      }
    } else if (formData.CallStatus && formData.CallbackSource === "call-progress-events") {
      // Handle Twilio status callback
      console.log(`[${requestId}] Detected Twilio status callback: {
        callSid: "${formData.CallSid}",
        callStatus: "${formData.CallStatus}",
        callbackSource: "${formData.CallbackSource || 'unknown'}"
      }`);
      
      if (callStatusData.has(formData.CallSid)) {
        const statusData = callStatusData.get(formData.CallSid)!;
        statusData.currentStatus = formData.CallStatus;
        statusData.lastUpdateTime = Date.now();
        callStatusData.set(formData.CallSid, statusData);
      }
      
      // Just acknowledge with a 200 OK and empty TwiML for status callbacks
      const response = new twiml.VoiceResponse();
      return new Response(response.toString(), { headers: corsHeaders });
    } else {
      // Default fallback - log the full request for debugging
      console.warn(`[${requestId}] Unhandled request type received:`, JSON.stringify(formData, null, 2));
      
      // Check specifically for phoneNumber in any format we might have missed
      let phoneNumber = formData.phoneNumber || formData.PhoneNumber || formData.Phonenumber || formData.phonenumber;
      
      if (phoneNumber) {
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        
        // Check if this phone number is session-blacklisted or Twilio-blacklisted
        if (sessionBlacklist.has(normalizedPhone)) {
          console.log(`[${requestId}] Rejecting call to session-blacklisted number ${phoneNumber} in fallback handler`);
          
          const response = new twiml.VoiceResponse();
          response.say("This number has been temporarily restricted in the current session due to failed call attempts.");
          response.hangup();
          
          return new Response(response.toString(), { headers: corsHeaders });
        }
        
        if (twilioReportedBlacklist.has(normalizedPhone)) {
          console.log(`[${requestId}] Rejecting call to Twilio-blacklisted number ${phoneNumber} in fallback handler`);
          
          const response = new twiml.VoiceResponse();
          response.say("This number has been blacklisted by Twilio and cannot be called.");
          response.hangup();
          
          return new Response(response.toString(), { headers: corsHeaders });
        }
        
        console.log(`[${requestId}] Found phone number in fallback handler: ${phoneNumber}`);
        
        // Create TwiML for dialing as a last resort
        const response = new twiml.VoiceResponse();
        
        // Get caller ID from environment
        const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
        
        // Format phone number
        let formattedPhone = phoneNumber;
        if (!formattedPhone.startsWith('+') && !formattedPhone.includes('client:')) {
          formattedPhone = '+' + formattedPhone.replace(/\D/g, '');
        }
        
        console.log(`[${requestId}] Fallback: Dialing ${formattedPhone} with caller ID: ${callerId || "default"}`);
        
        // Use <Dial> verb with proper options and include phoneNumber in action URL
        const dial = response.dial({
          callerId: callerId,
          timeout: 30,
          answerOnBridge: true,
          action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true&phoneNumber=${encodeURIComponent(phoneNumber)}`,
          method: "POST",
        });
        
        dial.number(formattedPhone);
        
        const twimlResponse = response.toString();
        console.log(`[${requestId}] Generated TwiML in fallback:`, twimlResponse);
        
        return new Response(twimlResponse, { headers: corsHeaders });
      }
      
      // If we still couldn't figure out what to do, return a basic response
      const response = new twiml.VoiceResponse();
      response.say("We're sorry, but we couldn't process your request.");
      return new Response(response.toString(), { headers: corsHeaders });
    }
  } catch (error) {
    console.error(`[${requestId}] Error processing request:`, error);
    
    // Return a proper TwiML response with error message
    const response = new twiml.VoiceResponse();
    response.say("We encountered an error processing your request.");
    
    return new Response(response.toString(), { 
      status: 200,  // Return 200 even for errors to avoid Twilio retries
      headers: corsHeaders
    });
  }
});
