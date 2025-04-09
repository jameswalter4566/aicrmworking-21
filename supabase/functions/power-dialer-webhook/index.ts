
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse data from Twilio webhook
    const formData = await req.formData();
    const callSid = formData.get('CallSid')?.toString();
    const callStatus = formData.get('CallStatus')?.toString();
    const callDuration = formData.get('CallDuration')?.toString();

    console.log(`Received webhook for call ${callSid} with status ${callStatus}`);

    if (!callSid) {
      return new Response(
        JSON.stringify({ error: 'Missing CallSid in webhook data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Find the call record using the Twilio Call SID
    const { data: callRecord, error: callError } = await supabase
      .from('power_dialer_calls')
      .select('*')
      .eq('twilio_call_sid', callSid)
      .single();

    if (callError || !callRecord) {
      console.error("Error finding call record:", callError);
      return new Response(
        JSON.stringify({ error: 'Call record not found', details: callError }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log("Found call record:", callRecord);

    // Handle different call statuses
    switch (callStatus) {
      case 'completed':
      case 'busy':
      case 'no-answer':
      case 'failed':
      case 'canceled':
        // Update call record
        const { error: updateError } = await supabase
          .from('power_dialer_calls')
          .update({
            status: 'completed',
            end_timestamp: new Date().toISOString(),
            duration: callDuration ? parseInt(callDuration, 10) : null
          })
          .eq('id', callRecord.id);

        if (updateError) {
          console.error("Error updating call record:", updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update call record', details: updateError }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // If there was an agent assigned to this call, update their status
        if (callRecord.agent_id) {
          await supabase
            .from('power_dialer_agents')
            .update({
              status: 'available',
              current_call_id: null,
              last_status_change: new Date().toISOString()
            })
            .eq('id', callRecord.agent_id);
        }

        // Update contact status based on final call result
        if (callRecord.contact_id) {
          let contactStatus = 'contacted';
          if (callStatus === 'busy' || callStatus === 'no-answer' || callStatus === 'failed') {
            contactStatus = 'no_answer';
          } else if (callRecord.machine_detection_result === 'machine') {
            contactStatus = 'voicemail';
          }

          await supabase
            .from('power_dialer_contacts')
            .update({
              status: contactStatus,
              last_call_timestamp: new Date().toISOString()
            })
            .eq('id', callRecord.contact_id);
        }

        // Check if there are any queued calls waiting for an agent
        const { data: queuedCall } = await supabase
          .from('power_dialer_call_queue')
          .select('*, calls:power_dialer_calls(*)')
          .order('priority', { ascending: false })
          .order('created_timestamp', { ascending: true })
          .limit(1)
          .single();

        if (queuedCall && callRecord.agent_id) {
          console.log("Found queued call:", queuedCall);
          // Connect agent to queued call
          await supabase
            .from('power_dialer_calls')
            .update({
              agent_id: callRecord.agent_id
            })
            .eq('id', queuedCall.call_id);

          // Update agent with new call
          await supabase
            .from('power_dialer_agents')
            .update({
              status: 'busy',
              current_call_id: queuedCall.call_id,
              last_status_change: new Date().toISOString()
            })
            .eq('id', callRecord.agent_id);

          // Remove from queue
          await supabase
            .from('power_dialer_call_queue')
            .delete()
            .eq('id', queuedCall.id);
        }
        break;

      case 'in-progress':
        // Call is in progress, no specific action needed
        break;

      case 'ringing':
        // Call is ringing, no specific action needed
        break;

      default:
        console.log(`Unhandled call status: ${callStatus}`);
        break;
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error in power-dialer-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
