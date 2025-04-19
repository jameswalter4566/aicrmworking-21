
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { validateTwilioWebhook, parseTwilioWebhook } from "../_shared/twilio-sms.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sg-signature, x-twilio-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Received OPTIONS request - CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('======= WEBHOOK RECEIVER STARTED =======');
    console.log(`Received request method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);
    console.log(`Request headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}`);
    
    // Clone the request to read the body multiple times
    const clonedReq = req.clone();
    
    // Log full request details for debugging
    const rawBody = await clonedReq.text();
    console.log('Raw Request Body:', rawBody);

    // Detailed header logging for Twilio-specific headers
    const twilioSignature = req.headers.get('x-twilio-signature');
    console.log('Twilio Signature:', twilioSignature || 'No signature found');

    const contentType = req.headers.get('content-type');
    console.log('Content-Type:', contentType || 'No content-type specified');

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Enhanced logging with timestamp and more context
    const requestTimestamp = new Date().toISOString();
    const requestId = crypto.randomUUID();
    
    console.log(`[${requestId}] SMS Webhook Received at ${requestTimestamp}`);
    console.log(`[${requestId}] Request Method: ${req.method}`);
    console.log(`[${requestId}] Request URL: ${req.url}`);
    console.log(`[${requestId}] Request Headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}`);

    // Check for Twilio signature
    if (twilioSignature) {
      console.log(`[${requestId}] Received Twilio signature: ${twilioSignature}`);
      
      // In a production environment, you should validate the signature
      const isValid = validateTwilioWebhook(req);
      if (!isValid) {
        console.warn(`[${requestId}] Invalid Twilio signature`);
        // We're still accepting it for now, but in production you'd want to reject invalid signatures
      }
    } else {
      console.warn(`[${requestId}] No Twilio signature found in request headers`);
    }
    
    // Parse incoming webhook payload
    let payload;
    
    // Since we already read the body for logging, use the stored raw content
    try {
      console.log(`[${requestId}] Parsing request body`);
      
      if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
        // This is the typical Twilio webhook format
        console.log(`[${requestId}] Parsing as form data`);
        const formData = new FormData();
        new URLSearchParams(rawBody).forEach((value, key) => {
          formData.append(key, value);
        });
        
        // Parse the Twilio webhook data
        payload = parseTwilioWebhook(formData);
        console.log(`[${requestId}] Successfully parsed form data:`, JSON.stringify(payload));
      } else if (contentType && contentType.includes('application/json')) {
        // Handle JSON if sent
        console.log(`[${requestId}] Parsing as JSON`);
        payload = JSON.parse(rawBody);
        console.log(`[${requestId}] Successfully parsed JSON data:`, JSON.stringify(payload));
      } else {
        // Try to handle as form data anyway
        console.log(`[${requestId}] Trying to parse as form data (fallback)`);
        try {
          const formData = new FormData();
          new URLSearchParams(rawBody).forEach((value, key) => {
            formData.append(key, value);
          });
          payload = parseTwilioWebhook(formData);
          console.log(`[${requestId}] Successfully parsed fallback form data:`, JSON.stringify(payload));
        } catch (formError) {
          console.error(`[${requestId}] Form data fallback parse error:`, formError);
          payload = { 
            _raw: rawBody,
            _parseError: "Could not parse as form data"
          };
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
    
    // Extract key information from the message
    let phoneNumber = null;
    let message = null;
    let messageSid = null;
    
    // Extract from Twilio format
    if (payload.from) {
      phoneNumber = payload.from;
      message = payload.body;
      messageSid = payload.messageSid;
      
      console.log(`[${requestId}] Extracted from Twilio format - Phone: ${phoneNumber}, Message: "${message?.substring(0, 30)}..."`);
    } else {
      // Fall back to generic extraction (backward compatibility)
      phoneNumber = payload.From || payload.from || payload.number || 
                   payload.sender || payload.Sender || payload.source || 
                   payload.Source || payload.msisdn || payload.phone;
                   
      message = payload.Body || payload.body || payload.message || 
               payload.text || payload.Text || payload.content || 
               payload.Content || payload.msg || payload.Msg || 
               payload.message_body;
      
      messageSid = payload.MessageSid || payload.messageSid || payload.id;
      
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
            From: "Sender phone number",
            Body: "Message text content",
            MessageSid: "Unique message identifier"
          },
          note: "Twilio webhook format or common SMS gateway formats are supported"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Store incoming message in the database
    console.log(`[${requestId}] Storing incoming message in database`);
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
      // Process message with OpenAI directly here
      console.log(`[${requestId}] Processing message with OpenAI directly`);
      
      // Get OpenAI API key from environment variables
      const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openAiApiKey) {
        throw new Error("OpenAI API key is not configured");
      }
      
      // Generate AI response using OpenAI
      const responseMessage = await generateAIResponse(message, openAiApiKey, requestId);
      
      // Send the SMS response
      console.log(`[${requestId}] Sending SMS response to ${phoneNumber}`);
      const sendResult = await supabase.functions.invoke('sms-send-single', {
        body: { 
          phoneNumber, 
          message: responseMessage,
          prioritize: true 
        }
      });
      
      // Mark the webhook as processed
      await supabase
        .from('sms_webhooks')
        .update({
          processed: true,
          ai_response: responseMessage,
          processed_at: new Date().toISOString()
        })
        .eq('id', webhookId);
      
      console.log(`[${requestId}] Webhook Processing Complete: Message processed and response sent`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook received and processed successfully',
          webhookId,
          aiResponse: responseMessage,
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
    console.error(`[ERROR] Webhook Processing Failed:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Generate an AI response using OpenAI
async function generateAIResponse(messageContent: string, openAiApiKey: string, requestId: string): Promise<string> {
  try {
    console.log(`[${requestId}] Generating AI response for message: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using the most efficient model for quick responses
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant for a mortgage company. 
            Your primary role is to provide helpful, professional responses to client inquiries about their mortgage applications.
            Keep responses concise (under 160 characters when possible), professional, and helpful.
            If someone asks a question that requires specific details about their loan that you don't have, politely let them know that you'll forward their query to their loan officer.
            Never make up information about specific loan details, rates, or timelines.
            Always maintain a helpful, reassuring tone.`
          },
          {
            role: 'user',
            content: messageContent
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[${requestId}] OpenAI API Error:`, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[${requestId}] AI response generated successfully`);
    return data.choices[0].message.content.trim();
    
  } catch (error) {
    console.error(`[${requestId}] Error generating AI response:`, error);
    return "Thank you for your message. A loan officer will review your request and get back to you shortly.";
  }
}
