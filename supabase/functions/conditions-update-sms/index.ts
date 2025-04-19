
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSMS } from "../_shared/twilio-sms.ts";

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
    console.log("Conditions update SMS function triggered");
    const { leadId } = await req.json();

    if (!leadId) {
      console.error("No leadId provided");
      return new Response(
        JSON.stringify({ success: false, error: 'Lead ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing SMS notification for lead ID: ${leadId}`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get lead information and current loan status
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('first_name, phone1, mortgage_data')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Lead not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`Retrieved lead data: ${lead.first_name}, phone: ${lead.phone1}`);

    // Check if the loan is already in approved status
    const currentStatus = lead.mortgage_data?.loan_status?.toLowerCase() || '';
    console.log(`Current loan status: ${currentStatus}`);
    
    if (currentStatus !== 'approved') {
      console.log(`Lead ${leadId} is not in approved status (current: ${currentStatus}). Skipping SMS.`);
      return new Response(
        JSON.stringify({ success: false, message: 'Lead not in approved status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!lead.phone1) {
      console.error(`No phone number available for lead ${leadId}`);
      return new Response(
        JSON.stringify({ success: false, error: 'No phone number available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Compose the message
    const message = `Hello! ${lead.first_name} Great news! Underwriting just cleared most of our conditions. Just a few more before we get you to the finish line. Please check your client portal and email for the remaining items. Thank you!`;

    console.log(`Sending SMS to ${lead.phone1} with message: ${message}`);

    // Send the SMS
    const smsResult = await sendSMS(lead.phone1, message);

    if (!smsResult.success) {
      console.error('Error sending SMS:', smsResult.error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send SMS' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Log the successful SMS
    console.log(`Conditions update SMS sent to ${lead.phone1} for lead ${leadId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS sent successfully',
        smsId: smsResult.messageId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in conditions-update-sms function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
