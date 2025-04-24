
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Extract the lead_id from the request body
    const { lead_string_id } = await req.json();
    
    if (!lead_string_id) {
      throw new Error('Lead ID is required');
    }

    console.log(`Searching for lead with string ID: ${lead_string_id}`);
    
    // Execute a raw SQL query to find the lead regardless of the ID type
    const { data: lead, error } = await supabase.rpc('find_lead_by_string_id', {
      lead_string_id
    });
    
    if (error) {
      console.error(`Error finding lead: ${error.message}`);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!lead || lead.length === 0) {
      console.log(`No lead found with ID: ${lead_string_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    console.log(`Found lead with ID: ${lead_string_id}`);
    
    // Return the lead data
    return new Response(
      JSON.stringify({
        success: true,
        data: lead
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in find-lead-by-string-id function: ${error.message}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
