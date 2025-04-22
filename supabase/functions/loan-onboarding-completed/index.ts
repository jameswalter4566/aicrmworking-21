
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

    const { leadId, createdBy } = await req.json();
    
    if (!leadId || !createdBy) {
      throw new Error('Lead ID and creator ID are required');
    }

    // Get lead data to get client name
    const { data: leadData, error: leadError } = await supabaseClient
      .from('leads')
      .select('first_name, last_name')
      .eq('id', leadId)
      .single();

    if (leadError) throw leadError;

    // Get user's phone number from profiles
    const { data: userData, error: userError } = await supabaseClient
      .from('profiles')
      .select('phone_number')
      .eq('id', createdBy)
      .single();

    if (userError) throw userError;

    if (!userData?.phone_number) {
      throw new Error('User phone number not found');
    }

    const clientName = `${leadData.first_name} ${leadData.last_name}`;
    const message = `${clientName} has completed their 1003! I have already built a Pitch Deck draft so you can get them some numbers immediately! I have also already sent them a checklist of all of the documents they have missed for submission. Go get em!`;

    console.log(`Sending completion notification to ${userData.phone_number}`);

    // Send SMS using the shared Twilio function
    const smsResult = await sendSMS(userData.phone_number, message);

    if (!smsResult.success) {
      throw new Error(`Failed to send SMS: ${smsResult.error}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully" }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
