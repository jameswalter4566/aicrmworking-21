
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
    const { id } = requestData;
    
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'List ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the calling list details
    const { data: list, error } = await supabaseClient
      .from('calling_lists')
      .select('id, name, created_at')
      .eq('id', id)
      .eq('created_by', user.id)
      .single();
    
    if (error || !list) {
      console.error('Error fetching calling list:', error);
      return new Response(
        JSON.stringify({ error: 'List not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the lead count
    const { count, error: countError } = await supabaseClient
      .from('calling_list_leads')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', id);
    
    if (countError) {
      console.error('Error counting leads:', countError);
    }
    
    const listWithCount = {
      id: list.id,
      name: list.name,
      createdAt: list.created_at,
      leadCount: count || 0
    };
    
    return new Response(
      JSON.stringify(listWithCount),
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
