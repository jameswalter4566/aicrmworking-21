
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
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate a unique request ID for tracking
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] SMS webhook received - URL: ${req.url}, Method: ${req.method}`);
    console.log(`[${requestId}] Headers:`, JSON.stringify(Object.fromEntries(req.headers.entries())));
    
    // Parse incoming webhook payload
    let payload;
    const contentType = req.headers.get('content-type');
    let rawBody = "";
    
    try {
      // First store the raw body for debugging
      rawBody = await req.text();
      console.log(`[${requestId}] Raw body:`, rawBody);
      
      // Then try to parse based on content type
      if (contentType && contentType.includes('application/json')) {
        payload = JSON.parse(rawBody);
      } else if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
        // Parse URL-encoded form data
        const params = new URLSearchParams(rawBody);
        payload = {};
        for (const [key, value] of params.entries()) {
          payload[key] = value;
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
    
    // Extract key information - handle different SMS gateway formats
    // Common formats: Twilio, MessageBird, Vonage, Plivo, etc.
    const phoneNumber = payload.number || payload.from || payload.From || payload.sender || payload.Sender || 
                        payload.source || payload.Source || payload.msisdn || payload.phone;
                        
    const message = payload.message || payload.text || payload.Text || payload.content || payload.Content || 
                    payload.body || payload.Body || payload.msg || payload.Msg || payload.message_body;
    
    const deviceId = payload.device_id || payload.deviceId || payload.DeviceId || payload.device || payload.Device;
    
    console.log(`[${requestId}] Extracted info - Phone: ${phoneNumber}, Message begins: "${message?.substring(0, 30)}..."`);
    
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
            number: "Phone number of sender",
            message: "Text message content"
          },
          commonFormats: "Most SMS gateway formats are supported (Twilio, MessageBird, etc)"
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
