
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const requestData = await req.json();
    const { listId, sessionName } = requestData;
    
    if (!listId) {
      return new Response(
        JSON.stringify({ error: 'Calling List ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing request for listId: ${listId}, sessionName: ${sessionName}, userId: ${user.id}`);
    
    // Verify user has access to the calling list
    const { data: listAccess, error: listAccessError } = await supabaseClient
      .from('calling_lists')
      .select('id')
      .eq('id', listId)
      .eq('created_by', user.id)
      .maybeSingle();
    
    if (listAccessError) {
      console.error('List access error:', listAccessError);
      return new Response(
        JSON.stringify({ error: 'Error checking list access', details: listAccessError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!listAccess) {
      return new Response(
        JSON.stringify({ error: 'List not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get leads from the calling list
    const { data: listLeads, error: leadsError } = await supabaseClient
      .from('calling_list_leads')
      .select('lead_id')
      .eq('list_id', listId);
    
    if (leadsError) {
      console.error('Error fetching list leads:', leadsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch leads', details: leadsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!listLeads || listLeads.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No leads found in the list' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Found ${listLeads.length} leads for list ${listId}`);
    
    // Create dialing session with a proper name
    const finalSessionName = sessionName || `Dialing Session - ${new Date().toLocaleString()}`;
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('dialing_sessions')
      .insert({
        name: finalSessionName,
        created_by: user.id,
        calling_list_id: listId,
        status: 'active',
        total_leads: listLeads.length,
        attempted_leads: 0,
        completed_leads: 0,
        start_time: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (sessionError) {
      console.error('Error creating dialing session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create dialing session', details: sessionError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Created dialing session with ID: ${sessionData.id}`);
    
    try {
      // Add leads to dialing session - ensuring lead_id is properly handled as UUID
      const sessionLeads = listLeads.map(lead => {
        // Check if the lead_id is actually a UUID
        let leadIdAsUuid;
        try {
          // If it's already a valid UUID, use it as is
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead.lead_id)) {
            leadIdAsUuid = lead.lead_id;
          } else {
            // For non-UUID lead IDs, we need to use a different approach
            // We'll create a UUID based on the lead_id value
            // For now, we'll skip these leads and log an error
            console.error(`Lead ID ${lead.lead_id} is not a valid UUID and cannot be added to the session`);
            return null;
          }
        } catch (e) {
          console.error(`Error processing lead ID ${lead.lead_id}:`, e);
          return null;
        }
        
        if (!leadIdAsUuid) return null;
        
        return {
          session_id: sessionData.id,
          lead_id: leadIdAsUuid,
          status: 'queued'
        };
      }).filter(lead => lead !== null); // Remove any null entries
      
      if (sessionLeads.length === 0) {
        console.error('No valid lead UUIDs found to add to session');
        return new Response(
          JSON.stringify({ 
            error: 'No valid leads to add to session', 
            message: 'Lead IDs must be valid UUIDs'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { error: sessionLeadsError } = await supabaseClient
        .from('dialing_session_leads')
        .insert(sessionLeads);
      
      if (sessionLeadsError) {
        console.error('Error adding leads to session:', sessionLeadsError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to add leads to dialing session', 
            details: sessionLeadsError 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Added ${sessionLeads.length} leads to dialing session ${sessionData.id}`);
    } catch (error) {
      console.error('Error processing leads for session:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Error processing leads',
          details: error.message || String(error)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        sessionId: sessionData.id, 
        totalLeads: listLeads.length,
        message: "Dialing session created successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
