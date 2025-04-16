
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const requestData = await req.json();
    const { listId, leadIds } = requestData;
    
    if (!listId || !leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'List ID and at least one lead ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify user has access to this list
    const { data: listAccess, error: accessError } = await supabaseClient
      .from('calling_lists')
      .select('id')
      .eq('id', listId)
      .eq('created_by', user.id)
      .maybeSingle();
    
    if (accessError || !listAccess) {
      return new Response(
        JSON.stringify({ error: 'List not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check which leads are already in the list to avoid duplicates
    const { data: existingLeads, error: existingError } = await supabaseClient
      .from('calling_list_leads')
      .select('lead_id')
      .eq('list_id', listId)
      .in('lead_id', leadIds);
    
    if (existingError) {
      console.error('Error checking existing leads:', existingError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing leads' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const existingLeadIds = existingLeads?.map(item => item.lead_id) || [];
    const newLeadIds = leadIds.filter(id => !existingLeadIds.includes(id));
    
    if (newLeadIds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All selected leads are already in the list' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Add new leads to the list
    const leadsToInsert = newLeadIds.map(leadId => ({
      list_id: listId,
      lead_id: leadId,
      added_by: user.id,
    }));
    
    const { error: insertError } = await supabaseClient
      .from('calling_list_leads')
      .insert(leadsToInsert);
    
    if (insertError) {
      console.error('Error adding leads to calling list:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to add leads to list' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Added ${newLeadIds.length} leads to list`,
        addedCount: newLeadIds.length,
        skippedCount: existingLeadIds.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
