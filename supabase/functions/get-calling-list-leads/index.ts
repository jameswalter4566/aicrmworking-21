
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
    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a client with the Authorization header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const requestData = await req.json();
    const { listId, page = 0, pageSize = 10 } = requestData;
    
    if (!listId) {
      return new Response(
        JSON.stringify({ error: 'List ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify the user has access to the list
    const { data: listAccess, error: listAccessError } = await supabaseClient
      .from('calling_lists')
      .select('id')
      .eq('id', listId)
      .eq('created_by', user.id)
      .maybeSingle();
    
    if (listAccessError) {
      console.error('Error checking list access:', listAccessError);
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
    
    // Get all leads in the list
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    // First get the list lead entries
    const { data: listLeads, error: listLeadsError, count } = await supabaseClient
      .from('calling_list_leads')
      .select('lead_id', { count: 'exact' })
      .eq('list_id', listId)
      .range(from, to);
    
    if (listLeadsError) {
      console.error('Error fetching list leads:', listLeadsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch list leads', details: listLeadsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!listLeads || listLeads.length === 0) {
      return new Response(
        JSON.stringify({ 
          leads: [],
          pagination: {
            page,
            pageSize,
            totalCount: 0,
            totalPages: 0
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Then get the actual lead data
    const leadIds = listLeads.map(item => item.lead_id);
    const { data: leads, error: leadsError } = await supabaseClient
      .from('leads')
      .select('*')
      .in('id', leadIds);
    
    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch leads', details: leadsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const totalPages = Math.ceil((count || 0) / pageSize);
    
    return new Response(
      JSON.stringify({
        leads: leads || [],
        pagination: {
          page,
          pageSize,
          totalCount: count || 0,
          totalPages
        }
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
