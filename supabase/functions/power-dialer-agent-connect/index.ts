
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
    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { agentId, userId, status } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If we're registering a new agent
    if (!agentId && status === 'register') {
      // Get user info
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      if (userError) {
        return new Response(
          JSON.stringify({ error: 'Failed to find user profile', details: userError }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const name = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Agent';

      // Check if agent already exists
      const { data: existingAgent } = await supabase
        .from('power_dialer_agents')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingAgent) {
        // Update existing agent status
        const { data: updatedAgent, error: updateError } = await supabase
          .from('power_dialer_agents')
          .update({ 
            status: 'offline',
            last_status_change: new Date().toISOString()
          })
          .eq('id', existingAgent.id)
          .select()
          .single();

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to update agent', details: updateError }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        return new Response(
          JSON.stringify({ success: true, agent: updatedAgent }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        // Create new agent
        const { data: newAgent, error: createError } = await supabase
          .from('power_dialer_agents')
          .insert({ 
            user_id: userId,
            name: name,
            status: 'offline',
            last_status_change: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          return new Response(
            JSON.stringify({ error: 'Failed to create agent', details: createError }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        return new Response(
          JSON.stringify({ success: true, agent: newAgent }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } 
    // Update agent status
    else if (agentId && status) {
      const statusMap: Record<string, string> = {
        'online': 'available',
        'offline': 'offline',
        'busy': 'busy'
      };

      const agentStatus = statusMap[status] || 'offline';

      const { data: updatedAgent, error: updateError } = await supabase
        .from('power_dialer_agents')
        .update({ 
          status: agentStatus,
          last_status_change: new Date().toISOString(),
          current_call_id: agentStatus === 'offline' ? null : undefined
        })
        .eq('id', agentId)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update agent status', details: updateError }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, agent: updatedAgent }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error("Error in power-dialer-agent-connect:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
