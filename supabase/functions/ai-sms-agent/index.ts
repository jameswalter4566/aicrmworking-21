
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { corsHeaders } from '../_shared/cors.ts';

// Function to process incoming SMS and respond intelligently
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get OpenAI API key from environment variables
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openAiApiKey) {
      throw new Error("OpenAI API key is not configured");
    }

    // Parse the request body ONCE and store it
    const requestBody = await req.json();
    
    // Handle different operation modes
    if (requestBody.mode === "process-specific" && requestBody.messageId) {
      // Process a specific message by ID
      return await processSpecificMessage(requestBody.messageId, supabase, openAiApiKey);
      
    } else if (requestBody.mode === "process-all-unprocessed" || requestBody.processAllUnprocessed) {
      // Process all unprocessed messages
      return await processUnprocessedMessages(supabase, openAiApiKey);
      
    } else {
      // Run in manual mode with specific payload
      const { phoneNumber, messageContent } = requestBody;
      
      if (!phoneNumber || !messageContent) {
        return new Response(
          JSON.stringify({ error: 'Phone number and message content are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Process the manual message
      const responseMessage = await generateAIResponse(messageContent, openAiApiKey);
      await sendSMSResponse(phoneNumber, responseMessage, supabase);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          original: messageContent,
          response: responseMessage
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error("Error in AI SMS agent:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Process a specific SMS message by ID
async function processSpecificMessage(messageId: string, supabase: any, openAiApiKey: string) {
  // Fetch the message from the database
  const { data: webhookData, error: fetchError } = await supabase
    .from('sms_webhooks')
    .select('*')
    .eq('id', messageId)
    .single();
  
  if (fetchError || !webhookData) {
    return new Response(
      JSON.stringify({ error: 'Message not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Process the message
  try {
    const result = await processWebhookMessage(webhookData, supabase, openAiApiKey);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process message' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

// Process all unprocessed SMS messages
async function processUnprocessedMessages(supabase: any, openAiApiKey: string) {
  // Fetch unprocessed webhook messages
  const { data: webhooks, error: fetchError } = await supabase
    .from('sms_webhooks')
    .select('*')
    .eq('processed', false)
    .order('received_at', { ascending: true })
    .limit(10); // Process in batches to avoid timeouts
  
  if (fetchError) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch unprocessed messages' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  if (!webhooks || webhooks.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: 'No unprocessed messages found' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Process each webhook
  const results = [];
  for (const webhook of webhooks) {
    try {
      const result = await processWebhookMessage(webhook, supabase, openAiApiKey);
      results.push(result);
    } catch (error) {
      console.error(`Error processing webhook ${webhook.id}:`, error);
      results.push({
        webhookId: webhook.id,
        success: false,
        error: error.message
      });
    }
  }
  
  return new Response(
    JSON.stringify({
      success: true,
      processed: results.length,
      results
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

// Process an individual webhook message
async function processWebhookMessage(webhook: any, supabase: any, openAiApiKey: string) {
  // Extract the message content and phone number from the webhook data
  const webhookData = webhook.webhook_data;
  
  // Extract data based on common SMS gateway formats
  const phoneNumber = webhookData.number || webhookData.from || webhookData.sender;
  const messageContent = webhookData.message || webhookData.text || webhookData.body || webhookData.content;
  
  if (!phoneNumber || !messageContent) {
    throw new Error('Could not extract phone number or message content from webhook data');
  }
  
  // Generate AI response
  const responseMessage = await generateAIResponse(messageContent, openAiApiKey);
  
  // Send the response SMS
  await sendSMSResponse(phoneNumber, responseMessage, supabase);
  
  // Mark the webhook as processed
  await supabase
    .from('sms_webhooks')
    .update({
      processed: true
    })
    .eq('id', webhook.id);
  
  return {
    webhookId: webhook.id,
    phoneNumber,
    originalMessage: messageContent,
    responseMessage,
    success: true,
    processedAt: new Date().toISOString()
  };
}

// Generate an AI response using OpenAI
async function generateAIResponse(messageContent: string, openAiApiKey: string): Promise<string> {
  try {
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
    
    console.log(`AI response sent to ${phoneNumber}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
  } catch (error) {
    console.error("Error sending SMS response:", error);
    throw new Error(`Failed to send SMS response: ${error.message}`);
  }
}
