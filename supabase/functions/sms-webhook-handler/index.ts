
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to process a message with the AI SMS agent
async function processMessageWithAI(phoneNumber: string, messageContent: string, supabase: any, webhookId: string): Promise<void> {
  try {
    console.log(`Processing message from ${phoneNumber} with AI: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`);
    
    // Get OpenAI API key from environment variables
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openAiApiKey) {
      console.error("OpenAI API key is not configured");
      return;
    }
    
    // Generate AI response using OpenAI
    const responseMessage = await generateAIResponse(messageContent, openAiApiKey);
    
    // Send the AI-generated SMS response
    await sendSMSResponse(phoneNumber, responseMessage, supabase);
    
    // Mark the webhook as processed in the database
    await supabase
      .from('sms_webhooks')
      .update({
        processed: true,
        ai_response: responseMessage,
        processed_at: new Date().toISOString()
      })
      .eq('id', webhookId);
    
    console.log(`AI response sent to ${phoneNumber} and webhook ${webhookId} marked as processed`);
  } catch (error) {
    console.error(`Error in processMessageWithAI for webhook ${webhookId}:`, error);
    
    // Mark as processed even on error to prevent retries of problematic messages
    try {
      await supabase
        .from('sms_webhooks')
        .update({
          processed: true,
          processing_error: error.message || 'Unknown error',
          processed_at: new Date().toISOString()
        })
        .eq('id', webhookId);
      console.log(`Webhook ${webhookId} marked as processed despite error`);
    } catch (updateError) {
      console.error(`Failed to update webhook ${webhookId} status:`, updateError);
    }
  }
}

// Generate an AI response using OpenAI
async function generateAIResponse(messageContent: string, openAiApiKey: string): Promise<string> {
  try {
    console.log("Generating AI response...");
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Most efficient model for quick responses
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant for a mortgage company. 
            Your primary role is to provide helpful, professional responses to client inquiries about their mortgage applications.
            Keep responses concise (under 160 characters when possible), professional, and helpful.
            If someone asks a question that requires specific details, politely let them know that a loan officer will review their request.
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
      console.error("OpenAI API Error:", errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Thank you for your message. A loan officer will review your request and get back to you shortly.";
  }
}

// Send an SMS response using the SMS Gateway API
async function sendSMSResponse(phoneNumber: string, message: string, supabase: any): Promise<void> {
  try {
    console.log(`Sending SMS response to ${phoneNumber}`);
    
    // Call our existing SMS send function
    const { data, error } = await supabase.functions.invoke('sms-send-single', {
      body: { 
        phoneNumber, 
        message,
        prioritize: true 
      }
    });
    
    if (error || !data.success) {
      throw new Error(error?.message || data?.error || 'SMS send failed');
    }
    
    console.log("SMS response sent successfully");
  } catch (error) {
    console.error("Error sending SMS response:", error);
    throw new Error(`Failed to send SMS response: ${error.message}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    let payload;
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] SMS webhook received`);
    
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

    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current timestamp in ISO format
    const now = new Date().toISOString();

    // Extract key information for logging and processing
    const phoneNumber = payload.number || payload.from;
    const message = payload.message || payload.text || payload.content || payload.body;
    const deviceNumber = payload.device_number || payload.to;
    const deviceId = payload.device_id || payload.deviceId;
    
    // Check if this message has already been received
    if (phoneNumber && message) {
      const { data: existingMessages, error: checkError } = await supabase
        .from('sms_webhooks')
        .select('id, processed')
        .eq('processed', false)
        .ilike('webhook_data->number', phoneNumber)
        .ilike('webhook_data->message', message)
        .order('received_at', { ascending: false })
        .limit(1);
        
      if (!checkError && existingMessages && existingMessages.length > 0) {
        console.log(`[${requestId}] Similar message from ${phoneNumber} already exists (ID: ${existingMessages[0].id})`);
      }
    }
    
    // Store the webhook data in the database
    const { data, error } = await supabase.from('sms_webhooks').insert({
      webhook_data: payload,
      processed: false,
      received_at: now,
      request_id: requestId
    }).select('id');

    if (error) {
      console.error(`[${requestId}] Error storing webhook data:`, error);
      return new Response(
        JSON.stringify({ error: 'Failed to store webhook data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const webhookId = data![0].id;
    console.log(`[${requestId}] SMS stored in database with ID ${webhookId}:`);
    console.log(`[${requestId}] - From: ${phoneNumber || 'unknown'}`);
    console.log(`[${requestId}] - To: ${deviceNumber || 'unknown'}`);
    console.log(`[${requestId}] - Device ID: ${deviceId || 'unknown'}`);
    console.log(`[${requestId}] - Message: ${message || 'no content'}`);

    // Immediately process the message with AI agent if message and phone number are valid
    if (message && phoneNumber) {
      try {
        // Process the message synchronously
        await processMessageWithAI(phoneNumber, message, supabase, webhookId);
        
        console.log(`[${requestId}] AI processing completed for message from ${phoneNumber}`);
      } catch (processingError) {
        console.error(`[${requestId}] Error processing message with AI:`, processingError);
        // Continue with the response even if AI processing fails
      }
    } else {
      console.log(`[${requestId}] Skipping AI processing - incomplete message data`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook received and processed successfully',
        requestId,
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
