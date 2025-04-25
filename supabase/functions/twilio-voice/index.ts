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

// Keep track of blacklisted numbers to prevent repeated attempts
const blacklistedNumbers = new Set<string>();

// Monitor attempts per call to prevent excessive retries
const callAttempts = new Map<string, number>();
const MAX_ATTEMPTS = 3;

serve(async (req) => {
  console.log("Received request to Twilio Voice function");

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let method;
    let formData;

    if (req.headers.get('Content-Type')?.includes('application/json')) {
      // Handle JSON requests from our own frontend
      method = 'json';
      formData = await req.json();
      console.log("Received JSON request:", JSON.stringify(formData));
    } else {
      // Handle form data from Twilio webhooks
      method = 'form';
      formData = {};
      const params = await req.formData();
      for (const [key, value] of params.entries()) {
        formData[key] = value;
      }
      console.log("Received form data request:", JSON.stringify(formData));
    }

    // Check for dial action with blacklisted number error
    if (formData.dialAction === "true" || formData.DialCallStatus === "failed") {
      console.log("Processing dial action response");
      
      const callSid = formData.CallSid || "";
      const errorCode = formData.ErrorCode || "";
      const errorMessage = formData.ErrorMessage || "";
      const dialCallStatus = formData.DialCallStatus || "";
      const phoneNumber = formData.phoneNumber || "";
      
      // Check if this is a blacklisted phone number
      if (errorCode === "13225" || errorMessage?.includes("blacklisted")) {
        console.log(`Phone number ${phoneNumber} is blacklisted, blocking further attempts`);
        
        // Add to our blacklist cache
        if (phoneNumber) {
          blacklistedNumbers.add(phoneNumber);
          console.log(`Added ${phoneNumber} to blacklist cache. Current blacklist:`, Array.from(blacklistedNumbers));
        }
        
        // Return TwiML that ends the call rather than attempting to dial again
        const response = new twiml.VoiceResponse();
        response.say("This number is blacklisted and cannot be called.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      }
      
      // Check for too many attempts
      if (callSid) {
        const attempts = callAttempts.get(callSid) || 0;
        if (attempts >= MAX_ATTEMPTS) {
          console.log(`Max attempts (${MAX_ATTEMPTS}) reached for call ${callSid}, ending call`);
          
          const response = new twiml.VoiceResponse();
          response.say("The call cannot be completed at this time. Maximum retry attempts reached.");
          response.hangup();
          
          return new Response(response.toString(), { headers: corsHeaders });
        }
        
        // Increment attempt counter
        callAttempts.set(callSid, attempts + 1);
        console.log(`Call ${callSid} attempt ${attempts + 1} of ${MAX_ATTEMPTS}`);
      }
    }

    // Handle different request types
    if (method === 'json' && formData.action === 'hangupAll') {
      // Handle request to hang up all active calls
      console.log("Attempting to hang up all active calls");
      
      try {
        const twilioClient = twilio(
          Deno.env.get("TWILIO_ACCOUNT_SID"),
          Deno.env.get("TWILIO_AUTH_TOKEN")
        );
        
        // Get all active calls
        const calls = await twilioClient.calls.list({status: 'in-progress'});
        console.log(`Found ${calls.length} active calls`);
        
        // Hang up each active call
        for (const call of calls) {
          try {
            await twilioClient.calls(call.sid).update({status: 'completed'});
            console.log(`Hung up call ${call.sid}`);
          } catch (err) {
            console.error(`Failed to hang up call ${call.sid}:`, err);
          }
        }
        
        return new Response(JSON.stringify({ success: true, hungUpCount: calls.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error("Error hanging up calls:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (method === 'json' && formData.phoneNumber) {
      // Handle JSON request for making a call
      console.log(`Processing JSON outbound call request to: ${formData.phoneNumber}`);
      
      const phoneNumber = formData.phoneNumber;
      
      // Check if this phone number is blacklisted
      if (blacklistedNumbers.has(phoneNumber)) {
        console.log(`Rejecting call to blacklisted number ${phoneNumber}`);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "This number is blacklisted and cannot be called."
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Create TwiML for dialing
      const response = new twiml.VoiceResponse();
      
      // Get caller ID from environment
      const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
      
      // Format phone number
      let formattedPhone = formData.phoneNumber;
      if (!formattedPhone.startsWith('+') && !formattedPhone.includes('client:')) {
        formattedPhone = '+' + formattedPhone.replace(/\D/g, '');
      }
      
      console.log(`JSON Request: Dialing ${formattedPhone} with caller ID: ${callerId || "default"}`);
      
      // Use <Dial> verb with proper options
      const dial = response.dial({
        callerId: callerId,
        timeout: 30,
        answerOnBridge: true,
        action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true`,
        method: "POST",
      });
      
      // Add the number to dial
      dial.number(formattedPhone);
      
      const twimlResponse = response.toString();
      console.log("Generated TwiML for JSON request:", twimlResponse);
      
      return new Response(twimlResponse, { headers: corsHeaders });
    } else if (formData.CallStatus === "ringing" && formData.phoneNumber) {
      // This is a form data request for an outbound call
      console.log(`Processing form outbound call request to: ${formData.phoneNumber}`);
      
      const phoneNumber = formData.phoneNumber;
      
      // Check if this phone number is blacklisted
      if (blacklistedNumbers.has(phoneNumber)) {
        console.log(`Rejecting call to blacklisted number ${phoneNumber}`);
        
        const response = new twiml.VoiceResponse();
        response.say("This number is blacklisted and cannot be called.");
        response.hangup();
        
        return new Response(response.toString(), { headers: corsHeaders });
      }
      
      // Create TwiML for dialing
      const response = new twiml.VoiceResponse();
      
      // Get caller ID from environment or use the From parameter
      const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
      
      // Format phone number
      let formattedPhone = formData.phoneNumber;
      if (!formattedPhone.startsWith('+') && !formattedPhone.includes('client:')) {
        formattedPhone = '+' + formattedPhone.replace(/\D/g, '');
      }
      
      console.log(`Form Request: Dialing ${formattedPhone} with caller ID: ${callerId || formData.From}`);
      
      // Use <Dial> verb with proper options
      const dial = response.dial({
        callerId: callerId || formData.From,
        timeout: 30,
        answerOnBridge: true,
        action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true`,
        method: "POST",
      });
      
      // Add the number to dial
      dial.number(formattedPhone);
      
      const twimlResponse = response.toString();
      console.log("Generated TwiML for form request:", twimlResponse);
      
      return new Response(twimlResponse, { headers: corsHeaders });
    } else if (formData.CallSid && formData.Caller && !formData.phoneNumber) {
      // This is an incoming call from Twilio - the key pattern to check for
      console.log(`Processing incoming call from Twilio: CallSid=${formData.CallSid}, Caller=${formData.Caller}`);
      
      // We need to check if this contains phoneNumber in parameters
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
        console.log(`Found phone number to dial: ${phoneNumber}`);
        
        // Check if this phone number is blacklisted
        if (blacklistedNumbers.has(phoneNumber)) {
          console.log(`Rejecting call to blacklisted number ${phoneNumber}`);
          
          const response = new twiml.VoiceResponse();
          response.say("This number is blacklisted and cannot be called.");
          response.hangup();
          
          return new Response(response.toString(), { headers: corsHeaders });
        }
        
        // Create TwiML for dialing
        const response = new twiml.VoiceResponse();
        
        // Get caller ID from environment or use the From parameter
        const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
        
        // Format phone number
        let formattedPhone = phoneNumber;
        if (!formattedPhone.startsWith('+') && !formattedPhone.includes('client:')) {
          formattedPhone = '+' + formattedPhone.replace(/\D/g, '');
        }
        
        console.log(`Dialing ${formattedPhone} with caller ID: ${callerId || formData.From}`);
        
        // Use <Dial> verb with proper options
        const dial = response.dial({
          callerId: callerId || formData.From,
          timeout: 30,
          answerOnBridge: true,
          action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true`,
          method: "POST",
        });
        
        // Add the number to dial
        dial.number(formattedPhone);
        
        const twimlResponse = response.toString();
        console.log("Generated TwiML for incoming call:", twimlResponse);
        
        return new Response(twimlResponse, { headers: corsHeaders });
      } else {
        // This is just a status callback or other type of request
        console.log("No phone number found to dial, handling as a status callback");
        const response = new twiml.VoiceResponse();
        return new Response(response.toString(), { headers: corsHeaders });
      }
    } else if (formData.DialCallStatus || formData.dialAction) {
      // Handle dial action callback
      console.log(`Received dial action callback: ${formData.DialCallStatus || 'unknown'}`);
      
      // Return empty TwiML to end the call if there was an error or if call is completed
      const response = new twiml.VoiceResponse();
      
      if (formData.ErrorCode === "13225" || formData.DialCallStatus === 'failed' || 
          formData.DialCallStatus === 'busy' || formData.DialCallStatus === 'no-answer') {
        // Add blacklisted number to our cache if applicable
        if (formData.ErrorCode === "13225" && formData.phoneNumber) {
          blacklistedNumbers.add(formData.phoneNumber);
          console.log(`Added ${formData.phoneNumber} to blacklist cache from dial action`);
        }
        
        response.say("The call could not be completed. The number may be unreachable or blacklisted.");
        response.hangup();
      }
      
      return new Response(response.toString(), { headers: corsHeaders });
    } else if (formData.CallStatus && formData.CallbackSource === "call-progress-events") {
      // Handle Twilio status callback
      console.log(`Detected Twilio status callback: {
        callSid: "${formData.CallSid}",
        callStatus: "${formData.CallStatus}",
        callbackSource: "${formData.CallbackSource || 'unknown'}"
      }`);
      
      // Just acknowledge with a 200 OK and empty TwiML for status callbacks
      const response = new twiml.VoiceResponse();
      return new Response(response.toString(), { headers: corsHeaders });
    } else {
      // Default fallback - log the full request for debugging
      console.warn("Unhandled request type received:", JSON.stringify(formData, null, 2));
      
      // Check specifically for phoneNumber in any format we might have missed
      let phoneNumber = formData.phoneNumber || formData.PhoneNumber || formData.Phonenumber || formData.phonenumber;
      
      if (phoneNumber) {
        // Check if this phone number is blacklisted
        if (blacklistedNumbers.has(phoneNumber)) {
          console.log(`Rejecting call to blacklisted number ${phoneNumber} in fallback handler`);
          
          const response = new twiml.VoiceResponse();
          response.say("This number is blacklisted and cannot be called.");
          response.hangup();
          
          return new Response(response.toString(), { headers: corsHeaders });
        }
        
        console.log(`Found phone number in fallback handler: ${phoneNumber}`);
        
        // Create TwiML for dialing as a last resort
        const response = new twiml.VoiceResponse();
        
        // Get caller ID from environment
        const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
        
        // Format phone number
        let formattedPhone = phoneNumber;
        if (!formattedPhone.startsWith('+') && !formattedPhone.includes('client:')) {
          formattedPhone = '+' + formattedPhone.replace(/\D/g, '');
        }
        
        console.log(`Fallback: Dialing ${formattedPhone} with caller ID: ${callerId || "default"}`);
        
        // Use <Dial> verb with proper options
        const dial = response.dial({
          callerId: callerId,
          timeout: 30,
          answerOnBridge: true,
          action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true`,
          method: "POST",
        });
        
        dial.number(formattedPhone);
        
        const twimlResponse = response.toString();
        console.log("Generated TwiML in fallback:", twimlResponse);
        
        return new Response(twimlResponse, { headers: corsHeaders });
      }
      
      // If we still couldn't figure out what to do, return a basic response
      const response = new twiml.VoiceResponse();
      response.say("We're sorry, but we couldn't process your request.");
      return new Response(response.toString(), { headers: corsHeaders });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    
    // Return a proper TwiML response with error message
    const response = new twiml.VoiceResponse();
    response.say("We encountered an error processing your request.");
    
    return new Response(response.toString(), { 
      status: 200,  // Return 200 even for errors to avoid Twilio retries
      headers: corsHeaders
    });
  }
});
