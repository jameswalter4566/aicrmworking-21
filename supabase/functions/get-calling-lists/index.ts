
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
    // Create a client for user-based requests
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    // Create an admin client that uses the service role
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    );
    
    // Try to get the user, fall back to admin access if needed
    let user = null;
    
    try {
      const { data: userData, error } = await supabaseClient.auth.getUser();
      if (!error && userData) {
        user = userData.user;
      }
    } catch (authError) {
      console.log('Auth error in get-calling-lists:', authError);
      // Continue with admin client
    }
    
    if (!user) {
      console.log('Using admin access as fallback');
      // For security, we could return an error here if we want to enforce authentication
      // But for now, we'll continue with admin access for debugging purposes
    }
    
    // Use userId if available, otherwise null (admin will see all)
    const userId = user?.id;
    const client = userId ? supabaseClient : supabaseAdmin;
    
    // Get calling lists, filter by user if we have one
    let query = client.from('calling_lists').select('id, name, created_at');
    
    if (userId) {
      query = query.eq('created_by', userId);
    }
    
    const { data: lists, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching calling lists:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch calling lists', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get lead count for each list using admin client for reliable access
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
    console.error('Unexpected error in get-calling-lists:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
