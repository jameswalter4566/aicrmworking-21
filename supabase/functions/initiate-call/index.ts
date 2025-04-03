
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

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
    // Parse the request body
    const { phoneNumber, leadId, agentId } = await req.json();

    console.log(`Initiating call to ${phoneNumber} for lead ${leadId}`);

    // This would be where you'd integrate with a real telephony provider like Twilio
    // For now, we'll just simulate a response

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return a success response with the call details
    return new Response(
      JSON.stringify({
        success: true,
        callId: `call-${Date.now()}`,
        leadId,
        status: "initiated",
        message: `Started call to ${phoneNumber}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error("Error processing call request:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to initiate call",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
