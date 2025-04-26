
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const requestData = await req.json();
    const { listId, sessionName } = requestData;
    
    if (!listId) {
      return new Response(
        JSON.stringify({ error: 'Calling List ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing request for listId: ${listId}, sessionName: ${sessionName}, userId: ${user.id}`);
    
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
      // Get all lead IDs that we need to process
      const leadIds = listLeads.map(item => item.lead_id);
      console.log(`Processing ${leadIds.length} leads to add to session`);
      
      // Get actual leads data to ensure we have valid records
      const { data: actualLeads, error: leadsQueryError } = await supabaseClient
        .from('leads')
        .select('*')  // Get full lead data
        .in('id', leadIds);
      
      if (leadsQueryError) {
        console.error('Error fetching lead details:', leadsQueryError);
        return new Response(
          JSON.stringify({ error: 'Failed to validate leads', details: leadsQueryError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!actualLeads || actualLeads.length === 0) {
        console.error('No valid leads found for the provided IDs');
        return new Response(
          JSON.stringify({ error: 'No valid leads found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Found ${actualLeads.length} valid leads to add to session`, actualLeads[0]);
      
      // Create UUIDs for lead_id values
      const sessionLeads = actualLeads.map(lead => {
        // Generate a random UUID for each lead entry
        const leadUuid = crypto.randomUUID();
        return {
          session_id: sessionData.id,
          lead_id: leadUuid,  // Use UUID format
          status: 'queued',
          priority: 1,
          attempt_count: 0,
          // Store the original lead ID as metadata in notes or other field
          notes: JSON.stringify({ 
            originalLeadId: lead.id,
            firstName: lead.first_name,
            lastName: lead.last_name,
            phone: lead.phone1,
            email: lead.email
          })
        };
      });
      
      console.log("First lead in batch to insert:", sessionLeads[0]);
      
      const BATCH_SIZE = 50;
      let insertedCount = 0;
      
      for (let i = 0; i < sessionLeads.length; i += BATCH_SIZE) {
        const batch = sessionLeads.slice(i, i + BATCH_SIZE);
        const { data: insertData, error: insertError } = await supabaseClient
          .from('dialing_session_leads')
          .insert(batch)
          .select();
        
        if (insertError) {
          console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
          console.error('Sample lead that failed:', batch[0]);
        } else {
          insertedCount += batch.length;
          console.log(`Inserted batch ${i / BATCH_SIZE + 1} with ${batch.length} leads with 'queued' status`);
          if (insertData) {
            console.log(`First lead in batch response: ${JSON.stringify(insertData[0])}`);
          }
        }
      }
      
      // Double-check that leads were actually inserted with queued status
      const { data: queuedLeads, error: queueCheckError } = await supabaseClient
        .from('dialing_session_leads')
        .select('id, status, lead_id, notes')
        .eq('session_id', sessionData.id)
        .eq('status', 'queued');
        
      if (queueCheckError) {
        console.error('Error checking queued leads:', queueCheckError);
      } else {
        console.log(`Verified ${queuedLeads?.length || 0} leads are in 'queued' status`);
        if (queuedLeads && queuedLeads.length > 0) {
          console.log('Sample queued lead:', queuedLeads[0]);
        }
      }
      
      // Update session with accurate count of actually inserted leads
      if (insertedCount > 0) {
        await supabaseClient
          .from('dialing_sessions')
          .update({ total_leads: insertedCount })
          .eq('id', sessionData.id);
      }
      
      // Force refresh the session_queue_stats view
      const { data: refreshStats, error: refreshError } = await supabaseClient
        .rpc('get_next_session_lead', { p_session_id: sessionData.id })
        .limit(0);
        
      if (refreshError) {
        console.log('Note: Stats refresh query returned error (this might be expected):', refreshError);
      }
      
      console.log(`Successfully added ${insertedCount} leads to dialing session ${sessionData.id}`);
      
      return new Response(
        JSON.stringify({ 
          sessionId: sessionData.id, 
          totalLeads: insertedCount,
          queuedLeads: queuedLeads?.length || 0,
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
