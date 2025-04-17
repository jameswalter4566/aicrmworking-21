
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
    
    // Call the SMS Gateway API to register the webhook
    const response = await fetch(`${smsServerUrl}/services/register-webhook.php`, {
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
    
    // Handle response
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SMS Gateway API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || "Failed to register webhook");
    }
    
    console.log("Webhook registered successfully");
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook registered successfully",
        data: data
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
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
