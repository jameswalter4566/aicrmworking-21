import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { connect, StringCodec } from "https://deno.land/x/nats@v1.16.0/src/mod.ts";

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get callId from URL parameters
    const url = new URL(req.url);
    const callId = url.searchParams.get('callId');
    
    if (!callId) {
      throw new Error('Call ID is required');
    }
    
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const callStatus = formData.get('CallStatus')?.toString();
    const callSid = formData.get('CallSid')?.toString();
    const callDuration = formData.get('CallDuration')?.toString();
    
    console.log(`Webhook received for call ${callId} with status: ${callStatus}`);
    
    // Get the call record
    const { data: call, error: callError } = await supabase
      .from('predictive_dialer_calls')
      .select('*, contact:contact_id(*), agent:agent_id(*)')
      .eq('id', callId)
      .single();
      
    if (callError || !call) {
      throw new Error(`Call not found: ${callError?.message}`);
    }
    
    // Update call status based on Twilio webhook
    switch(callStatus) {
      case 'completed':
      case 'busy':
      case 'no-answer':
      case 'failed':
      case 'canceled':
        // Call ended, update the record
        await supabase
          .from('predictive_dialer_calls')
          .update({
            status: 'completed',
            end_timestamp: new Date().toISOString(),
            duration: callDuration ? parseInt(callDuration) : null
          })
          .eq('id', callId);
          
        // If there was an agent assigned, update their status
        if (call.agent_id) {
          await supabase
            .from('predictive_dialer_agents')
            .update({
              status: 'available',
              current_call_id: null
            })
            .eq('id', call.agent_id);
        }
        
        // Update contact status if needed
        if (call.contact_id) {
          let contactStatus = 'contacted';
          
          if (callStatus === 'no-answer') {
            contactStatus = 'no_answer';
          } else if (callStatus === 'busy' || callStatus === 'failed') {
            contactStatus = 'not_contacted'; // Could retry later
          }
          
          await supabase
            .from('predictive_dialer_contacts')
            .update({
              status: contactStatus,
              last_call_timestamp: new Date().toISOString()
            })
            .eq('id', call.contact_id);
        }
        
        // Remove from queue if it was there
        await supabase
          .from('predictive_dialer_call_queue')
          .delete()
          .eq('call_id', callId);
          
        break;
        
      case 'in-progress':
        // Call is connected
        await supabase
          .from('predictive_dialer_calls')
          .update({
            status: 'in_progress'
          })
          .eq('id', callId);
        break;
        
      default:
        // For other statuses (ringing, queued, etc.), just log
        console.log(`Received status update: ${callStatus} for call ${callId}`);
    }
    
    // After processing the webhook, publish status to NATS
    const nats = await connect({ servers: Deno.env.get("NATS_URL") });
    
    const statusUpdate = {
      callSid,
      status: callStatus,
      timestamp: Date.now(),
      agentId: call.agent_id,
      leadId: call.contact_id,
      phoneNumber: call.contact?.phone_number,
      duration: callDuration ? parseInt(callDuration) : undefined
    };
    
    await nats.publish(`call.status.${call.session_id}`, sc.encode(JSON.stringify(statusUpdate)));
    await nats.flush();
    await nats.close();
    
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in dialer-webhook function:', error);
    
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200, // Return 200 even for errors to avoid Twilio retries
    });
  }
});
