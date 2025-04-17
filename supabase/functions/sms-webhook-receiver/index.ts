
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
    console.log(`[${requestId}] SMS webhook received`);
    
    // Parse incoming webhook payload
    let payload;
    const contentType = req.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      payload = {};
      for (const [key, value] of formData.entries()) {
        payload[key] = value;
      }
    } else {
      try {
        const text = await req.text();
        payload = JSON.parse(text);
      } catch (e) {
        console.error(`[${requestId}] Failed to parse webhook payload:`, e);
        return new Response(
          JSON.stringify({ error: 'Invalid request format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    console.log(`[${requestId}] SMS webhook payload:`, JSON.stringify(payload));
    
    // Extract key information
    const phoneNumber = payload.number || payload.from;
    const message = payload.message || payload.text || payload.content || payload.body;
    const deviceId = payload.device_id || payload.deviceId;
    
    if (!phoneNumber || !message) {
      console.error(`[${requestId}] Missing phone number or message content`);
      return new Response(
        JSON.stringify({ error: 'Phone number and message are required' }),
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
      .eq('webhook_data->number', phoneNumber)
      .eq('webhook_data->message', message)
      .order('received_at', { ascending: false })
      .limit(1);
    
    if (!checkError && existingMessages && existingMessages.length > 0) {
      console.log(`[${requestId}] Duplicate message detected from ${phoneNumber}: "${message.substring(0, 30)}..."`);
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
      message_hash: `${phoneNumber}:${message.substring(0, 50)}` // For deduplication
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
    console.log(`[${requestId}] From: ${phoneNumber}, Message: ${message.substring(0, 50)}`);

    // Immediately process the message with AI agent
    try {
      // Call AI processor function
      const processorResponse = await supabase.functions.invoke('ai-sms-agent', {
        body: {
          mode: 'process-specific',
          messageId: webhookId
        }
      });
      
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
