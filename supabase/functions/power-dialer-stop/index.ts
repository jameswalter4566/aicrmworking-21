
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

console.log("Power Dialer Stop function loaded");

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
    const { agentId } = await req.json();
    
    if (!agentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Agent ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Stopping dialer for agent ${agentId}`);

    // Update agent status to offline
    await supabase
      .from('power_dialer_agents')
      .update({
        status: 'offline',
        last_status_change: new Date().toISOString()
      })
      .eq('id', agentId);
    
    // If the agent has a current call, we'll let it complete naturally
    // but won't assign any new calls
    
    // Initialize Twilio client to check for active calls
    const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Get any active outbound calls that are not yet assigned to an agent
    const { data: unassignedCalls, error: unassignedCallsError } = await supabase
      .from('power_dialer_calls')
      .select('*')
      .is('agent_id', null)
      .eq('status', 'in_progress');
    
    if (unassignedCallsError) {
      console.error("Error fetching unassigned calls:", unassignedCallsError);
    } else if (unassignedCalls && unassignedCalls.length > 0) {
      // End any unassigned active calls
      for (const call of unassignedCalls) {
        if (call.twilio_call_sid) {
          try {
            // Hangup the call using Twilio API
            await twilioClient.calls(call.twilio_call_sid).update({ status: 'completed' });
            
            console.log(`Successfully ended call with SID: ${call.twilio_call_sid}`);
          } catch (error) {
            console.error(`Error ending call with SID ${call.twilio_call_sid}:`, error);
          }
          
          // Update the call record
          await supabase
            .from('power_dialer_calls')
            .update({
              status: 'completed',
              end_timestamp: new Date().toISOString()
            })
            .eq('id', call.id);
        }
      }
    }
    
    // Update any contacts that are still in_progress but no longer in an active call
    await supabase.rpc('reset_in_progress_contacts', {});
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Dialer stopped successfully",
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in power-dialer-stop function:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
