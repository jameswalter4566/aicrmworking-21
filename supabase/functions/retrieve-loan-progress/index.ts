
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";

console.log("retrieve-loan-progress function loaded");

const LOAN_PROGRESS_STEPS = [
  "applicationCreated",
  "disclosuresSent",
  "disclosuresSigned",
  "submitted",
  "processing",
  "approved",
  "closingDisclosureGenerated",
  "closingDisclosureSigned",
  "ctc",
  "docsOut",
  "closing",
  "funded"
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing loan progress retrieval request`);

    // Get leadId from URL or request body
    let leadId;
    
    // Check if it's a GET request with query params
    const url = new URL(req.url);
    if (req.method === "GET") {
      leadId = url.searchParams.get("leadId");
    } else {
      // Assume POST with JSON body
      const body = await req.json();
      leadId = body.leadId;
    }

    if (!leadId) {
      console.error(`[${requestId}] Missing leadId in request`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing leadId",
          data: {
            leadId: "unknown",
            currentStep: "applicationCreated",
            stepIndex: 0,
            progressPercentage: 0,
            allSteps: LOAN_PROGRESS_STEPS,
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[${requestId}] Retrieving loan progress for lead ${leadId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current mortgage data
    const { data: leadData, error: fetchError } = await supabase
      .from("leads")
      .select("id, first_name, last_name, mortgage_data, property_address")
      .eq("id", leadId)
      .maybeSingle();  // Use maybeSingle instead of single to prevent errors when no data is found

    if (fetchError) {
      console.error(`[${requestId}] Error fetching lead data:`, fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!leadData) {
      console.error(`[${requestId}] Lead not found: ${leadId}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Lead not found",
          data: {
            leadId,
            currentStep: "applicationCreated",
            stepIndex: 0,
            progressPercentage: 0,
            allSteps: LOAN_PROGRESS_STEPS,
          }
        }),
        {
          status: 200, // Changed from 404 to 200 to always return usable data
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get progress data or default to first step
    const currentStep = leadData?.mortgage_data?.loan?.progress?.currentStep || "applicationCreated";
    const updatedAt = leadData?.mortgage_data?.loan?.progress?.updatedAt;
    
    // Get the step index for progress calculation
    const stepIndex = LOAN_PROGRESS_STEPS.indexOf(currentStep);
    const normalizedIndex = stepIndex !== -1 ? stepIndex : 0;
    
    // Calculate progress percentage - make sure the current step is fully covered
    // by adding 1 to the index and dividing by total steps
    const progressPercentage = ((normalizedIndex + 1) / LOAN_PROGRESS_STEPS.length) * 100;

    console.log(`[${requestId}] Retrieved loan progress for lead ${leadId}: ${currentStep} (${progressPercentage.toFixed(1)}%)`);

    // Also retrieve activities for this lead
    const { data: activities, error: activitiesError } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .eq("type", "loan_progress")
      .order("timestamp", { ascending: false })
      .limit(5);

    if (activitiesError) {
      console.error(`[${requestId}] Error fetching activities:`, activitiesError);
      // Continue even if activities retrieval fails
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          leadId: leadData.id,
          firstName: leadData.first_name,
          lastName: leadData.last_name,
          propertyAddress: leadData.property_address,
          currentStep,
          stepIndex: normalizedIndex,
          progressPercentage,
          updatedAt,
          activities: activities || [],
          allSteps: LOAN_PROGRESS_STEPS,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error retrieving loan progress:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
