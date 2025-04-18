
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { sendSMS, formatPhoneNumber } from '../_shared/twilio-sms.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] SMS Test function invoked`);
    
    // Parse request body
    const { phoneNumber, message } = await req.json();
    
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Phone number is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const testMessage = message || "This is a test message from Twilio SMS API";
    
    console.log(`[${requestId}] Sending test SMS to ${phoneNumber}: "${testMessage}"`);
    
    // Format phone number for Twilio
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    console.log(`[${requestId}] Formatted phone number: ${formattedPhoneNumber}`);
    
    // Send test SMS using Twilio
    const twilioResponse = await sendSMS(formattedPhoneNumber, testMessage);
    
    if (!twilioResponse.success) {
      console.error(`[${requestId}] Twilio Error:`, twilioResponse.error);
      
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
    console.log(`[${requestId}] SMS test sent successfully to ${phoneNumber}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Test SMS sent successfully via Twilio",
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
    console.error("Error in SMS test function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
