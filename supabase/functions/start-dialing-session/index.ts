
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
      // First, get the leads table structure to check the ID type
      const { data: leadFields, error: fieldsError } = await supabaseClient
        .rpc('get_table_definition', { table_name: 'leads' });
      
      if (fieldsError) {
        console.warn('Could not determine leads table structure:', fieldsError);
      }
      
      console.log(`Working with leads - preparing to process ${listLeads.length} leads`);
      
      // Create the session leads, adapting to whatever ID format we have
      let processedLeads = 0;
      let validLeads = [];
      
      // Get actual lead data to convert to string uuid format if needed
      for (const item of listLeads) {
        try {
          // Get the actual lead record to store in session
          const { data: leadData, error: leadError } = await supabaseClient
            .from('leads')
            .select('id')
            .eq('id', item.lead_id)
            .maybeSingle();
          
          if (leadError) {
            console.error(`Error fetching lead ${item.lead_id}:`, leadError);
            continue;
          }
          
          if (!leadData) {
            console.error(`Lead ${item.lead_id} not found`);
            continue;
          }
          
          // Create session lead entry - converting number ID to string if necessary
          validLeads.push({
            session_id: sessionData.id,
            lead_id: String(item.lead_id),
            status: 'queued'
          });
          
          processedLeads++;
        } catch (e) {
          console.error(`Error processing lead ID ${item.lead_id}:`, e);
        }
      }
      
      if (validLeads.length === 0) {
        console.error('No valid leads could be processed to add to session');
        return new Response(
          JSON.stringify({ 
            error: 'No valid leads to add to session', 
            message: 'Could not process any lead IDs in a compatible format'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Insert in smaller batches if needed to avoid potential issues
      const BATCH_SIZE = 50;
      let insertedCount = 0;
      
      for (let i = 0; i < validLeads.length; i += BATCH_SIZE) {
        const batch = validLeads.slice(i, i + BATCH_SIZE);
        const { error: insertError, count } = await supabaseClient
          .from('dialing_session_leads')
          .insert(batch)
          .select('count');
        
        if (insertError) {
          console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
        } else {
          insertedCount += batch.length;
          console.log(`Inserted batch ${i / BATCH_SIZE + 1} with ${batch.length} leads`);
        }
      }
      
      console.log(`Successfully added ${insertedCount} leads to dialing session ${sessionData.id}`);
      
      return new Response(
        JSON.stringify({ 
          sessionId: sessionData.id, 
          totalLeads: insertedCount,
          message: "Dialing session created successfully" 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error processing leads for session:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Error processing leads',
          details: error instanceof Error ? error.message : String(error)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
