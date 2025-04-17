
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the leadId from the request
    let leadId;
    
    // Check if it's GET or POST and extract leadId accordingly
    if (req.method === 'GET') {
      const url = new URL(req.url);
      leadId = url.searchParams.get('leadId');
    } else {
      // For POST requests, get leadId from the body
      const body = await req.json();
      leadId = body.leadId;
    }

    if (!leadId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing leadId parameter" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Retrieving conditions for lead ID: ${leadId}`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get loan conditions data
    const { data, error } = await supabaseClient
      .from("loan_conditions")
      .select("*")
      .eq("lead_id", leadId)
      .maybeSingle();

    if (error) {
      console.error("Error retrieving conditions:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("Found conditions data:", data);

    // Return the conditions if found
    return new Response(
      JSON.stringify({
        success: true,
        conditions: data ? data.conditions_data : null,
        updatedAt: data ? data.updated_at : null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
