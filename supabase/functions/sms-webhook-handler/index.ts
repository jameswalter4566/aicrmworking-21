
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

    // Store the webhook data in the database
    const { data, error } = await supabase.from('sms_webhooks').insert({
      webhook_data: payload,
      processed: false,
      received_at: new Date().toISOString()
    });

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

    // Process the webhook based on the event type
    const phoneNumber = payload.number || payload.from;
    
    if (phoneNumber) {
      // Try to find a matching lead based on phone number
      const formattedPhone = phoneNumber.replace(/\D/g, '');
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('id, firstName, lastName')
        .or(`phone1.ilike.%${formattedPhone}%,phone2.ilike.%${formattedPhone}%`)
        .limit(1);
        
      if (!leadError && leadData && leadData.length > 0) {
        const lead = leadData[0];
        
        // Add a lead activity for this incoming message
        await supabase.from('lead_activities').insert({
          lead_id: lead.id,
          type: 'sms_received',
          description: `Received SMS from ${lead.firstName} ${lead.lastName}: "${payload.message?.substring(0, 50)}${payload.message?.length > 50 ? '...' : ''}"`
        });
        
        console.log(`SMS matched to lead: ${lead.id} (${lead.firstName} ${lead.lastName})`);
      } else {
        console.log(`No matching lead found for phone: ${phoneNumber}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook received and processed successfully'
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
