
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

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
    
    const testMessage = message || "This is a test message from the SMS Gateway API";
    
    console.log(`[${requestId}] Sending test SMS to ${phoneNumber}: "${testMessage}"`);
    
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
    
    // Prepare the request to the SMS Gateway
    const formData = new URLSearchParams();
    formData.append('APIKey', smsApiKey);
    formData.append('number', phoneNumber);
    formData.append('message', testMessage);
    formData.append('prioritize', '1');
    
    try {
      console.log(`[${requestId}] Request prepared, sending to SMS gateway`);
      console.log(`[${requestId}] Request parameters: phoneNumber=${phoneNumber}, messageLength=${testMessage.length}`);
      
      // Send the SMS via the gateway API with proper browser-like headers
      const smsResponse = await fetch(smsApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://app.smsgatewayhub.com',
          'Referer': 'https://app.smsgatewayhub.com/'
        },
        body: formData.toString()
      });
      
      console.log(`[${requestId}] SMS Gateway response status: ${smsResponse.status}`);
      
      // Handle response
      if (!smsResponse.ok) {
        // Handle error response
        let errorBody;
        try {
          errorBody = await smsResponse.text();
          console.log(`[${requestId}] Full error response body: ${errorBody.substring(0, 500)}...`);

          // Check for Cloudflare or other challenge pages
          if (errorBody.includes('<html>') || errorBody.includes('<!DOCTYPE')) {
            console.error(`[${requestId}] Gateway returned HTML instead of API response. Possible Cloudflare challenge or incorrect URL.`);
            
            return new Response(
              JSON.stringify({
                success: false,
                error: 'SMS Gateway returned a Cloudflare challenge. Please verify your API credentials and URL.',
                alternativeSolutions: [
                  "Verify your SMS API URL is correct",
                  "Contact your SMS gateway provider to allow your IP addresses",
                  "Use an alternative SMS provider that doesn't use Cloudflare protection"
                ],
                requestId
              }),
              { 
                status: 403, // Forbidden
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        } catch (e) {
          errorBody = "Could not read response";
        }
        
        console.error(`[${requestId}] SMS Gateway error: Status ${smsResponse.status}, Body: ${errorBody}`);
        
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
      console.log(`[${requestId}] SMS test sent successfully to ${phoneNumber}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Test SMS sent successfully",
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
