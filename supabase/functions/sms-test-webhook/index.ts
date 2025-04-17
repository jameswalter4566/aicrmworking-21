
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
    // Parse request body
    const { phoneNumber, message, format = "json" } = await req.json();
    
    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({
          error: 'Phone number and message are required',
          example: {
            phoneNumber: "+15551234567",
            message: "Your test message",
            format: "json or form" // Optional
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Create Supabase client to make internal calls
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`Testing webhook with phone: ${phoneNumber}, message: ${message}, format: ${format}`);
    
    // Create payload based on format
    let webhookUrl = `${supabaseUrl}/functions/v1/sms-webhook-receiver`;
    let response;
    
    if (format === "form") {
      // Test with form-urlencoded format (common for SMS providers)
      const formData = new URLSearchParams();
      formData.append('from', phoneNumber);
      formData.append('text', message);
      formData.append('device_id', 'test-device');
      
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });
    } else {
      // Default to JSON format
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: phoneNumber,
          message: message,
          device_id: 'test-device'
        })
      });
    }
    
    // Get the response from the webhook
    const webhookResponse = await response.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test webhook sent successfully',
        webhookResponse,
        status: response.status
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error testing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
