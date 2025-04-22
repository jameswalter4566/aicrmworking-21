
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    // Log the request details for debugging
    console.log("Received request to update user account info");
    
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

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Validate authentication and get user data
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      console.error("Authentication error:", userError?.message || "User not found");
      throw userError || new Error('User not found');
    }
    
    console.log(`Authenticated user ID: ${user.id}`);
    
    // Parse request body
    const { phoneNumber } = await req.json();
    console.log(`Updating phone number to: ${phoneNumber}`);

    // Normalize phone number format (remove any non-digits if necessary)
    const normalizedPhoneNumber = phoneNumber ? phoneNumber.trim() : null;
    
    // Update user profile
    const { data, error: updateError } = await supabaseClient
      .from('profiles')
      .update({ 
        phone_number: normalizedPhoneNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error("Database update error:", updateError.message);
      throw updateError;
    }

    // Verify the update was successful
    const { data: verifyData, error: verifyError } = await supabaseClient
      .from('profiles')
      .select('phone_number')
      .eq('id', user.id)
      .single();
      
    if (verifyError) {
      console.error("Verification error:", verifyError.message);
    } else {
      console.log(`Phone number verification: ${verifyData?.phone_number}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Phone number updated successfully",
      phoneNumber: normalizedPhoneNumber
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error updating user account info:', error.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
