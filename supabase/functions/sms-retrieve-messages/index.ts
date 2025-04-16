
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
    const { 
      messageId,
      groupId,
      status,
      deviceId,
      simSlot,
      startTimestamp,
      endTimestamp
    } = await req.json();

    // Ensure at least one filter parameter is provided
    if (!messageId && !groupId && !status) {
      return new Response(
        JSON.stringify({ error: 'At least one search parameter (messageId, groupId, or status) is required' }),
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
    
    // Prepare the request payload
    const payload: Record<string, any> = {
      key: smsApiKey
    };

    // Add filters if they exist
    if (messageId) payload.id = messageId;
    if (groupId) payload.groupId = groupId;
    if (status) payload.status = status;
    if (deviceId) payload.deviceID = deviceId;
    if (simSlot) payload.simSlot = simSlot;
    if (startTimestamp) payload.startTimestamp = startTimestamp;
    if (endTimestamp) payload.endTimestamp = endTimestamp;

    console.log("Retrieving SMS messages with filters:", JSON.stringify({
      ...payload,
      key: "[REDACTED]" // Log without exposing the API key
    }));

    try {
      const response = await fetch(`${smsServerUrl}/services/read-messages.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(
          Object.entries(payload)
            .filter(([_, value]) => value !== undefined && value !== null)
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
      console.log("SMS API response received");

      if (!responseData.success) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to retrieve SMS messages', 
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
          messages: responseData.data.messages,
          count: responseData.data.messages?.length || 0,
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
    console.error("Error in retrieve SMS messages function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
