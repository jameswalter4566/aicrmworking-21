
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { leadId } = await req.json();

    if (!leadId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing leadId parameter" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Retrieving conditions for lead ID: ${leadId}`);

    // Fetch conditions from the database
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

    // If no conditions are found, return an empty structure
    if (!data) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          conditions: {
            masterConditions: [],
            generalConditions: [],
            priorToFinalConditions: [],
            complianceConditions: []
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully retrieved conditions");
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        conditions: data.conditions_data,
        updatedAt: data.updated_at
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
