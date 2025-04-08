
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
    // Extract JWT token from Authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      // Extract token from Bearer token format
      const token = authHeader.replace('Bearer ', '');
      
      // Verify the token and get user information
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError) {
        console.error('Auth error:', authError.message);
        throw new Error('Unauthorized: Invalid authentication token');
      } else if (user) {
        userId = user.id;
        console.log(`Request authenticated from user: ${userId}`);
      } else {
        throw new Error('Unauthorized: User not found');
      }
    } else {
      console.log('No Authorization header present');
      throw new Error('Unauthorized: Authentication required');
    }
    
    const { source } = await req.json() || { source: 'all' };
    console.log(`Retrieving leads from source: ${source || 'all'} for user: ${userId}`);
    
    // Fetch leads from Supabase database directly, filtered by user
    const leads = await fetchLeadsFromSupabase(userId);
    
    console.log(`Successfully retrieved ${leads.length} leads for user: ${userId}`);
    
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
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error.message.includes('Unauthorized')) statusCode = 401;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});

// Function to fetch leads from Supabase
async function fetchLeadsFromSupabase(userId) {
  try {
    if (!userId) {
      throw new Error('User ID is required to fetch leads');
    }
    
    // Query the leads table in Supabase, filtering by created_by
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('created_by', userId)  // Only fetch leads created by this user
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch leads from Supabase database: ${error.message}`);
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
      updatedAt: lead.updated_at,
      createdBy: lead.created_by
    }));
    
    console.log(`Retrieved ${transformedLeads.length} leads from Supabase database for user: ${userId}`);
    
    return transformedLeads;
  } catch (error) {
    console.error(`Error fetching leads from Supabase database: ${error.message}`);
    throw error;
  }
}
