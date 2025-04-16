
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function retrieves messages within a specific time frame
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json();
    
    // Create a Supabase client for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get date 24 hours ago from April 16, 2025
    const startDate = new Date('2025-04-16T00:00:00Z');
    const endDate = new Date('2025-04-17T00:00:00Z');
    
    console.log(`Retrieving messages between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    
    // Get all SMS webhook data within the specified time range
    const { data: messages, error: messagesError } = await supabase
      .from('sms_webhooks')
      .select('*')
      .gte('received_at', startDate.toISOString())
      .lt('received_at', endDate.toISOString())
      .order('received_at', { ascending: false });
      
    if (messagesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve messages', details: messagesError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Retrieved ${messages?.length || 0} messages in the time range`);
    
    // Format into a standardized message format
    const formattedMessages = (messages || []).map(record => {
      const webhookData = record.webhook_data;
      const isIncoming = webhookData.type === 'incoming' || webhookData.message_direction === 'inbound';
      
      return {
        id: record.id,
        type: 'sms',
        content: webhookData.message || webhookData.content || webhookData.text || '',
        sender: isIncoming ? 'client' : 'ai',
        timestamp: record.received_at || new Date().toISOString(),
        phone: isIncoming ? webhookData.number || webhookData.from : webhookData.device_number || webhookData.to,
        rawData: webhookData // Include raw data for debugging
      };
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        messages: formattedMessages,
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error in SMS retrieve for time range function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
