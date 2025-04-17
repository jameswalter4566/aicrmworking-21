
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";

console.log("update-loan-progress function loaded");

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

interface UpdateLoanProgressRequest {
  leadId: string | number;
  currentStep: string;
  notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing loan progress update request`);

    // Get request body
    const body = await req.json() as UpdateLoanProgressRequest;
    const { leadId, currentStep, notes } = body;
    
    if (!leadId) {
      console.error(`[${requestId}] Missing leadId in request`);
      return new Response(
        JSON.stringify({ success: false, error: "Missing leadId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!currentStep || !LOAN_PROGRESS_STEPS.includes(currentStep)) {
      console.error(`[${requestId}] Invalid or missing currentStep: ${currentStep}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or missing currentStep",
          validSteps: LOAN_PROGRESS_STEPS,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[${requestId}] Updating loan progress for lead ${leadId} to step: ${currentStep}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current mortgage data
    const { data: leadData, error: fetchError } = await supabase
      .from("leads")
      .select("mortgage_data, first_name, last_name, phone1")
      .eq("id", leadId)
      .single();

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

    // Get previous step
    const previousStep = leadData?.mortgage_data?.loan?.progress?.currentStep;
    
    // Create or update mortgage_data with loan progress
    const currentMortgageData = leadData?.mortgage_data || {};
    const updatedMortgageData = {
      ...currentMortgageData,
      loan: {
        ...(currentMortgageData?.loan || {}),
        progress: {
          ...(currentMortgageData?.loan?.progress || {}),
          currentStep,
          updatedAt: new Date().toISOString(),
        },
      },
    };

    // Update the lead with new mortgage_data
    const { error: updateError } = await supabase
      .from("leads")
      .update({ 
        mortgage_data: updatedMortgageData 
      })
      .eq("id", leadId);

    if (updateError) {
      console.error(`[${requestId}] Error updating lead data:`, updateError);
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create a log entry for this progress change
    const progressStatusText = LOAN_PROGRESS_STEPS.indexOf(currentStep) >= LOAN_PROGRESS_STEPS.indexOf("approved") 
      ? "Approved" 
      : LOAN_PROGRESS_STEPS.indexOf(currentStep) >= LOAN_PROGRESS_STEPS.indexOf("submitted")
      ? "In Processing"
      : "Application";

    const { error: activityError } = await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "loan_progress",
      description: `Loan progress updated to ${currentStep}${notes ? ` - ${notes}` : ''}`,
    });

    if (activityError) {
      console.error(`[${requestId}] Error logging activity:`, activityError);
      // We continue even if activity logging fails
    }

    // If the current step is "submitted" and it's different from the previous step,
    // trigger the loan-submitted-sms function
    if (currentStep === "submitted" && previousStep !== "submitted") {
      console.log(`[${requestId}] Triggering loan-submitted-sms function for lead ${leadId}`);
      
      // Invoke the loan-submitted-sms function
      supabase.functions.invoke('loan-submitted-sms', {
        body: { 
          leadId,
          currentStep,
          previousStep,
          firstName: leadData?.first_name,
          lastName: leadData?.last_name,
          phoneNumber: leadData?.phone1
        }
      })
      .catch(error => {
        // Log the error but don't fail the request
        console.error(`[${requestId}] Error triggering loan-submitted-sms:`, error);
      });
    }
    
    // If the current step is "approved" and it's different from the previous step,
    // trigger the loan-approved-sms function
    if (currentStep === "approved" && previousStep !== "approved") {
      console.log(`[${requestId}] Triggering loan-approved-sms function for lead ${leadId}`);
      
      // Invoke the loan-approved-sms function
      supabase.functions.invoke('loan-approved-sms', {
        body: { 
          leadId,
          currentStep,
          previousStep,
          firstName: leadData?.first_name,
          lastName: leadData?.last_name,
          phoneNumber: leadData?.phone1
        }
      })
      .catch(error => {
        // Log the error but don't fail the request
        console.error(`[${requestId}] Error triggering loan-approved-sms:`, error);
      });
    }

    console.log(`[${requestId}] Successfully updated loan progress for lead ${leadId}`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          leadId,
          currentStep,
          previousData: leadData?.mortgage_data?.loan?.progress || {},
          updatedAt: updatedMortgageData.loan.progress.updatedAt,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing loan progress update:", error);
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
