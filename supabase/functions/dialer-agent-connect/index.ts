
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
const twilioTwimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID') || '';
const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { action, agentId, callId, userId, name, status } = await req.json();
    
    switch(action) {
      case 'register':
        // Register a new agent or update existing agent
        if (!userId || !name) {
          throw new Error('User ID and name are required for registration');
        }
        
        // Check if agent already exists
        const { data: existingAgent, error: searchError } = await supabase
          .from('predictive_dialer_agents')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (searchError) {
          throw new Error(`Error searching for agent: ${searchError.message}`);
        }
        
        let agent;
        
        if (existingAgent) {
          // Update existing agent
          const { data: updatedAgent, error: updateError } = await supabase
            .from('predictive_dialer_agents')
            .update({
              name: name,
              last_status_change: new Date().toISOString()
            })
            .eq('id', existingAgent.id)
            .select()
            .single();
            
          if (updateError) {
            throw new Error(`Error updating agent: ${updateError.message}`);
          }
          
          agent = updatedAgent;
        } else {
          // Create new agent
          const { data: newAgent, error: insertError } = await supabase
            .from('predictive_dialer_agents')
            .insert({
              user_id: userId,
              name: name,
              status: 'offline',
              last_status_change: new Date().toISOString()
            })
            .select()
            .single();
            
          if (insertError) {
            throw new Error(`Error creating agent: ${insertError.message}`);
          }
          
          agent = newAgent;
        }
        
        return new Response(JSON.stringify({
          success: true,
          agent
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      case 'update-status':
        // Update agent status
        if (!agentId || !status) {
          throw new Error('Agent ID and status are required');
        }
        
        const { data: updatedAgent, error: statusError } = await supabase
          .from('predictive_dialer_agents')
          .update({
            status: status,
            last_status_change: new Date().toISOString()
          })
          .eq('id', agentId)
          .select()
          .single();
          
        if (statusError) {
          throw new Error(`Error updating agent status: ${statusError.message}`);
        }
        
        // If agent is now available, check for calls in queue
        if (status === 'available') {
          const { data: queuedCalls, error: queueError } = await supabase
            .from('predictive_dialer_call_queue')
            .select('*, call:call_id(*)')
            .is('assigned_to_agent_id', null)
            .order('priority', { ascending: false })
            .order('created_timestamp', { ascending: true })
            .limit(1);
            
          if (!queueError && queuedCalls && queuedCalls.length > 0) {
            const queuedCall = queuedCalls[0];
            
            // Assign the call to this agent
            await supabase
              .from('predictive_dialer_call_queue')
              .update({ assigned_to_agent_id: agentId })
              .eq('id', queuedCall.id);
              
            // Update agent status back to busy with this call
            await supabase
              .from('predictive_dialer_agents')
              .update({
                status: 'busy',
                current_call_id: queuedCall.call_id
              })
              .eq('id', agentId);
              
            // Update call record with agent
            await supabase
              .from('predictive_dialer_calls')
              .update({ agent_id: agentId })
              .eq('id', queuedCall.call_id);
              
            return new Response(JSON.stringify({
              success: true,
              agent: {
                ...updatedAgent,
                status: 'busy',
                current_call_id: queuedCall.call_id
              },
              assignedCall: queuedCall.call
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
        
        return new Response(JSON.stringify({
          success: true,
          agent: updatedAgent
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      case 'connect-call':
        // Connect an agent to a specific call
        if (!agentId || !callId) {
          throw new Error('Agent ID and call ID are required');
        }
        
        // Get the call details
        const { data: call, error: callError } = await supabase
          .from('predictive_dialer_calls')
          .select('*, contact:contact_id(*)')
          .eq('id', callId)
          .single();
          
        if (callError || !call) {
          throw new Error(`Call not found: ${callError?.message}`);
        }
        
        // Update agent status
        await supabase
          .from('predictive_dialer_agents')
          .update({
            status: 'busy',
            current_call_id: callId
          })
          .eq('id', agentId);
          
        // Update call with agent
        await supabase
          .from('predictive_dialer_calls')
          .update({ agent_id: agentId })
          .eq('id', callId);
          
        // If the call was in queue, update or remove it
        await supabase
          .from('predictive_dialer_call_queue')
          .update({ assigned_to_agent_id: agentId })
          .eq('call_id', callId);
          
        // Generate a Client token for a browser-based phone connection
        // This would need to be implemented with Twilio Client
        const capability = new twilio.jwt.ClientCapability({
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken
        });
        
        capability.addScope(
          new twilio.jwt.ClientCapability.OutgoingClientScope({
            applicationSid: twilioTwimlAppSid
          })
        );
        
        const token = capability.toJwt();
        
        return new Response(JSON.stringify({
          success: true,
          call,
          token
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in dialer-agent-connect function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || 500,
    });
  }
});
