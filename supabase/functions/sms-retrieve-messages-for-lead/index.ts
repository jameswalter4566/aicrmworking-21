
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
    // Create a Supabase client for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Set date range for April 16-17, 2025
    const startDate = new Date('2025-04-16T00:00:00Z');
    const endDate = new Date('2025-04-17T00:00:00Z');
    
    console.log(`Retrieving messages between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    
    // Step 1: Fetch all available device IDs from the SMS webhooks
    const { data: deviceData, error: deviceError } = await supabase
      .from('sms_webhooks')
      .select('webhook_data')
      .not('webhook_data->device_id', 'is', null);
    
    if (deviceError) {
      console.error("Error retrieving device IDs:", deviceError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve device IDs', details: deviceError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Extract unique device IDs
    const deviceIds = new Set();
    if (deviceData && deviceData.length > 0) {
      deviceData.forEach(record => {
        if (record.webhook_data && record.webhook_data.device_id) {
          deviceIds.add(record.webhook_data.device_id);
        }
      });
    }
    
    console.log(`Found ${deviceIds.size} unique device IDs`);
    
    // Step 2: Get all SMS webhook data within the specified time range
    const { data: messages, error: messagesError } = await supabase
      .from('sms_webhooks')
      .select('*')
      .gte('received_at', startDate.toISOString())
      .lt('received_at', endDate.toISOString())
      .order('received_at', { ascending: false });
      
    if (messagesError) {
      console.error("Error retrieving messages:", messagesError);
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
      
      // Determine if the message is incoming based on message type or direction
      // This handles both the "type" field and the "message_direction" field that might be present
      const isIncoming = webhookData.type === 'incoming' || 
                          webhookData.message_direction === 'inbound' || 
                          webhookData.direction === 'inbound';
      
      // Extract device ID information
      const deviceId = webhookData.device_id || webhookData.deviceId || null;
      
      return {
        id: record.id,
        type: 'sms',
        content: webhookData.message || webhookData.content || webhookData.text || webhookData.body || '',
        sender: isIncoming ? 'client' : 'ai',
        timestamp: record.received_at || new Date().toISOString(),
        phone: isIncoming ? webhookData.number || webhookData.from : webhookData.device_number || webhookData.to,
        deviceId: deviceId,
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
        },
        deviceIds: Array.from(deviceIds)
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
