
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
    } else {
      // Handle form data from Twilio webhooks
      method = 'form';
      formData = {};
      const params = await req.formData();
      for (const [key, value] of params.entries()) {
        formData[key] = value;
      }
    }

    console.log(`Request method: ${method}, form data:`, formData);

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
    } else if (formData.CallStatus === "ringing" && formData.phoneNumber) {
      // This is the initial request for an outbound call
      console.log(`Processing outbound call request to phone: ${formData.phoneNumber}`);
      
      // Create TwiML to dial the phone number
      const response = new twiml.VoiceResponse();
      
      // Get caller ID from environment or use the From parameter
      const callerId = Deno.env.get("TWILIO_PHONE_NUMBER");
      
      // Format the phone number properly if needed
      let formattedPhone = formData.phoneNumber;
      if (!formattedPhone.startsWith('+') && !formattedPhone.includes('client:')) {
        formattedPhone = '+' + formattedPhone.replace(/\D/g, '');
      }
      
      console.log(`Dialing ${formattedPhone} with caller ID: ${callerId || "default"}`);
      
      // Using the <Dial> verb with proper options
      const dial = response.dial({
        callerId: callerId || formData.From,
        timeout: 30, // Ring for 30 seconds
        answerOnBridge: true, // For better audio quality
        action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true`,
        method: "POST",
      });
      
      // Add the number to dial
      dial.number(formattedPhone);
      
      const twimlResponse = response.toString();
      console.log("Generated TwiML for outgoing call:", twimlResponse);
      
      return new Response(twimlResponse, { headers: corsHeaders });
    } else if (formData.CallStatus) {
      // Handle Twilio status callback
      console.log(`Detected Twilio status callback: {
        callSid: "${formData.CallSid}",
        callStatus: "${formData.CallStatus}",
        callbackSource: "${formData.CallbackSource || 'unknown'}"
      }`);
      
      // Just acknowledge with a 200 OK and empty TwiML for status callbacks
      const response = new twiml.VoiceResponse();
      return new Response(response.toString(), { headers: corsHeaders });
    } else if (formData.dialAction || formData.DialCallStatus) {
      // Handle dial action callback
      console.log(`Received dial action callback: ${formData.DialCallStatus || 'unknown'}`);
      
      // Return empty TwiML to end the call
      const response = new twiml.VoiceResponse();
      return new Response(response.toString(), { headers: corsHeaders });
    } else if (formData.phoneNumber) {
      // Handle browser client call request - this is catching the JSON request case
      console.log(`Detected browser client call request with phoneNumber: ${formData.phoneNumber}`);
      
      // Create TwiML to dial the phone number
      const response = new twiml.VoiceResponse();
      
      // Using the <Dial> verb with proper options
      const dial = response.dial({
        callerId: Deno.env.get("TWILIO_PHONE_NUMBER"),
        timeout: 30, // Ring for 30 seconds
        answerOnBridge: true, // Preserve client audio
        action: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?dialAction=true`,
        method: "POST",
      });
      
      // Format the phone number properly
      let formattedPhone = formData.phoneNumber;
      if (!formattedPhone.startsWith('+') && !formattedPhone.includes('client:')) {
        formattedPhone = '+' + formattedPhone.replace(/\D/g, '');
      }
      
      dial.number(formattedPhone);
      
      console.log("Generated TwiML for outgoing call:", response.toString());
      
      return new Response(response.toString(), { headers: corsHeaders });
    } else {
      // Default response for unknown requests
      console.error("Unknown request type received:", formData);
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
