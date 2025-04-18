
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createTwilioClient } from "../_shared/twilio-sms.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] SMS Retrieve Messages invoked`);

    // Parse request body
    const {
      limit = 20,
      from,
      to,
      dateSent,
      status
    } = await req.json();

    // Create Twilio client
    const twilioClient = await createTwilioClient();
    if (!twilioClient) {
      throw new Error("Failed to initialize Twilio client");
    }
    
    // Prepare filter parameters
    const filterParams: Record<string, any> = { };
    
    // Add optional filters if provided
    if (from) filterParams.from = from;
    if (to) filterParams.to = to;
    if (dateSent) filterParams.dateSent = new Date(dateSent);
    if (status) filterParams.status = status;
    
    console.log(`[${requestId}] Fetching messages with filters:`, JSON.stringify(filterParams));
    
    // Fetch messages from Twilio
    const messages = await twilioClient.messages.list({
      limit: Math.min(limit, 100), // Cap at 100 to prevent excessive requests
      ...filterParams
    });
    
    // Format messages for response
    const formattedMessages = messages.map(msg => ({
      sid: msg.sid,
      body: msg.body,
      from: msg.from,
      to: msg.to,
      status: msg.status,
      direction: msg.direction,
      price: msg.price,
      errorCode: msg.errorCode,
      errorMessage: msg.errorMessage,
      dateCreated: msg.dateCreated,
      dateSent: msg.dateSent,
      dateUpdated: msg.dateUpdated,
      numSegments: msg.numSegments,
      numMedia: msg.numMedia,
      uri: msg.uri
    }));
    
    console.log(`[${requestId}] Retrieved ${formattedMessages.length} messages`);
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        count: formattedMessages.length,
        messages: formattedMessages,
        requestId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error(`[${requestId}] Error retrieving SMS messages:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        requestId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
