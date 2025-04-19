
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

    const { leadId, conditions } = await req.json();

    if (!leadId || !conditions) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Updating conditions for lead ID: ${leadId}`);

    // Check if this is the first time conditions are being added
    const { data: existingConditions, error: fetchError } = await supabaseClient
      .from("loan_conditions")
      .select("*")
      .eq("lead_id", leadId)
      .maybeSingle();
    
    const isFirstConditionUpdate = !existingConditions || 
      !existingConditions.conditions_data || 
      Object.keys(existingConditions.conditions_data).length === 0;
    
    console.log(`Is first condition update: ${isFirstConditionUpdate}`);
    
    // Check if the incoming conditions have any actual conditions
    const hasConditions = conditions && (
      (conditions.masterConditions && conditions.masterConditions.length > 0) ||
      (conditions.generalConditions && conditions.generalConditions.length > 0) ||
      (conditions.priorToFinalConditions && conditions.priorToFinalConditions.length > 0) ||
      (conditions.complianceConditions && conditions.complianceConditions.length > 0)
    );

    console.log(`Has actual conditions: ${hasConditions}`);
    
    // Log the conditions count for debugging
    let totalConditionsCount = 0;
    if (conditions.masterConditions) totalConditionsCount += conditions.masterConditions.length;
    if (conditions.generalConditions) totalConditionsCount += conditions.generalConditions.length;
    if (conditions.priorToFinalConditions) totalConditionsCount += conditions.priorToFinalConditions.length;
    if (conditions.complianceConditions) totalConditionsCount += conditions.complianceConditions.length;
    console.log(`Total conditions count: ${totalConditionsCount}`);
    
    // Store conditions in the database
    const { data, error } = await supabaseClient
      .from("loan_conditions")
      .upsert({
        lead_id: leadId,
        conditions_data: conditions,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "lead_id"
      });

    if (error) {
      console.error("Error updating conditions:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`Successfully stored conditions for lead ${leadId}`);

    // If this is the first time conditions are added and there are actual conditions, update loan status to Approved
    if (isFirstConditionUpdate && hasConditions) {
      console.log(`First time conditions detected for lead ${leadId}. Updating loan status to Approved`);
      
      try {
        // Call the update-loan-progress function to set status to "approved"
        const { data: progressData, error: progressError } = await supabaseClient.functions.invoke('update-loan-progress', {
          body: { 
            leadId, 
            currentStep: "approved",
            notes: "Automatically set to Approved based on conditions detected"
          }
        });
        
        if (progressError) {
          console.error("Error updating loan progress:", progressError);
          // Continue with the response even if status update failed
        } else {
          console.log("Successfully updated loan status to Approved");
        }
      } catch (progressErr) {
        console.error("Exception during status update:", progressErr);
        // Continue with the response even if status update failed
      }
    }

    // After successfully updating conditions, check if we should send an SMS
    // This should happen for any condition update AFTER the first one (when the loan is already approved)
    if (hasConditions && !isFirstConditionUpdate) {
      console.log(`Conditions updated for lead ${leadId}. Checking loan status before sending SMS notification...`);
      
      try {
        // Check loan status directly from the leads table
        const { data: leadData, error: leadError } = await supabaseClient
          .from("leads")
          .select("mortgage_data")
          .eq("id", leadId)
          .single();
        
        if (leadError) {
          console.error(`Error retrieving lead data: ${leadError.message}`);
          // Continue with the response even if we can't check the status
        } else {
          // Check different possible paths to loan status in the mortgage_data
          const loanStatus = leadData?.mortgage_data?.loan_status?.toLowerCase() || 
                            leadData?.mortgage_data?.loan?.status?.toLowerCase() ||
                            leadData?.mortgage_data?.loan?.progress?.currentStep?.toLowerCase() || '';
          
          console.log(`Current loan status found: "${loanStatus}"`);
          
          // Check if the loan is in approved status (various formats)
          const isApproved = loanStatus === "approved" || 
                            loanStatus.includes("approved") || 
                            loanStatus.includes("accept");
          
          if (isApproved) {
            console.log("Loan is in approved status, proceeding with SMS notification");
            
            // Call the conditions-update-sms function
            const { data: smsData, error: smsError } = await supabaseClient.functions.invoke(
              'conditions-update-sms',
              { body: { leadId } }
            );

            if (smsError) {
              console.error('Error sending conditions update SMS:', smsError);
            } else {
              console.log('Conditions update SMS sent successfully:', smsData);
            }
          } else {
            console.log(`Loan not in approved status (current: "${loanStatus}"). Skipping SMS notification.`);
          }
        }
      } catch (smsErr) {
        console.error('Exception sending conditions update SMS:', smsErr);
      }
    } else {
      console.log(`Skipping SMS notification. isFirstConditionUpdate=${isFirstConditionUpdate}, hasConditions=${hasConditions}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        statusUpdated: isFirstConditionUpdate && hasConditions
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
