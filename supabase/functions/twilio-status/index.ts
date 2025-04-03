
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
    const url = new URL(req.url);
    const agentIdentity = url.searchParams.get('agentIdentity');
    const formData = await req.formData();
    
    // Extract status data from form
    const callSid = formData.get('CallSid');
    const callStatus = formData.get('CallStatus');
    const to = formData.get('To');
    const from = formData.get('From');
    
    console.log(`Call Status Update: ${callStatus} for call ${callSid} from ${from} to ${to} (Agent: ${agentIdentity})`);
    
    // In a real app, you might want to store this in a database
    // or push it to a real-time channel for the frontend to receive

    return new Response(
      JSON.stringify({
        received: true,
        callSid,
        callStatus,
        agentIdentity
      }),
      { headers: { ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error processing status callback:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process callback" }),
      { status: 400, headers: corsHeaders }
    );
  }
});
