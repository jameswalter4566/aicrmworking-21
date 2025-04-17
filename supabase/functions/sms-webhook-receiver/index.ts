
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import * as base64 from "https://deno.land/std@0.177.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sg-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get SMS Gateway API key for signature verification
    const smsApiKey = Deno.env.get("SMS_API_KEY");
    
    // Generate a unique request ID for tracking
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] SMS webhook received - URL: ${req.url}, Method: ${req.method}`);
    console.log(`[${requestId}] Headers:`, JSON.stringify(Object.fromEntries(req.headers.entries())));
    
    // Check for signature header if using their signature verification
    const signature = req.headers.get('x-sg-signature');
    if (signature) {
      console.log(`[${requestId}] Received signature: ${signature}`);
    }
    
    // Parse incoming webhook payload
    let payload;
    const contentType = req.headers.get('content-type');
    let rawBody = "";
    
    try {
      // First store the raw body for debugging and signature verification
      rawBody = await req.text();
      console.log(`[${requestId}] Raw body:`, rawBody);
      
      // Verify signature if present and API key is available
      if (signature && smsApiKey && rawBody.includes('messages')) {
        // Try to extract messages parameter as it seems to be what's signed
        const formData = new URLSearchParams(rawBody);
        const messagesParam = formData.get('messages');
        
        if (messagesParam) {
          // Create HMAC SHA-256 signature
          const key = new TextEncoder().encode(smsApiKey);
          const message = new TextEncoder().encode(messagesParam);
          
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
            message
          );
          
          const calculatedSignature = base64.encode(hmacSignature);
          console.log(`[${requestId}] Calculated signature: ${calculatedSignature}`);
          
          if (calculatedSignature !== signature) {
            console.warn(`[${requestId}] Signature mismatch. This could be normal during testing.`);
            // Note: We don't reject here during testing phase but would in production
          }
        }
      }
      
      // Then try to parse based on content type
      if (contentType && contentType.includes('application/json')) {
        payload = JSON.parse(rawBody);
      } else if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
        // Parse URL-encoded form data
        const params = new URLSearchParams(rawBody);
        payload = {};
        for (const [key, value] of params.entries()) {
          payload[key] = value;
          
          // Special handling for 'messages' which may be JSON string
          if (key === 'messages' && typeof value === 'string') {
            try {
              payload[key] = JSON.parse(value);
              console.log(`[${requestId}] Successfully parsed messages JSON:`, JSON.stringify(payload[key]));
            } catch (e) {
              console.log(`[${requestId}] Could not parse messages as JSON: ${e.message}`);
            }
          }
        }
      } else {
        // Try JSON as fallback
        try {
          payload = JSON.parse(rawBody);
        } catch (e) {
          // If not JSON, try form-urlencoded as fallback
          try {
            const params = new URLSearchParams(rawBody);
            payload = {};
            for (const [key, value] of params.entries()) {
              payload[key] = value;
            }
          } catch (formError) {
            // If still fails, create a payload with the raw body for debugging
            payload = { 
              _raw: rawBody,
              _parseError: "Could not parse as JSON or form data"
            };
          }
        }
      }
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse webhook payload:`, parseError);
      payload = { 
        _raw: rawBody,
        _parseError: parseError.message
      };
    }

    console.log(`[${requestId}] Parsed payload:`, JSON.stringify(payload));
    
    // Extract key information from messages format if it exists
    let phoneNumber = null;
    let message = null;
    let deviceId = null;
    
    // Check for the SMS Gateway specific messages format
    if (payload.messages && Array.isArray(payload.messages)) {
      // This appears to match their webhook format
      const firstMessage = payload.messages[0];
      if (firstMessage) {
        phoneNumber = firstMessage.number || firstMessage.from;
        message = firstMessage.message;
        deviceId = firstMessage.deviceID;
        
        console.log(`[${requestId}] Extracted from gateway messages format - Phone: ${phoneNumber}, Message: "${message?.substring(0, 30)}..."`);
      }
    } else {
      // Fall back to our generic extraction
      phoneNumber = payload.number || payload.from || payload.From || payload.sender || payload.Sender || 
                    payload.source || payload.Source || payload.msisdn || payload.phone;
                    
      message = payload.message || payload.text || payload.Text || payload.content || payload.Content || 
                payload.body || payload.Body || payload.msg || payload.Msg || payload.message_body;
      
      deviceId = payload.device_id || payload.deviceId || payload.DeviceId || payload.device || payload.Device;
      
      console.log(`[${requestId}] Extracted from generic format - Phone: ${phoneNumber}, Message begins: "${message?.substring(0, 30)}..."`);
    }
    
    if (!phoneNumber && !message) {
      // Special case - if we couldn't extract phone/message, this might be a test ping
      if (rawBody.includes("test") || payload?._raw?.includes("test")) {
        console.log(`[${requestId}] This appears to be a test ping`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Webhook test received successfully',
            timestamp: new Date().toISOString(),
            requestId
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.error(`[${requestId}] Missing phone number or message content`);
      return new Response(
        JSON.stringify({ 
          error: 'Phone number and message are required',
          receivedPayload: payload,
          expectedFormat: {
            messages: [
              {
                number: "Phone number of sender",
                message: "Text message content",
                deviceID: "Device ID"
              }
            ]
          },
          note: "The SMS Gateway format or common formats (Twilio, etc.) are supported"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check for duplicate message (prevent processing the same message multiple times)
    const { data: existingMessages, error: checkError } = await supabase
      .from('sms_webhooks')
      .select('id, processed')
      .eq('processed', false)
      .or(`webhook_data->number.eq.${phoneNumber},webhook_data->from.eq.${phoneNumber}`)
      .or(`webhook_data->message.eq."${message}",webhook_data->text.eq."${message}",webhook_data->body.eq."${message}"`)
      .order('received_at', { ascending: false })
      .limit(1);
    
    if (!checkError && existingMessages && existingMessages.length > 0) {
      console.log(`[${requestId}] Duplicate message detected from ${phoneNumber}: "${message?.substring(0, 30)}..."`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Duplicate message detected - not processing',
          duplicateId: existingMessages[0].id,
          requestId
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Store incoming message in the database
    const { data: webhookData, error } = await supabase.from('sms_webhooks').insert({
      webhook_data: payload,
      processed: false,
      received_at: new Date().toISOString(),
      request_id: requestId,
      message_hash: `${phoneNumber}:${message?.substring(0, 50)}` // For deduplication
    }).select('id');

    if (error) {
      console.error(`[${requestId}] Error storing webhook:`, error);
      return new Response(
        JSON.stringify({ error: 'Failed to store webhook data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const webhookId = webhookData![0].id;
    console.log(`[${requestId}] SMS stored with ID ${webhookId}`);
    console.log(`[${requestId}] From: ${phoneNumber}, Message: ${message?.substring(0, 50)}`);

    // Immediately process the message with AI agent
    try {
      // Just store the message but don't process it automatically
      // We'll process it manually through the admin UI to avoid overloading during testing
      console.log(`[${requestId}] Message stored successfully with ID: ${webhookId}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook received and stored successfully',
          webhookId,
          requestId,
          note: 'Message can be processed manually from the admin interface'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
      
      /* Commenting out automatic processing until we debug the issue
      // Call AI processor function
      console.log(`[${requestId}] Calling AI processor for webhook ${webhookId}`);
      const processorResponse = await supabase.functions.invoke('ai-sms-agent', {
        body: {
          mode: 'process-specific',
          messageId: webhookId
        }
      });
      
      console.log(`[${requestId}] AI processor response:`, JSON.stringify(processorResponse));
      
      if (!processorResponse.data?.success) {
        throw new Error(processorResponse.data?.error || 'Unknown error processing message');
      }
      
      console.log(`[${requestId}] AI processing completed successfully for webhook ${webhookId}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook received and processed successfully',
          webhookId,
          requestId
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
      */
    } catch (processingError) {
      console.error(`[${requestId}] Error processing message with AI:`, processingError);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Webhook received but AI processing failed',
          error: processingError.message,
          webhookId,
          requestId
        }),
        {
          status: 202, // Accepted but with processing error
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error("Error in webhook receiver:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
