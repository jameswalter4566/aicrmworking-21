
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
    console.log(`[${requestId}] SMS Send Multiple invoked`);

    // Parse request body
    const { messages, batchDelay = 1000 } = await req.json();
    
    if (!Array.isArray(messages) || messages.length === 0) {
      console.error(`[${requestId}] Missing or invalid messages array`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'A valid array of messages is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${requestId}] Processing batch of ${messages.length} messages`);

    // Define a proper public webhook URL for Twilio callbacks
    const publicUrl = Deno.env.get("PUBLIC_URL") || 
                     "https://ba480dba-df9a-497b-8dad-ad3edcc6e9d9.lovableproject.com";
    
    // Format: https://{domain}/supabase/functions/v1/{function-name}
    const statusCallbackUrl = `${publicUrl}/supabase/functions/v1/sms-webhook-receiver`;
    
    // Process messages with a small delay between batches to avoid rate limits
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const msg of messages) {
      // Validate individual message
      if (!msg.phoneNumber || !msg.message) {
        console.error(`[${requestId}] Invalid message format: missing required fields`, msg);
        results.push({
          success: false,
          phoneNumber: msg.phoneNumber || 'unknown',
          error: 'Phone number and message are required',
        });
        failureCount++;
        continue;
      }

      try {
        // Format the phone number
        const formattedPhoneNumber = formatPhoneNumber(msg.phoneNumber);
        
        // Send SMS using Twilio
        const twilioResponse = await sendSMS(
          formattedPhoneNumber,
          msg.message,
          {
            statusCallback: statusCallbackUrl,
            prioritize: Boolean(msg.prioritize)
          }
        );
        
        if (twilioResponse.success) {
          console.log(`[${requestId}] Successfully sent SMS to ${formattedPhoneNumber}`);
          results.push({
            success: true,
            phoneNumber: msg.phoneNumber,
            messageId: twilioResponse.messageId,
            status: twilioResponse.status
          });
          successCount++;
        } else {
          console.error(`[${requestId}] Failed to send SMS to ${formattedPhoneNumber}:`, twilioResponse.error);
          results.push({
            success: false,
            phoneNumber: msg.phoneNumber,
            error: twilioResponse.error || 'Unknown error'
          });
          failureCount++;
        }
        
        // Add a small delay between messages to avoid rate limiting
        if (messages.length > 1) {
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
      } catch (error) {
        console.error(`[${requestId}] Error processing message to ${msg.phoneNumber}:`, error);
        results.push({
          success: false,
          phoneNumber: msg.phoneNumber,
          error: error.message || 'Unknown error'
        });
        failureCount++;
      }
    }
    
    // Return the batch results
    console.log(`[${requestId}] Batch complete: ${successCount} successful, ${failureCount} failed`);
    
    return new Response(
      JSON.stringify({
        success: true,
        total: messages.length,
        successful: successCount,
        failed: failureCount,
        results: results,
        requestId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error(`[${requestId}] Error in SMS Send Multiple:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        requestId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
