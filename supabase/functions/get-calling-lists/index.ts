
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
    // Create a Supabase client with the admin role for direct database access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Create a regular client to get the user when possible
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
      }
    );
    
    // Try to get the user, but continue even if not authenticated
    let userId = null;
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        userId = user.id;
        console.log("User authenticated:", userId);
      }
    } catch (authError) {
      console.log("Could not authenticate user, proceeding with admin access:", authError.message);
    }
    
    // If we have a userId, filter by it. Otherwise, return a limited set of lists
    const query = supabaseAdmin
      .from('calling_lists')
      .select('id, name, created_at');
    
    if (userId) {
      query.eq('created_by', userId);
    }
    
    const { data: lists, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching calling lists:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch calling lists' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get lead count for each list
    const listsWithCounts = await Promise.all(
      lists.map(async (list) => {
        const { count, error: countError } = await supabaseAdmin
          .from('calling_list_leads')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list.id);
        
        return {
          id: list.id,
          name: list.name,
          createdAt: list.created_at,
          leadCount: count || 0
        };
      })
    );
    
    return new Response(
      JSON.stringify(listsWithCounts),
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
