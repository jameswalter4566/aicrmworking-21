
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function retrieves messages that match a specific phone number
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, leadId } = await req.json();

    if (!phoneNumber && !leadId) {
      return new Response(
        JSON.stringify({ error: 'Either phone number or lead ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Create a Supabase client for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the lead exists and get its phone number
    let verifiedPhone = phoneNumber;

    if (leadId) {
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('phone1, firstName, lastName')
        .eq('id', leadId)
        .single();
      
      if (leadError || !leadData) {
        return new Response(
          JSON.stringify({ error: 'Lead not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      if (!phoneNumber) {
        verifiedPhone = leadData.phone1;
      }
    }

    if (!verifiedPhone) {
      return new Response(
        JSON.stringify({ error: 'No phone number available for this lead' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Format phone number (remove non-numeric chars)
    const formattedPhone = verifiedPhone.replace(/\D/g, '');
    
    // Get stored SMS webhook data that matches this number
    const { data: messages, error: messagesError } = await supabase
      .from('sms_webhooks')
      .select('*')
      .contains('webhook_data', { number: formattedPhone })
      .order('received_at', { ascending: false })
      .limit(50);
      
    if (messagesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve messages' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Also get outgoing messages by checking the device number
    const { data: outgoingMessages, error: outgoingError } = await supabase
      .from('sms_webhooks')
      .select('*')
      .contains('webhook_data', { device_number: formattedPhone })
      .order('received_at', { ascending: false })
      .limit(50);

    // Combine and process messages
    const allMessages = [...(messages || []), ...(outgoingMessages || [])];
    
    // Format into a standardized message format
    const formattedMessages = allMessages.map(record => {
      const webhookData = record.webhook_data;
      const isIncoming = webhookData.type === 'incoming' || webhookData.message_direction === 'inbound';
      
      return {
        id: record.id,
        type: 'sms',
        content: webhookData.message || webhookData.content || webhookData.text || '',
        sender: isIncoming ? 'client' : 'ai',
        timestamp: record.received_at || new Date().toISOString(),
        phone: isIncoming ? webhookData.number || webhookData.from : webhookData.device_number || webhookData.to
      };
    });

    // Sort by timestamp (newest first)
    const sortedMessages = formattedMessages.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return new Response(
      JSON.stringify({
        success: true,
        messages: sortedMessages
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error in SMS retrieve for lead function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
