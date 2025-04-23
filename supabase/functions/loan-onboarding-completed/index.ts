
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
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] ====== LOAN ONBOARDING COMPLETED FUNCTION START ======`);
    
    const { leadId, clientName } = await req.json();

    if (!leadId) {
      console.error(`[${requestId}] Missing required parameter: leadId`);
      throw new Error('Lead ID is required');
    }

    console.log(`[${requestId}] Processing onboarding completion notification for lead ID: ${leadId}, client: ${clientName || 'Unknown'}`);

    // Create Supabase client with service role key for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${requestId}] Missing Supabase configuration`);
      throw new Error("Supabase configuration is missing");
    }
    
    console.log(`[${requestId}] Creating Supabase client with service role key`);
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Enhanced: Fetch both lead and creator information in one query
    const { data: leadData, error: leadError } = await supabaseClient
      .from('leads')
      .select('created_by, first_name, last_name')
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      console.warn(`[${requestId}] Error finding lead or no lead found for ID: ${leadId}. ${leadError?.message || 'No details available'}`);
      
      // Fallback to admin notification if no specific lead creator found
      const { data: adminProfiles, error: adminsError } = await supabaseClient
        .from('profiles')
        .select('phone_number, email')
        .eq('role', 'admin')
        .not('phone_number', 'is', null);
      
      if (adminsError || !adminProfiles || adminProfiles.length === 0) {
        console.error(`[${requestId}] No recipients found to send SMS notification`);
        throw new Error('No recipients found to send SMS notification');
      }

      const phoneNumbers = adminProfiles
        .map(profile => profile.phone_number)
        .filter(phone => phone && phone.trim() !== '');

      console.log(`[${requestId}] Found ${phoneNumbers.length} admin users to notify as fallback`);
      
      // Send SMS to admin users
      const message = `Onboarding completed for a lead (ID: ${leadId}) without a specific creator. Check the system.`;
      let successCount = 0;
      
      for (const phoneNumber of phoneNumbers) {
        try {
          const smsResult = await sendSMS(phoneNumber, message);
          if (smsResult.success) {
            successCount++;
            console.log(`[${requestId}] Fallback SMS sent successfully to ${phoneNumber}`);
          } else {
            console.error(`[${requestId}] Failed to send fallback SMS to ${phoneNumber}: ${smsResult.error}`);
          }
        } catch (smsError) {
          console.error(`[${requestId}] Error sending fallback SMS to ${phoneNumber}:`, smsError);
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

    // Direct profile lookup from profiles table for creator's phone number
    if (leadData.created_by) {
      console.log(`[${requestId}] Looking up profile for creator ID: ${leadData.created_by}`);
      
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('phone_number')
        .eq('id', leadData.created_by)
        .single();

      if (profile?.phone_number) {
        console.log(`[${requestId}] Successfully found phone number for creator: ${profile.phone_number}`);
        
        // Construct message with more context
        const message = `${clientName || leadData.first_name || 'A client'} has completed their 1003! I have already built a Pitch Deck draft so you can get them some numbers immediately! I have also already sent them a checklist of all of the documents they have missed for submission. Go get em!`;

        // Send SMS
        try {
          const smsResult = await sendSMS(profile.phone_number, message);
          if (smsResult.success) {
            console.log(`[${requestId}] Successfully sent SMS to creator's phone: ${profile.phone_number}`);
            return new Response(
              JSON.stringify({ 
                success: true, 
                notifiedNumber: profile.phone_number,
                leadCreatorId: leadData.created_by
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            console.error(`[${requestId}] Failed to send SMS: ${smsResult.error}`);
            throw new Error(`Failed to send SMS: ${smsResult.error}`);
          }
        } catch (smsError) {
          console.error(`[${requestId}] Error sending SMS to ${profile.phone_number}:`, smsError);
          throw smsError;
        }
      }
    }

    console.error(`[${requestId}] No valid phone number found for notification`);
    throw new Error('No valid phone number found for notification');

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
