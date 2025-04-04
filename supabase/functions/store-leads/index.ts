
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
    const { leads, leadType } = await req.json();
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      throw new Error('No valid leads data provided');
    }
    
    console.log(`Storing ${leads.length} leads with type: ${leadType || 'default'}`);
    
    // Store leads in Thoughtly (our current storage system)
    const result = await storeLeadsInThoughtly(leads);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully stored ${leads.length} leads`, 
        data: result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in store-leads function: ${error.message}`);
    
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

// Function to store leads in Thoughtly
async function storeLeadsInThoughtly(leads) {
  if (!thoughtlyApiToken || !thoughtlyTeamId) {
    throw new Error('Thoughtly API credentials not found in environment variables');
  }
  
  try {
    // Process the leads to ensure they have the correct format for Thoughtly
    const processedLeads = leads.map(lead => ({
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || '',
      phone_number: lead.phone1 || '', // Map to Thoughtly's phone_number field
      tags: lead.tags || [],
      attributes: {
        id: lead.id || Date.now(),
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        phone2: lead.phone2 || '',
        disposition: lead.disposition || 'Not Contacted',
        avatar: lead.avatar || '',
      },
      country_code: lead.countryCode || 'US'
    }));
    
    const url = `https://api.thoughtly.ai/v1/teams/${thoughtlyTeamId}/contacts/bulk`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${thoughtlyApiToken}`
      },
      body: JSON.stringify(processedLeads)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to store leads in Thoughtly: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully stored ${processedLeads.length} leads in Thoughtly`);
    
    return data;
  } catch (error) {
    console.error(`Error storing leads in Thoughtly API: ${error.message}`);
    throw error;
  }
}
