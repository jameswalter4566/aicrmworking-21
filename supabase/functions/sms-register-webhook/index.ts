
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get SMS Gateway API credentials from environment variables
    const smsApiKey = Deno.env.get("SMS_API_KEY");
    const smsServerUrl = Deno.env.get("SMS_SERVER_URL") || "https://ryansmswizard.com";
    
    if (!smsApiKey) {
      throw new Error("SMS Gateway API key is not configured");
    }
    
    // Parse request body
    const { webhookUrl, eventType = "message_received" } = await req.json();
    
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Webhook URL is required" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log(`Registering webhook URL: ${webhookUrl} for event: ${eventType}`);
    
    // Try different potential endpoint paths
    // Based on the PHP example, let's try different potential endpoints
    const potentialEndpoints = [
      "services/register-webhook.php",
      "services/webhook-register.php",
      "services/webhook.php", 
      "services/webhooks.php",
      "services/settings/webhook.php"
    ];
    
    let successful = false;
    let responseData = null;
    let responseError = null;
    
    // Try each endpoint until we find one that works
    for (const endpoint of potentialEndpoints) {
      try {
        console.log(`Trying endpoint: ${smsServerUrl}/${endpoint}`);
        
        const response = await fetch(`${smsServerUrl}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            key: smsApiKey,
            url: webhookUrl,
            event: eventType
          }).toString()
        });
        
        // Log the actual response for debugging
        const responseText = await response.text();
        console.log(`API Response Status (${endpoint}): ${response.status}`);
        console.log(`API Response Body (${endpoint}): ${responseText}`);
        
        // Try to parse the response as JSON, but handle cases where it's not valid JSON
        try {
          const data = JSON.parse(responseText);
          
          if (response.ok && data.success) {
            successful = true;
            responseData = data;
            console.log(`Successful registration with endpoint: ${endpoint}`);
            break;
          }
          
          // Store the error in case all endpoints fail
          responseError = data.error?.message || `API Error with ${endpoint}: ${response.status}`;
        } catch (e) {
          console.log(`Response from ${endpoint} is not valid JSON: ${responseText}`);
          responseError = `Invalid JSON response from ${endpoint}: ${responseText.substring(0, 100)}...`;
        }
      } catch (fetchError) {
        console.error(`Error with endpoint ${endpoint}:`, fetchError);
        responseError = `Fetch error with ${endpoint}: ${fetchError.message}`;
      }
    }
    
    if (successful) {
      console.log("Webhook registered successfully");
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Webhook registered successfully",
          data: responseData
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      throw new Error(responseError || "Failed to register webhook with any endpoint");
    }
  } catch (error) {
    console.error("Error registering webhook:", error);
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
