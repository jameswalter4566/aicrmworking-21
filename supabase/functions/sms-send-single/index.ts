
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { sendSMS, formatPhoneNumber } from "../_shared/twilio-sms.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] SMS Send Single invoked`);

    // Parse request body
    const { phoneNumber, message, prioritize = false } = await req.json();
    
    if (!phoneNumber || !message) {
      console.error(`[${requestId}] Missing required parameters: phoneNumber=${phoneNumber}, message=${message ? 'provided' : 'missing'}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Phone number and message are required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${requestId}] Sending SMS to ${phoneNumber}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    // Format the phone number to E.164 standard
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    console.log(`[${requestId}] Formatted phone number: ${formattedPhoneNumber}`);
    
    // Define the webhook URL for status callbacks
    // This can be used to track delivery status
    const baseUrl = Deno.env.get("PUBLIC_URL") || req.url;
    const statusCallbackUrl = new URL("/functions/sms-webhook-receiver", new URL(baseUrl).origin).toString();
    
    // Send SMS using Twilio
    const twilioResponse = await sendSMS(
      formattedPhoneNumber,
      message,
      {
        statusCallback: statusCallbackUrl,
        prioritize // This won't be used by Twilio but kept for interface compatibility
      }
    );
    
    if (!twilioResponse.success) {
      console.error(`[${requestId}] Twilio error:`, twilioResponse.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to send SMS: ${twilioResponse.error}`,
          details: twilioResponse.details,
          requestId
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Success response
    console.log(`[${requestId}] SMS sent successfully to ${phoneNumber} with Twilio SID: ${twilioResponse.messageId}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        messageId: twilioResponse.messageId,
        status: twilioResponse.status,
        requestId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error(`[${requestId}] Error sending SMS:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
        requestId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
