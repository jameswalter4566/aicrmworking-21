
// Import Deno standard library's serve function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { validateTwilioWebhook, parseTwilioWebhook } from "../_shared/twilio-sms.ts";

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
    // Log all request headers for debugging
    const headersObj = Object.fromEntries(req.headers.entries());
    console.log(`[${requestId}] Request headers:`, JSON.stringify(headersObj));
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }
    
    console.log(`[${requestId}] Creating Supabase client with service role key`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clone the request to read the body
    const clonedReq = req.clone();
    let rawBody;
    try {
      rawBody = await clonedReq.text();
      console.log(`[${requestId}] Raw request body:`, rawBody);
    } catch (err) {
      console.error(`[${requestId}] Error reading request body:`, err);
      rawBody = "";
    }

    // Parse the webhook payload based on content type
    let payload;
    const contentType = req.headers.get('content-type');
    console.log(`[${requestId}] Content-Type: ${contentType || 'Not specified'}`);
    
    if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
      // Handle form data (Twilio's standard format)
      console.log(`[${requestId}] Parsing as form data...`);
      
      const formData = new FormData();
      const urlSearchParams = new URLSearchParams(rawBody);
      
      urlSearchParams.forEach((value, key) => {
        formData.append(key, value);
        console.log(`[${requestId}] Form param: ${key} = ${value}`);
      });
      
      payload = parseTwilioWebhook(formData);
      console.log(`[${requestId}] Successfully parsed Twilio webhook data`);
      
    } else if (contentType && contentType.includes('application/json')) {
      // Handle JSON format
      console.log(`[${requestId}] Parsing as JSON...`);
      try {
        payload = JSON.parse(rawBody);
      } catch (err) {
        console.error(`[${requestId}] JSON parse error:`, err);
        payload = { _parseError: err.message, _rawContent: rawBody };
      }
    } else {
      // Fallback to treating as form data anyway
      console.log(`[${requestId}] No recognized content type, trying form data as fallback...`);
      try {
        const formData = new FormData();
        new URLSearchParams(rawBody).forEach((value, key) => {
          formData.append(key, value);
        });
        payload = parseTwilioWebhook(formData);
      } catch (formError) {
        console.error(`[${requestId}] Form data fallback failed:`, formError);
        payload = { 
          _raw: rawBody,
          _parseError: formError.message
        };
      }
    }

    // Extract key information from the message
    let phoneNumber = null;
    let message = null;
    let messageSid = null;
    
    if (payload.from) {
      phoneNumber = payload.from;
      message = payload.body;
      messageSid = payload.messageSid;
      console.log(`[${requestId}] Extracted data - From: ${phoneNumber}, Message: "${message?.substring(0, 50)}${message?.length > 50 ? '...' : ''}"`);
    } else {
      // Fallback extraction for various possible formats
      phoneNumber = payload.From || payload.from || payload.number || 
                   payload.sender || payload.Sender || payload.source;
      message = payload.Body || payload.body || payload.message || 
               payload.text || payload.Text || payload.content;
      messageSid = payload.MessageSid || payload.SmsSid || payload.messageSid || payload.id;
      
      console.log(`[${requestId}] Extracted from fallback - From: ${phoneNumber}, Message begins: "${message?.substring(0, 50)}${message?.length > 50 ? '...' : ''}"`);
    }

    // Store the webhook data in Supabase
    console.log(`[${requestId}] Storing webhook data in database...`);
    const { data: webhookData, error } = await supabase.from('sms_webhooks').insert({
      webhook_data: payload,
      processed: false,
      received_at: new Date().toISOString(),
      request_id: requestId,
      message_hash: phoneNumber && message ? `${phoneNumber}:${message?.substring(0, 50)}` : undefined
    }).select('id');

    if (error) {
      console.error(`[${requestId}] Database error:`, error);
      throw new Error(`Failed to store webhook: ${error.message}`);
    }

    const webhookId = webhookData?.[0]?.id;
    console.log(`[${requestId}] Successfully stored webhook with ID: ${webhookId}`);

    // Generate response for Twilio - MUST be in XML format
    const responseBody = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
    
    console.log(`[${requestId}] Sending successful response to Twilio`);
    return new Response(responseBody, {
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
