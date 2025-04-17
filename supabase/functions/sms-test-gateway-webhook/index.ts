
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import * as base64 from "https://deno.land/std@0.177.0/encoding/base64.ts";

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
    const { phoneNumber, message, includeSignature = true } = await req.json();
    
    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({
          error: 'Phone number and message are required',
          example: {
            phoneNumber: "+15551234567",
            message: "Your test message",
            includeSignature: true  // Optional
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
    
    const smsApiKey = Deno.env.get("SMS_API_KEY");
    
    console.log(`Testing SMS Gateway webhook format with phone: ${phoneNumber}, message: ${message}`);
    
    // Create the SMS Gateway format payload
    const webhookUrl = `${supabaseUrl}/functions/v1/sms-webhook-receiver`;
    
    // Create the messages array in their format
    const messagesObject = [
      {
        ID: "1",
        number: phoneNumber,
        message: message,
        deviceID: "test-device",
        simSlot: "0",
        userID: "1",
        status: "Received",
        sentDate: new Date().toISOString(),
        deliveredDate: new Date().toISOString(),
        groupID: null
      }
    ];
    
    // Convert to JSON string as expected by their webhook
    const messagesJson = JSON.stringify(messagesObject);
    
    // Create form data
    const formData = new URLSearchParams();
    formData.append('messages', messagesJson);
    
    // Headers for the request
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    
    // Add signature if requested and API key available
    if (includeSignature && smsApiKey) {
      // Calculate HMAC SHA-256 signature as shown in their PHP example
      const key = new TextEncoder().encode(smsApiKey);
      const messageBytes = new TextEncoder().encode(messagesJson);
      
      const hmacKey = await crypto.subtle.importKey(
        "raw", 
        key, 
        { name: "HMAC", hash: "SHA-256" }, 
        false, 
        ["sign"]
      );
      
      const hmacSignature = await crypto.subtle.sign(
        "HMAC",
        hmacKey,
        messageBytes
      );
      
      const signature = base64.encode(hmacSignature);
      headers['X-SG-Signature'] = signature;
      console.log("Added signature:", signature);
    }
    
    // Send the webhook
    console.log("Sending webhook to:", webhookUrl);
    console.log("Webhook payload:", messagesJson);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: headers,
      body: formData.toString()
    });
    
    // Get the response from the webhook
    const responseBody = await response.text();
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseBody);
    } catch (e) {
      console.log("Response is not valid JSON:", responseBody);
      parsedResponse = { raw: responseBody };
    }
    
    return new Response(
      JSON.stringify({
        success: response.ok,
        message: response.ok ? 'Test webhook sent successfully' : 'Error sending test webhook',
        webhookResponse: parsedResponse,
        status: response.status,
        requestHeaders: headers,
        requestBody: {
          messages: messagesObject
        }
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
