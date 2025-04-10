
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client with service role key to bypass RLS
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request headers
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized: Invalid user token');
    }
    
    // Parse request body
    const { pitchDeckId, limit, offset, search } = await req.json();
    
    let responseData;
    
    if (pitchDeckId) {
      // Get a specific pitch deck
      console.log(`Retrieving pitch deck ${pitchDeckId} for user ${user.id}`);
      
      const { data, error } = await supabase
        .from('pitch_decks')
        .select('*')
        .eq('id', pitchDeckId)
        .eq('created_by', user.id)
        .single();
        
      if (error) {
        console.error('Retrieve error details:', error);
        throw new Error(`Failed to retrieve pitch deck: ${error.message}`);
      }
      
      responseData = { success: true, data };
    } else {
      // List pitch decks with optional search and pagination
      console.log(`Listing pitch decks for user ${user.id}`);
      
      let query = supabase
        .from('pitch_decks')
        .select('*')
        .eq('created_by', user.id);
        
      // Add search if provided
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }
      
      // Add sorting
      query = query.order('created_at', { ascending: false });
      
      // Add pagination if provided
      if (limit !== undefined) {
        query = query.limit(limit);
      }
      
      if (offset !== undefined) {
        query = query.range(offset, offset + (limit || 10) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('List error details:', error);
        throw new Error(`Failed to list pitch decks: ${error.message}`);
      }
      
      responseData = { success: true, data };
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in retrieve-pitch-deck function: ${error.message}`);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
