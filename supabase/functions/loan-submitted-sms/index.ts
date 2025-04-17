
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";

console.log("loan-submitted-sms function loaded");

interface LoanStatusUpdateEvent {
  leadId: string | number;
  currentStep: string;
  previousStep?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing loan submitted SMS notification`);

    const body = await req.json() as LoanStatusUpdateEvent;
    const { leadId, currentStep, previousStep, firstName, lastName, phoneNumber } = body;
    
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

    // Only proceed if the current step is "submitted"
    if (currentStep !== "submitted") {
      console.log(`[${requestId}] Current step is ${currentStep}, not sending SMS`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Current step ${currentStep} doesn't trigger SMS notification` 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get lead data if not provided
    let leadData = { first_name: firstName, last_name: lastName, phone1: phoneNumber };
    
    if (!firstName || !lastName || !phoneNumber) {
      console.log(`[${requestId}] Fetching lead data for lead ${leadId}`);
      
      const { data: fetchedLeadData, error } = await supabase
        .from("leads")
        .select("first_name, last_name, phone1")
        .eq("id", leadId)
        .single();
      
      if (error) {
        console.error(`[${requestId}] Error fetching lead data:`, error);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to fetch lead data" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      leadData = fetchedLeadData;
    }
    
    // Check if we have the necessary data
    if (!leadData?.first_name || !leadData?.phone1) {
      console.error(`[${requestId}] Missing required lead data for SMS notification`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required lead data (first name or phone number)" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Compose the SMS message
    const message = `Welcome ${leadData.first_name}! Your loan application has officially been submitted to underwriting! Now sit tight over the next 24-48 hours your documents will be reviewed by underwriting. I will message you as soon as we have your approval letter! Please feel free to message me at this number at any time if you have questions about your loans progress!`;
    
    // Send the SMS
    console.log(`[${requestId}] Sending loan submission notification to ${leadData.phone1}`);
    
    const { data: smsResult, error: smsError } = await supabase.functions.invoke('sms-send-single', {
      body: { 
        phoneNumber: leadData.phone1, 
        message: message,
        prioritize: true
      }
    });
    
    if (smsError) {
      console.error(`[${requestId}] Error sending SMS:`, smsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send SMS: " + smsError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    if (!smsResult?.success) {
      console.error(`[${requestId}] SMS API returned error:`, smsResult?.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "SMS API returned error: " + (smsResult?.error || "Unknown error") 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Log activity
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "sms_notification",
      description: "Loan submission SMS notification sent"
    });
    
    console.log(`[${requestId}] Loan submission SMS notification sent successfully`);
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        messageId: smsResult.messageId,
        message: "Loan submission SMS notification sent successfully"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error("Error sending loan submission SMS notification:", error);
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
