
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { createTwilioClient } from "../_shared/twilio-sms.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] SMS Retrieve Messages For Lead invoked`);

    // Parse request body
    const { leadId, limit = 50 } = await req.json();
    
    if (!leadId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'leadId is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get lead phone number from database
    console.log(`[${requestId}] Fetching lead data for ID: ${leadId}`);
    const { data: leadData, error: fetchError } = await supabase
      .from("leads")
      .select("phone1")
      .eq("id", leadId)
      .single();
      
    if (fetchError || !leadData?.phone1) {
      console.error(`[${requestId}] Error fetching lead data:`, fetchError || "No phone number found");
      return new Response(
        JSON.stringify({
          success: false,
          error: fetchError?.message || "No phone number found for lead"
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const phoneNumber = leadData.phone1;
    console.log(`[${requestId}] Found phone number for lead: ${phoneNumber}`);
    
    // Create Twilio client
    const twilioClient = await createTwilioClient();
    if (!twilioClient) {
      throw new Error("Failed to initialize Twilio client");
    }
    
    // Fetch messages from Twilio for this lead's phone number
    console.log(`[${requestId}] Fetching messages for phone number: ${phoneNumber}`);
    
    // Get the company SMS number
    const companyNumber = Deno.env.get("TWILIO_NUMBER_SMS");
    
    if (!companyNumber) {
      console.warn(`[${requestId}] TWILIO_NUMBER_SMS not set, using first available number`);
    }
    
    // Fetch messages sent to the lead's number
    const messagesToLead = await twilioClient.messages.list({
      to: phoneNumber,
      limit: Math.min(limit, 50)
    });
    
    // Fetch messages received from the lead's number
    const messagesFromLead = await twilioClient.messages.list({
      from: phoneNumber,
      limit: Math.min(limit, 50)
    });
    
    // Combine and sort messages by date
    const allMessages = [...messagesToLead, ...messagesFromLead]
      .sort((a, b) => new Date(b.dateSent || b.dateCreated).getTime() - 
                      new Date(a.dateSent || a.dateCreated).getTime());
    
    // Format messages for response
    const formattedMessages = allMessages.map(msg => ({
      id: msg.sid,
      body: msg.body,
      from: msg.from,
      to: msg.to,
      direction: msg.from === phoneNumber ? 'inbound' : 'outbound',
      status: msg.status,
      timestamp: msg.dateSent || msg.dateCreated,
      errorCode: msg.errorCode,
      errorMessage: msg.errorMessage,
      numSegments: msg.numSegments,
      numMedia: msg.numMedia,
      mediaUrls: msg.numMedia > 0 ? [msg.uri + '/Media'] : []
    }));
    
    console.log(`[${requestId}] Retrieved ${formattedMessages.length} messages for lead ${leadId}`);
    
    // Return messages
    return new Response(
      JSON.stringify({
        success: true,
        leadId,
        phoneNumber,
        messages: formattedMessages,
        count: formattedMessages.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error retrieving messages for lead:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
