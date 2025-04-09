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
    let isAuthenticated = false;
    
    // Try to authenticate with the token if it exists
    if (authHeader) {
      try {
        // Extract token from Bearer token format
        const token = authHeader.replace('Bearer ', '');
        
        // Verify the token and get user information
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError) {
          console.error('Auth error:', authError.message);
          // Continue with anonymous access
        } else if (user) {
          userId = user.id;
          isAuthenticated = true;
          console.log(`Request authenticated from user: ${userId}`);
        }
      } catch (tokenError) {
        console.error('Token parsing error:', tokenError);
        // Continue with anonymous access
      }
    } else {
      console.log('No Authorization header present, proceeding with anonymous access');
    }
    
    // Extract query parameters from request
    const { source } = await req.json().catch(() => ({ source: 'all' })) || { source: 'all' };
    console.log(`Retrieving leads from source: ${source || 'all'}`);
    
    // Fetch leads from Supabase database
    const leads = await fetchLeadsFromSupabase(userId);
    
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
    // Initialize query to the leads table
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
    
    // If user is authenticated, filter by their user ID
    // Otherwise, return all leads, even those with null created_by
    if (userId) {
      query = query.eq('created_by', userId);
      console.log(`Filtering leads for user: ${userId}`);
    } else {
      console.log('Retrieving all leads (no user filtering)');
    }
    
    const { data, error } = await query;
    
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
    
    console.log(`Retrieved ${transformedLeads.length} leads from Supabase database`);
    
    return transformedLeads;
  } catch (error) {
    console.error(`Error fetching leads from Supabase database: ${error.message}`);
    throw error;
  }
}
