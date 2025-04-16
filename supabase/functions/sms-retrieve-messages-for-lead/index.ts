
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

    // Step 2: Get received messages
    const receivedPayload = {
      key: smsApiKey,
      status: 'received'
    };

    const receivedResponse = await fetch(`${smsServerUrl}/services/read-messages.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(receivedPayload).toString()
    });

    if (!receivedResponse.ok) {
      console.error("Failed to retrieve received messages");
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve received messages' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const receivedData = await receivedResponse.json();
    const receivedMessages = receivedData.data.messages || [];

    console.log(`Retrieved ${receivedMessages.length} total received messages`);

    // Step 3: Get sent messages
    const sentPayload = {
      key: smsApiKey,
      status: 'sent'
    };

    const sentResponse = await fetch(`${smsServerUrl}/services/read-messages.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(sentPayload).toString()
    });

    if (!sentResponse.ok) {
      console.error("Failed to retrieve sent messages");
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve sent messages' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const sentData = await sentResponse.json();
    const sentMessages = sentData.data.messages || [];

    console.log(`Retrieved ${sentMessages.length} total sent messages`);

    // Helper function to normalize phone numbers for comparison
    const normalizePhoneNumber = (phone: string): string => {
      return (phone || "").replace(/\D/g, '');
    };

    const leadPhoneNormalized = normalizePhoneNumber(phoneNumber);

    // Filter received messages by the lead's phone number
    const leadReceivedMessages = receivedMessages.filter(message => {
      const messageNumber = normalizePhoneNumber(message.number || message.from || "");
      return messageNumber.includes(leadPhoneNormalized) || leadPhoneNormalized.includes(messageNumber);
    });

    console.log(`Filtered to ${leadReceivedMessages.length} received messages for phone number ${phoneNumber}`);

    // Filter sent messages by the lead's phone number
    const leadSentMessages = sentMessages.filter(message => {
      const messageNumber = normalizePhoneNumber(message.number || message.to || "");
      return messageNumber.includes(leadPhoneNormalized) || leadPhoneNormalized.includes(messageNumber);
    });

    console.log(`Filtered to ${leadSentMessages.length} sent messages for phone number ${phoneNumber}`);

    // Format received messages for database storage and frontend consumption
    const formattedReceivedMessages = leadReceivedMessages.map(message => {
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

    // Format sent messages for database storage and frontend consumption
    const formattedSentMessages = leadSentMessages.map(message => {
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
        sender: 'ai', // Using 'ai' to represent system/agent sent messages
        timestamp: timestamp,
        phone: message.number || message.to,
        deviceId: message.deviceID,
        rawData: message
      };
    });

    // Combine both received and sent messages
    const allMessages = [...formattedReceivedMessages, ...formattedSentMessages];

    // Sort all messages by timestamp (oldest first)
    const sortedMessages = allMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Store messages in Supabase for future reference
    if (allMessages.length > 0) {
      const { error: insertError } = await supabase
        .from('sms_webhooks')
        .insert(allMessages.map(msg => ({
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
