import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function will handle incoming SMS webhook events from the SMS Gateway
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    let payload;
    
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
        console.error("Failed to parse webhook payload:", e);
        return new Response(
          JSON.stringify({ error: 'Invalid request format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    console.log("SMS webhook received: ", JSON.stringify(payload));

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
    
    // Store the webhook data in the database
    const { data, error } = await supabase.from('sms_webhooks').insert({
      webhook_data: payload,
      processed: false,
      received_at: now
    }).select('id');

    if (error) {
      console.error("Error storing webhook data:", error);
      return new Response(
        JSON.stringify({ error: 'Failed to store webhook data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`SMS received at ${now}:`);
    console.log(`- From: ${phoneNumber || 'unknown'}`);
    console.log(`- To: ${deviceNumber || 'unknown'}`);
    console.log(`- Device ID: ${deviceId || 'unknown'}`);
    console.log(`- Message: ${message || 'no content'}`);

    // Immediately process the message with AI agent if message and phone number are valid
    if (message && phoneNumber) {
      try {
        // Use Edge Runtime.waitUntil to handle processing in background without delaying the response
        const processMessagePromise = processMessageWithAI(phoneNumber, message, supabase);
        
        // Use waitUntil if available (Deno Deploy environment)
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          EdgeRuntime.waitUntil(processMessagePromise);
        } else {
          // Otherwise just start it asynchronously
          processMessagePromise.catch(err => console.error("Background processing error:", err));
        }
        
        console.log(`AI processing initiated for message from ${phoneNumber}`);
      } catch (processingError) {
        console.error("Error initiating AI processing:", processingError);
        // Continue with the normal response - we don't want to fail the webhook
        // just because AI processing failed
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook received and stored successfully',
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

// Function to process a message with the AI SMS agent
async function processMessageWithAI(phoneNumber: string, messageContent: string, supabase: any): Promise<void> {
  try {
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
    
    console.log(`AI response sent to ${phoneNumber}: "${responseMessage.substring(0, 50)}${responseMessage.length > 50 ? '...' : ''}"`);
  } catch (error) {
    console.error("Error in processMessageWithAI:", error);
  }
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
    
  } catch (error) {
    console.error("Error sending SMS response:", error);
    throw new Error(`Failed to send SMS response: ${error.message}`);
  }
}
