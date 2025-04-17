
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoanApprovedSMSPayload {
  leadId: string | number;
  currentStep: string;
  previousStep?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing loan-approved-sms request`);
    
    const body = await req.json() as LoanApprovedSMSPayload;
    const { leadId, currentStep, previousStep, firstName, lastName, phoneNumber } = body;

    // Validate inputs
    if (!leadId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing leadId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if the loan status has transitioned to "approved" for the first time
    if (currentStep !== "approved" || previousStep === "approved") {
      console.log(`[${requestId}] Skipping SMS - not a first-time transition to approved status`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No SMS sent - not a first-time transition to approved status",
          data: { currentStep, previousStep }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If phone number was not provided in the payload, fetch it from the lead record
    let recipientPhone = phoneNumber;
    let recipientFirstName = firstName;
    let recipientLastName = lastName;

    if (!recipientPhone || !recipientFirstName) {
      console.log(`[${requestId}] Fetching lead details for ID: ${leadId}`);
      const { data: leadData, error: fetchError } = await supabase
        .from("leads")
        .select("first_name, last_name, phone1")
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

      recipientPhone = recipientPhone || leadData?.phone1;
      recipientFirstName = recipientFirstName || leadData?.first_name;
      recipientLastName = recipientLastName || leadData?.last_name;
    }

    if (!recipientPhone) {
      console.error(`[${requestId}] No phone number found for lead ${leadId}`);
      return new Response(
        JSON.stringify({ success: false, error: "No phone number available for SMS" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Compose the SMS message
    const fullName = recipientFirstName || "Client";
    const message = `Congratulations ${fullName}! Your loan application has been conditionally Approved by underwriting! I have just emailed you a list of documents that we will need to collect from you in order to get your file to the finish line. Please take a look at the list and message me here if you have any questions about any of the items on that list. And remember you can use that landing page link that I sent you to upload documents!`;

    // Send the SMS via our existing sms-send-single edge function
    console.log(`[${requestId}] Sending approval SMS to ${recipientPhone}`);
    const { data: smsResult, error: smsError } = await supabase.functions.invoke('sms-send-single', {
      body: {
        phoneNumber: recipientPhone,
        message: message,
        prioritize: true
      }
    });

    if (smsError) {
      console.error(`[${requestId}] Error sending SMS:`, smsError);
      return new Response(
        JSON.stringify({ success: false, error: smsError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log the activity in lead_activities
    const { error: activityError } = await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "sms_notification",
      description: `Sent loan approval notification SMS to ${recipientPhone}`
    });

    if (activityError) {
      console.error(`[${requestId}] Error logging activity:`, activityError);
      // Continue even if activity logging fails
    }

    console.log(`[${requestId}] Successfully sent approval SMS to ${recipientPhone}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Loan approval SMS sent successfully",
        data: {
          recipientPhone,
          messageId: smsResult?.messageId || "unknown"
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in loan-approved-sms function:", error);
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
