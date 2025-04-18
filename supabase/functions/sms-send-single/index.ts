
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

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
    
    // Get SMS API credentials from environment variables
    const smsApiKey = Deno.env.get("SMS_API_KEY");
    const smsApiUrl = Deno.env.get("SMS_API_URL") || "https://app.smsgatewayhub.com/api/v2/SendSMS";
    
    if (!smsApiKey) {
      throw new Error("SMS API key is not configured");
    }
    
    // Prepare the request to the SMS Gateway
    const formData = new URLSearchParams();
    formData.append('APIKey', smsApiKey);
    formData.append('number', phoneNumber);
    formData.append('message', message);
    formData.append('prioritize', prioritize ? '1' : '0');
    
    // Send the SMS via the gateway API
    const smsResponse = await fetch(smsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    
    if (!smsResponse.ok) {
      let errorBody;
      try {
        errorBody = await smsResponse.text();
      } catch (e) {
        errorBody = "Could not read response";
      }
      
      console.error(`[${requestId}] SMS Gateway error: Status ${smsResponse.status}, Body: ${errorBody}`);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `SMS Gateway returned status ${smsResponse.status}`,
          details: errorBody
        }),
        { 
          status: 502, // Bad Gateway
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Parse the SMS gateway response
    const gatewayResponse = await smsResponse.json();
    console.log(`[${requestId}] SMS Gateway response:`, JSON.stringify(gatewayResponse));
    
    if (!gatewayResponse.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: gatewayResponse.error || "SMS Gateway reported failure",
          gatewayResponse
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Success response
    console.log(`[${requestId}] SMS sent successfully to ${phoneNumber}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        messageId: gatewayResponse.id || gatewayResponse.messageId || requestId,
        gatewayResponse
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error sending SMS:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
