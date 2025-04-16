
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
    const { listId } = requestData;
    
    if (!listId) {
      return new Response(
        JSON.stringify({ error: 'List ID is required' }),
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
    
    // Get the leads in this calling list
    const { data: listLeads, error: leadsError } = await supabaseClient
      .from('calling_list_leads')
      .select('lead_id')
      .eq('list_id', listId);
    
    if (leadsError) {
      console.error('Error fetching calling list leads:', leadsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch leads' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If there are no leads, return empty array
    if (!listLeads || listLeads.length === 0) {
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const leadIds = listLeads.map(item => item.lead_id);
    
    // Get the actual lead data
    const { data: leads, error: leadsDataError } = await supabaseClient
      .from('leads')
      .select('id, first_name, last_name, phone1, email')
      .in('id', leadIds);
    
    if (leadsDataError) {
      console.error('Error fetching lead details:', leadsDataError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch lead details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Transform the data to match the expected format
    const transformedLeads = leads.map(lead => ({
      id: lead.id,
      firstName: lead.first_name,
      lastName: lead.last_name,
      phone1: lead.phone1,
      email: lead.email
    }));
    
    return new Response(
      JSON.stringify(transformedLeads),
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
