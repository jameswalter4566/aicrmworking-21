
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

// Define CORS headers for use in all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sg-signature, x-twilio-signature',
};

serve(async (req: Request) => {
  // Initialize with Request ID to track this specific request through logs
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] ====== SMS WEBHOOK RECEIVER STARTED ======`);
  console.log(`[${requestId}] Received ${req.method} request at: ${new Date().toISOString()}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Responding to OPTIONS preflight request`);
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }
    
    console.log(`[${requestId}] Creating Supabase client with service role key`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload from Twilio's form data
    const formData = await req.formData();
    const data: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value.toString();
      if (key !== 'Body') { // Don't log message content for privacy
        console.log(`[${requestId}] Form param: ${key} = ${value}`);
      }
    }

    // Extract key information
    const phoneNumber = data.From;
    const message = data.Body;
    const messageSid = data.MessageSid;

    console.log(`[${requestId}] Processing message from ${phoneNumber}`);

    // Store webhook data in database
    const { data: webhookData, error } = await supabase.from('sms_webhooks').insert({
      webhook_data: data,
      processed: false,
      received_at: new Date().toISOString(),
      request_id: requestId,
      message_hash: phoneNumber && message ? `${phoneNumber}:${message?.substring(0, 50)}` : undefined
    }).select('id').single();

    if (error) {
      console.error(`[${requestId}] Database error:`, error);
      throw new Error(`Failed to store webhook: ${error.message}`);
    }

    // Trigger the AI handler to process the message
    if (phoneNumber && message) {
      try {
        console.log(`[${requestId}] Invoking ai-sms-agent with phoneNumber: ${phoneNumber}, message: ${message?.substring(0, 30)}...`);
        
        // Process the message with AI handler
        const aiResponse = await supabase.functions.invoke('ai-sms-agent', {
          body: {
            phoneNumber,
            messageContent: message,
            webhookId: webhookData.id
          }
        });

        console.log(`[${requestId}] AI handler response:`, aiResponse);
      } catch (aiError) {
        console.error(`[${requestId}] Error invoking AI handler:`, aiError);
        // Continue despite AI error - we don't want to break the webhook flow
      }
    }

    // Generate TwiML response for Twilio
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
    
    console.log(`[${requestId}] Sending successful response to Twilio`);
    return new Response(twimlResponse, {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/xml'
      }
    });

  } catch (error) {
    // Log the error with the request ID
    console.error(`[${requestId}] ERROR processing webhook:`, error);
    
    // Even on error, we need to return a valid TwiML response to Twilio
    // to avoid retry attempts
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
    
    return new Response(twimlResponse, {
      status: 200, // Always return 200 to Twilio even on errors
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  }
});
