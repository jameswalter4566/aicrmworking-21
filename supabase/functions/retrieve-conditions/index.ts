
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );
    
    // Get the leadId from URL query parameter
    const url = new URL(req.url);
    const leadId = url.searchParams.get("leadId");

    if (!leadId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing lead ID parameter" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Retrieving conditions for lead ID: ${leadId}`);

    // Fetch conditions from the database
    const { data, error } = await supabaseClient
      .from("loan_conditions")
      .select("*")
      .eq("lead_id", leadId)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 is "not found" error
      console.error("Error retrieving conditions:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // If no conditions found, return empty structure
    if (!data) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: null,
          conditions: null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        conditions: data.conditions_data 
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
