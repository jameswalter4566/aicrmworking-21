
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
    
    // Add leads to dialing session
    const sessionLeads = listLeads.map(lead => ({
      session_id: sessionData.id,
      lead_id: lead.lead_id,
      status: 'queued'
    }));
    
    const { error: sessionLeadsError } = await supabaseClient
      .from('dialing_session_leads')
      .insert(sessionLeads);
    
    if (sessionLeadsError) {
      console.error('Error adding leads to session:', sessionLeadsError);
      return new Response(
        JSON.stringify({ error: 'Failed to add leads to dialing session', details: sessionLeadsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Added ${sessionLeads.length} leads to dialing session ${sessionData.id}`);
    
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
