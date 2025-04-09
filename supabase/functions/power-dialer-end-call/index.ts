
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import twilio from 'npm:twilio@4.23.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
};

console.log("Power Dialer End Call function loaded");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Initialize Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { callSid } = await req.json();
    
    if (!callSid) {
      return new Response(
        JSON.stringify({ success: false, error: "Twilio Call SID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Ending call with SID ${callSid}`);

    // Initialize Twilio client
    const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // End the call using Twilio API
    try {
      await twilioClient.calls(callSid).update({ status: 'completed' });
    } catch (error) {
      console.error(`Error ending Twilio call with SID ${callSid}:`, error);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to end call: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Find and update the call record
    const { data: call, error: callError } = await supabase
      .from('power_dialer_calls')
      .select('*')
      .eq('twilio_call_sid', callSid)
      .single();
    
    if (callError) {
      console.error("Error finding call record:", callError);
    } else if (call) {
      // Update the call record
      await supabase
        .from('power_dialer_calls')
        .update({
          status: 'completed',
          end_timestamp: new Date().toISOString()
        })
        .eq('id', call.id);
      
      // If the call was assigned to an agent, update agent status
      if (call.agent_id) {
        await supabase
          .from('power_dialer_agents')
          .update({
            status: 'available',
            current_call_id: null,
            last_status_change: new Date().toISOString()
          })
          .eq('id', call.agent_id);
      }
      
      // If the call was in the queue, remove it
      await supabase
        .from('power_dialer_call_queue')
        .delete()
        .eq('call_id', call.id);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Call ended successfully",
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in power-dialer-end-call function:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
