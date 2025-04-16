
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
    const smsApiKey = Deno.env.get("SMS_API_KEY");
    const smsServerUrl = Deno.env.get("SMS_SERVER_URL");
    
    if (!smsApiKey || !smsServerUrl) {
      return new Response(
        JSON.stringify({ error: 'SMS API credentials are not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare the payload for getting devices
    const devicePayload = {
      key: smsApiKey
    };

    // Step 1: Get all available devices
    const devicesResponse = await fetch(`${smsServerUrl}/services/get-devices.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(devicePayload).toString()
    });

    if (!devicesResponse.ok) {
      console.error("Failed to retrieve devices");
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve devices' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const devicesData = await devicesResponse.json();
    const devices = devicesData.data.devices || [];

    console.log(`Found ${devices.length} devices`);

    // Step 2: Get received messages
    // Define time range for April 16-17, 2025
    const startDate = new Date('2025-04-16T00:00:00Z');
    const endDate = new Date('2025-04-17T00:00:00Z');
    
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    const messagesPayload = {
      key: smsApiKey,
      status: 'received',
      startTimestamp: startTimestamp,
      endTimestamp: endTimestamp
    };

    const messagesResponse = await fetch(`${smsServerUrl}/services/read-messages.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(messagesPayload).toString()
    });

    if (!messagesResponse.ok) {
      console.error("Failed to retrieve messages");
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve messages' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.data.messages || [];

    console.log(`Retrieved ${messages.length} messages`);

    // Step 3: Format messages for database storage and frontend consumption
    const formattedMessages = messages.map(message => {
      // Ensure timestamp is valid
      let timestamp;
      try {
        timestamp = new Date(message.timestamp * 1000).toISOString();
      } catch (e) {
        // Use current time as fallback if timestamp is invalid
        timestamp = new Date().toISOString();
      }

      return {
        id: message.id,
        type: 'sms',
        content: message.message || '',
        sender: 'client',
        timestamp: timestamp,
        phone: message.number || message.from,
        deviceId: message.deviceID,
        rawData: message
      };
    });

    // Store messages in Supabase for future reference
    if (formattedMessages.length > 0) {
      const { error: insertError } = await supabase
        .from('sms_webhooks')
        .insert(formattedMessages.map(msg => ({
          webhook_data: msg.rawData,
          received_at: msg.timestamp
        })));

      if (insertError) {
        console.error("Error storing messages:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        messages: formattedMessages,
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        devices: devices
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
