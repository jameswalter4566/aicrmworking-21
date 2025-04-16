
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, option = 0, devices, schedule, useRandomDevice = false } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Valid messages array is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
    
    // Validate each message object
    for (const message of messages) {
      if (!message.number || !message.message) {
        return new Response(
          JSON.stringify({ error: 'Each message must contain a number and message' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Prepare the request payload
    const payload = {
      messages: JSON.stringify(messages),
      schedule: schedule || null,
      key: smsApiKey,
      devices: devices || null,
      option: option,
      useRandomDevice: useRandomDevice ? 1 : 0
    };

    console.log(`Sending batch of ${messages.length} SMS messages with option ${option}`);

    try {
      const response = await fetch(`${smsServerUrl}/services/send.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(
          Object.entries(payload)
            .filter(([_, value]) => value !== null)
            .map(([key, value]) => [key, String(value)])
        ).toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("SMS API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ 
            error: `SMS Gateway API error: ${response.status}`,
            details: errorText
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const responseData = await response.json();
      console.log(`SMS API response: ${messages.length} messages processed`);

      if (!responseData.success) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to send batch SMS messages', 
            details: responseData.error?.message || 'Unknown error'
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          messageCount: responseData.data.messages.length,
          messages: responseData.data.messages,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Network error when connecting to SMS Gateway API',
          details: fetchError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error("Error in batch SMS function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
