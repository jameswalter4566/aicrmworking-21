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
    // Parse request body
    const { webhookUrl } = await req.json();
    
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Webhook URL is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Testing webhook at URL: ${webhookUrl}`);
    
    // Create a test message payload
    const testPayload = {
      messages: [{
        number: "+15551234567",
        message: "This is a test message from the webhook tester at " + new Date().toISOString(),
        deviceID: "TEST_DEVICE"
      }]
    };
    
    // Send a test request to the webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    // Get the response text
    let responseBody;
    try {
      responseBody = await response.text();
      
      // Try to parse as JSON if possible
      try {
        responseBody = JSON.parse(responseBody);
      } catch (e) {
        // Keep as text if not valid JSON
      }
    } catch (e) {
      responseBody = "Could not read response body";
    }
    
    console.log(`Webhook test response: ${response.status}`);
    
    return new Response(
      JSON.stringify({
        success: response.ok,
        statusCode: response.status,
        statusText: response.statusText,
        response: responseBody,
        testedAt: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error testing webhook:", error);
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
