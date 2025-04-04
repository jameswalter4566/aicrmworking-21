
// Follow the REST architecture for edge functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase client
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
    const { source } = await req.json() || { source: 'all' };
    console.log(`Retrieving leads from source: ${source || 'all'}`);
    
    // Fetch leads from Supabase
    const leads = await fetchLeadsFromSupabase();
    
    console.log(`Successfully retrieved ${leads.length} leads`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: leads 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in retrieve-leads function: ${error.message}`);
    
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

// Function to fetch leads from Supabase
async function fetchLeadsFromSupabase() {
  try {
    // Query the leads table in Supabase
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch leads from Supabase: ${error.message}`);
    }
    
    // Transform the data to match the expected format
    const transformedLeads = data.map(lead => ({
      id: lead.id,
      firstName: lead.first_name,
      lastName: lead.last_name,
      email: lead.email,
      phone1: lead.phone1,
      phone2: lead.phone2,
      disposition: lead.disposition,
      avatar: lead.avatar,
      mailingAddress: lead.mailing_address,
      propertyAddress: lead.property_address,
      tags: lead.tags,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at
    }));
    
    console.log(`Retrieved ${transformedLeads.length} leads from Supabase`);
    
    return transformedLeads;
  } catch (error) {
    console.error(`Error fetching leads from Supabase: ${error.message}`);
    return [];
  }
}
