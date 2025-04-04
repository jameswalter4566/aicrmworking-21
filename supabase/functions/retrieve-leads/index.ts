
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

// Get thoughtly API credentials from env
const thoughtlyApiToken = Deno.env.get('THOUGHTLY_API_TOKEN') || '';
const thoughtlyTeamId = Deno.env.get('THOUGHTLY_TEAM_ID') || '';

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { source } = await req.json();
    console.log(`Retrieving leads from source: ${source || 'all'}`);
    
    let leads = [];
    
    // Fetch leads based on the requested source
    if (!source || source === 'all' || source === 'thoughtly') {
      const thoughtlyLeads = await fetchThoughtlyLeads();
      leads = [...leads, ...thoughtlyLeads];
    }
    
    // In the future, you can add more sources here:
    // if (!source || source === 'all' || source === 'crm') {
    //   const crmLeads = await fetchCRMLeads();
    //   leads = [...leads, ...crmLeads];
    // }
    
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

// Function to fetch leads from Thoughtly
async function fetchThoughtlyLeads() {
  if (!thoughtlyApiToken || !thoughtlyTeamId) {
    console.warn('Thoughtly API credentials not found in environment variables');
    return [];
  }
  
  try {
    const url = `https://api.thoughtly.ai/v1/teams/${thoughtlyTeamId}/contacts`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${thoughtlyApiToken}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch from Thoughtly: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Retrieved ${data.data?.length || 0} leads from Thoughtly`);
    
    return data.data || [];
  } catch (error) {
    console.error(`Error fetching from Thoughtly API: ${error.message}`);
    return [];
  }
}
