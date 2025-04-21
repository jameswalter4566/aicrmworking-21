
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Main function to handle requests
Deno.serve(async (req) => {
  console.log("test-edgefunction called with method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Responding to OPTIONS request with CORS headers");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Attempt to parse request body if present
    let requestData = {};
    try {
      requestData = await req.json();
      console.log("Received data:", JSON.stringify(requestData));
    } catch (e) {
      console.log("No JSON body or error parsing it:", e.message);
    }

    // Simple success response for testing
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Test edge function successfully called!",
        timestamp: new Date().toISOString(),
        receivedData: requestData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in test-edgefunction: ${error.message}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
