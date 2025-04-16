
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function retrieves messages for a specific lead's phone number
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { leadId } = await req.json();
    
    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'Lead ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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

    // First, fetch the lead to get their phone number
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('phone1, first_name, last_name')
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      console.error("Error fetching lead:", leadError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch lead information' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const phoneNumber = leadData.phone1;
    
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Lead does not have a phone number' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Fetching SMS messages for lead ${leadId} with phone number ${phoneNumber}`);

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

    // Step 2: Get received messages with no date filtering
    const messagesPayload = {
      key: smsApiKey,
      status: 'received'
      // No time range filtering - we want all messages
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
    const allMessages = messagesData.data.messages || [];

    console.log(`Retrieved ${allMessages.length} total messages`);

    // Filter messages by the lead's phone number
    const leadMessages = allMessages.filter(message => {
      const messageNumber = (message.number || message.from || "").replace(/\D/g, '');
      const leadPhoneNumber = phoneNumber.replace(/\D/g, '');
      return messageNumber.includes(leadPhoneNumber) || leadPhoneNumber.includes(messageNumber);
    });

    console.log(`Filtered to ${leadMessages.length} messages for phone number ${phoneNumber}`);

    // Step 3: Format messages for database storage and frontend consumption
    const formattedMessages = leadMessages.map(message => {
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

    // Sort messages by timestamp (oldest first)
    const sortedMessages = formattedMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

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
        messages: sortedMessages,
        lead: {
          id: leadId,
          firstName: leadData.first_name,
          lastName: leadData.last_name,
          phone: phoneNumber
        },
        devices: devices
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
