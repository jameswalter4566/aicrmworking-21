
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
    
    // Get SMS API credentials from environment variables
    const smsApiKey = Deno.env.get("SMS_API_KEY");
    const smsApiUrl = Deno.env.get("SMS_API_URL") || "https://app.smsgatewayhub.com/api/v2/SendSMS";
    
    if (!smsApiKey) {
      console.error(`[${requestId}] SMS API key is not configured`);
      throw new Error("SMS API key is not configured");
    }
    
    console.log(`[${requestId}] Using SMS API URL: ${smsApiUrl}`);

    // Log the API key (partially masked)
    const maskedKey = smsApiKey ? `${smsApiKey.substring(0, 3)}...${smsApiKey.substring(smsApiKey.length - 3)}` : 'undefined';
    console.log(`[${requestId}] Using API key: ${maskedKey}`);
    
    // Prepare the request to the SMS Gateway
    const formData = new URLSearchParams();
    formData.append('APIKey', smsApiKey);
    formData.append('number', phoneNumber);
    formData.append('message', message);
    formData.append('prioritize', prioritize ? '1' : '0');
    
    console.log(`[${requestId}] Request prepared, sending to SMS gateway`);
    
    // Validate URL before sending
    let validatedUrl;
    try {
      validatedUrl = new URL(smsApiUrl);
      console.log(`[${requestId}] Gateway URL validated: ${validatedUrl.origin}${validatedUrl.pathname}`);
    } catch (e) {
      console.error(`[${requestId}] Invalid SMS gateway URL: ${smsApiUrl}`, e);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid SMS gateway URL configuration',
          details: e.message,
          requestId
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Send the SMS via the gateway API
    const smsResponse = await fetch(smsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    
    console.log(`[${requestId}] SMS Gateway response status: ${smsResponse.status}`);
    
    if (!smsResponse.ok) {
      let errorBody;
      try {
        errorBody = await smsResponse.text();
        console.log(`[${requestId}] Full error response body: ${errorBody.substring(0, 500)}...`);

        // Check for Cloudflare or other challenge pages
        if (errorBody.includes('<html>') || errorBody.includes('<!DOCTYPE')) {
          console.error(`[${requestId}] Gateway returned HTML instead of API response. Possible Cloudflare challenge or incorrect URL.`);
        }
      } catch (e) {
        errorBody = "Could not read response";
      }
      
      console.error(`[${requestId}] SMS Gateway error: Status ${smsResponse.status}, Body: ${errorBody}`);
      console.error(`[${requestId}] Request data: phoneNumber=${phoneNumber.substring(0, 6)}***, message length=${message.length}`);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `SMS Gateway returned status ${smsResponse.status}`,
          details: errorBody,
          requestId
        }),
        { 
          status: 502, // Bad Gateway
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Parse the SMS gateway response
    let gatewayResponse;
    try {
      const responseText = await smsResponse.text();
      console.log(`[${requestId}] SMS Gateway raw response:`, responseText);
      gatewayResponse = JSON.parse(responseText);
    } catch (e) {
      console.error(`[${requestId}] Error parsing gateway response:`, e);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not parse SMS Gateway response",
          details: e.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`[${requestId}] SMS Gateway parsed response:`, JSON.stringify(gatewayResponse));
    
    if (!gatewayResponse.success) {
      console.error(`[${requestId}] Gateway reported failure:`, JSON.stringify(gatewayResponse));
      return new Response(
        JSON.stringify({
          success: false,
          error: gatewayResponse.error || "SMS Gateway reported failure",
          gatewayResponse,
          requestId
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
        gatewayResponse,
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
