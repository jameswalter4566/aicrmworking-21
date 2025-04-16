
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function will handle incoming SMS webhook events from the SMS Gateway
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    let payload;
    
    // Check content type and parse accordingly
    const contentType = req.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data
      const formData = await req.formData();
      payload = {};
      for (const [key, value] of formData.entries()) {
        payload[key] = value;
      }
    } else {
      // Try to parse as JSON with fallback
      try {
        const text = await req.text();
        payload = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse webhook payload:", e);
        return new Response(
          JSON.stringify({ error: 'Invalid request format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    console.log("SMS webhook received: ", JSON.stringify(payload));

    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current timestamp in ISO format
    const now = new Date().toISOString();

    // Store the webhook data in the database
    const { data, error } = await supabase.from('sms_webhooks').insert({
      webhook_data: payload,
      processed: false,
      received_at: now
    });

    if (error) {
      console.error("Error storing webhook data:", error);
      return new Response(
        JSON.stringify({ error: 'Failed to store webhook data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log the important parts of the message for debugging
    const phoneNumber = payload.number || payload.from;
    const message = payload.message || payload.text || payload.content;
    const deviceNumber = payload.device_number || payload.to;
    
    console.log(`SMS received at ${now}:`);
    console.log(`- From: ${phoneNumber || 'unknown'}`);
    console.log(`- To: ${deviceNumber || 'unknown'}`);
    console.log(`- Message: ${message || 'no content'}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook received and stored successfully',
        timestamp: now
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error processing SMS webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
