
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
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

    console.log(`Processing onboarding completion notification for lead ID: ${leadId}, client: ${clientName}`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Enhanced: Fetch both lead and creator information in one query
    const { data: leadData, error: leadError } = await supabaseClient
      .from('leads')
      .select('created_by, first_name, last_name')
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      console.warn(`Error finding lead or no lead found for ID: ${leadId}. ${leadError?.message || 'No details available'}`);
      
      // Fallback to admin notification if no specific lead creator found
      const { data: adminProfiles, error: adminsError } = await supabaseClient
        .from('profiles')
        .select('phone_number')
        .eq('role', 'admin')
        .not('phone_number', 'is', null);
        
      if (adminsError || !adminProfiles || adminProfiles.length === 0) {
        console.error('No admin users found to send SMS');
        throw new Error('No recipients found to send SMS notification');
      }

      const phoneNumbers = adminProfiles
        .map(profile => profile.phone_number)
        .filter(phone => phone && phone.trim() !== '');

      console.log(`Found ${phoneNumbers.length} admin users to notify as fallback`);

      // Send SMS to admin users
      const message = `Onboarding completed for a lead (ID: ${leadId}) without a specific creator. Check the system.`;
      
      let successCount = 0;
      for (const phoneNumber of phoneNumbers) {
        try {
          const smsResult = await sendSMS(phoneNumber, message);
          
          if (smsResult.success) {
            successCount++;
            console.log(`Fallback SMS sent successfully to ${phoneNumber}`);
          } else {
            console.error(`Failed to send fallback SMS to ${phoneNumber}: ${smsResult.error}`);
          }
        } catch (smsError) {
          console.error(`Error sending fallback SMS to ${phoneNumber}:`, smsError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No specific lead creator found. Notified admin users.',
          notifiedCount: successCount
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // If lead creator found, proceed with normal notification flow
    let phoneNumbers = [];
    
    if (leadData.created_by) {
      // Try to get the creator's phone number
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('phone_number')
        .eq('id', leadData.created_by)
        .single();

      if (!profileError && profile?.phone_number) {
        phoneNumbers.push(profile.phone_number);
      } else {
        console.warn(`Could not find phone number for lead creator: ${leadData.created_by}`);
      }
    }
    
    // If no phone numbers found, fallback to admin users
    if (phoneNumbers.length === 0) {
      const { data: adminProfiles, error: adminsError } = await supabaseClient
        .from('profiles')
        .select('phone_number')
        .eq('role', 'admin')
        .not('phone_number', 'is', null);
        
      if (!adminsError && adminProfiles && adminProfiles.length > 0) {
        phoneNumbers = adminProfiles
          .map(profile => profile.phone_number)
          .filter(phone => phone && phone.trim() !== '');
        
        console.log(`Found ${phoneNumbers.length} admin users to notify as fallback`);
      }
    }

    if (phoneNumbers.length === 0) {
      console.error('No recipients found to send SMS notification');
      throw new Error('No recipients found to send SMS notification');
    }

    // Construct message with more context
    const message = `${clientName || leadData.first_name || 'A client'} has completed their 1003! I have already built a Pitch Deck draft so you can get them some numbers immediately! I have also already sent them a checklist of all of the documents they have missed for submission. Go get em!`;

    let successCount = 0;
    
    // Send SMS to each phone number
    for (const phoneNumber of phoneNumbers) {
      try {
        const smsResult = await sendSMS(phoneNumber, message);
        
        if (smsResult.success) {
          successCount++;
          console.log(`SMS sent successfully to ${phoneNumber}`);
        } else {
          console.error(`Failed to send SMS to ${phoneNumber}: ${smsResult.error}`);
        }
      } catch (smsError) {
        console.error(`Error sending SMS to ${phoneNumber}:`, smsError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifiedCount: successCount,
        totalRecipients: phoneNumbers.length,
        leadCreatorId: leadData.created_by
      }),
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
