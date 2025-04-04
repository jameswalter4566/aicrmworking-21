
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract parameters from URL
    const url = new URL(req.url);
    const agentIdentity = url.searchParams.get('agentIdentity') || 'anonymous';
    
    // Process the form data from Twilio's callback
    const formData = await req.formData();
    
    // Extract important status data
    const callSid = formData.get('CallSid') || '';
    const callStatus = formData.get('CallStatus') || '';
    const to = formData.get('To') || '';
    const from = formData.get('From') || '';
    const direction = formData.get('Direction') || '';
    
    // Log the call status for debugging
    console.log(`Call Status Update: ${callStatus} for call ${callSid}`);
    console.log(`  Direction: ${direction}, From: ${from}, To: ${to}`);
    console.log(`  Agent: ${agentIdentity}`);
    
    // Create a more detailed response
    const response = {
      received: true,
      processed: true,
      callSid,
      callStatus,
      to,
      from,
      direction,
      agentIdentity,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error processing status callback:", error);
    
    // Create a meaningful error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        message: "Failed to process callback",
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 400, headers: corsHeaders }
    );
  } 
});
