
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
    
    // Get calling lists created by the current user
    const { data: lists, error } = await supabaseClient
      .from('calling_lists')
      .select('id, name, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    
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
        const { count, error: countError } = await supabaseClient
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
