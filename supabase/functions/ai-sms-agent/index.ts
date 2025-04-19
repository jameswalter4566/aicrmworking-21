
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to process a message with the AI SMS agent
async function processMessageWithAI(phoneNumber: string, messageContent: string, supabase: any, requestId: string): Promise<void> {
  try {
    console.log(`[${requestId}] Processing message from ${phoneNumber} with AI: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`);
    
    // Get OpenAI API key from environment variables
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openAiApiKey) {
      console.error(`[${requestId}] OpenAI API key is not configured`);
      throw new Error("OpenAI API key is not configured");
    }
    
    // Generate AI response using OpenAI
    const responseMessage = await generateAIResponse(messageContent, openAiApiKey, requestId);
    
    // Send the AI-generated SMS response
    await sendSMSResponse(phoneNumber, responseMessage, supabase, requestId);
    
    console.log(`[${requestId}] AI response sent to ${phoneNumber}`);
  } catch (error) {
    console.error(`[${requestId}] Error in processMessageWithAI:`, error);
    throw error;
  }
}

// Generate an AI response using OpenAI
async function generateAIResponse(messageContent: string, openAiApiKey: string, requestId: string): Promise<string> {
  try {
    console.log(`[${requestId}] Generating AI response...`);
    
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
      console.error(`[${requestId}] OpenAI API Error:`, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const aiReply = data.choices[0].message.content.trim();
    console.log(`[${requestId}] AI generated response: "${aiReply}"`);
    return aiReply;
  } catch (error) {
    console.error(`[${requestId}] Error generating AI response:`, error);
    return "Thank you for your message. A loan officer will review your request and get back to you shortly.";
  }
}

// Send an SMS response using the SMS Gateway API
async function sendSMSResponse(phoneNumber: string, message: string, supabase: any, requestId: string): Promise<void> {
  try {
    console.log(`[${requestId}] Sending SMS response to ${phoneNumber}`);
    
    // Call our existing SMS send function
    const { data, error } = await supabase.functions.invoke('sms-send-single', {
      body: { 
        phoneNumber, 
        message,
        prioritize: true 
      }
    });
    
    if (error || !data?.success) {
      throw new Error(error?.message || data?.error || 'SMS send failed');
    }
    
    console.log(`[${requestId}] SMS response sent successfully`);
  } catch (error) {
    console.error(`[${requestId}] Error sending SMS response:`, error);
    throw new Error(`Failed to send SMS response: ${error.message}`);
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] ====== AI SMS AGENT STARTED ======`);
  console.log(`[${requestId}] Received ${req.method} request at: ${new Date().toISOString()}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }
    
    console.log(`[${requestId}] Creating Supabase client with service role key`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request payload
    let body;
    try {
      body = await req.json();
      console.log(`[${requestId}] Request payload:`, JSON.stringify(body));
    } catch (e) {
      console.error(`[${requestId}] Error parsing request body:`, e);
      throw new Error("Invalid JSON payload");
    }

    const { phoneNumber, messageContent, webhookId } = body;
    
    if (!phoneNumber || !messageContent) {
      const error = "Missing required parameters: phoneNumber and messageContent";
      console.error(`[${requestId}] ${error}`);
      return new Response(
        JSON.stringify({ error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[${requestId}] Processing message from ${phoneNumber}: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`);
    
    // Process message with AI and send response
    await processMessageWithAI(phoneNumber, messageContent, supabase, requestId);
    
    // Update webhook as processed if webhookId was provided
    if (webhookId) {
      try {
        await supabase.from('sms_webhooks')
          .update({
            processed: true,
            processed_at: new Date().toISOString()
          })
          .eq('id', webhookId);
        
        console.log(`[${requestId}] Updated webhook ${webhookId} as processed`);
      } catch (updateError) {
        console.error(`[${requestId}] Error updating webhook status:`, updateError);
        // Continue despite update error
      }
    }
    
    console.log(`[${requestId}] AI SMS Agent completed successfully`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Message processed successfully",
        requestId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error(`[${requestId}] AI SMS Agent Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'AI SMS Agent processing failed', 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
