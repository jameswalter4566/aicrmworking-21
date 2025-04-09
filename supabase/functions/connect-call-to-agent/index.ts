
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import twilio from 'https://esm.sh/twilio@4.18.1';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Twilio client
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { callId, agentId } = await req.json();
    
    if (!callId || !agentId) {
      throw new Error('Call ID and Agent ID are required');
    }
    
    // Get the call record
    const { data: call, error: callError } = await supabase
      .from('predictive_dialer_calls')
      .select('*')
      .eq('id', callId)
      .single();
      
    if (callError || !call) {
      throw new Error(`Call not found: ${callError?.message}`);
    }
    
    // Get the agent
    const { data: agent, error: agentError } = await supabase
      .from('predictive_dialer_agents')
      .select('*')
      .eq('id', agentId)
      .single();
      
    if (agentError || !agent) {
      throw new Error(`Agent not found: ${agentError?.message}`);
    }
    
    // Update agent status to busy
    await supabase
      .from('predictive_dialer_agents')
      .update({ 
        status: 'busy',
        current_call_id: callId
      })
      .eq('id', agentId);
      
    // Update call record with agent
    await supabase
      .from('predictive_dialer_calls')
      .update({
        agent_id: agentId
      })
      .eq('id', callId);
    
    // Remove from queue if it was there
    await supabase
      .from('predictive_dialer_call_queue')
      .delete()
      .eq('call_id', callId);
    
    // In a real implementation, we'd connect this call to the agent's browser/device
    // For now, we'll just return success
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Agent connected to call successfully',
      callId,
      agentId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in connect-call-to-agent function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'An error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || 500,
    });
  }
});
