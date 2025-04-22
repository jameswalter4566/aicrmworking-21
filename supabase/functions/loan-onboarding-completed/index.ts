
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { sendSMS } from "../_shared/twilio-sms.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, clientName } = await req.json();

    if (!leadId) {
      throw new Error('Lead ID is required');
    }

    // Create Supabase client
    const supabaseClient = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the lead profile to find the createdBy user
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('createdBy')
      .eq('id', leadId)
      .single();

    if (leadError || !lead?.createdBy) {
      throw new Error('Could not find lead creator');
    }

    // Get the user's phone number from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('phone_number')
      .eq('id', lead.createdBy)
      .single();

    if (profileError || !profile?.phone_number) {
      throw new Error('Could not find user phone number');
    }

    // Send the SMS notification
    const message = `${clientName} has completed their 1003! I have already built a Pitch Deck draft so you can get them some numbers immediately! I have also already sent them a checklist of all of the documents they have missed for submission. Go get em!`;

    const smsResult = await sendSMS(profile.phone_number, message);

    if (!smsResult.success) {
      throw new Error('Failed to send SMS notification');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in loan-onboarding-completed:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
