
// Follow the REST architecture for edge functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Validate disposition value
const validateDisposition = (disposition: string): string => {
  const validDispositions = [
    'Not Contacted',
    'Contacted',
    'Appointment Set',
    'Submitted',
    'Dead',
    'DNC'
  ];
  
  return validDispositions.includes(disposition) ? 
    disposition : 'Not Contacted';
};

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Log detailed request information for debugging
    console.log('Store-leads function called - Path:', req.url);
    console.log('Request method:', req.method);
    const authHeaderExists = !!req.headers.get('Authorization');
    console.log('Auth header present:', authHeaderExists);
    
    // Extract JWT token from Authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    let isAuthenticated = false;
    
    // Check if user is authenticated
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication required. Please sign in to store leads.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }
    
    // Authenticate with the token
    try {
      // Extract token from Bearer token format
      const token = authHeader.replace('Bearer ', '');
      console.log('Token extracted from header');
      
      // Verify the token and get user information
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError) {
        console.error('Auth error:', authError.message);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Authentication failed: ' + authError.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          }
        );
      }
      
      if (!user) {
        console.error('No user found in the token');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Authentication failed: Invalid user token'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          }
        );
      }
      
      userId = user.id;
      isAuthenticated = true;
      console.log(`Request authenticated from user: ${userId}`);
    } catch (tokenError) {
      console.error('Token parsing error:', tokenError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication failed: ' + tokenError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }
    
    // Parse the request body
    let body;
    try {
      body = await req.json();
      console.log('Request body parsed successfully');
    } catch (parseError) {
      console.error('Error parsing JSON body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    const { leads, leadType } = body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      console.error('No valid leads data provided');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No valid leads data provided'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    console.log(`Storing ${leads.length} leads with type: ${leadType || 'default'} for user: ${userId}`);
    console.log('Sample lead data:', JSON.stringify(leads[0], null, 2));
    
    // Store leads directly in Supabase database, ensuring they're associated with the authenticated user
    const result = await storeLeadsInSupabase(leads, userId);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully stored ${leads.length} leads`, 
        data: result,
        userId: userId,
        isAuthenticated: isAuthenticated
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in store-leads function: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error.message === 'No valid leads data provided') statusCode = 400;
    
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

// Function to store leads in Supabase
async function storeLeadsInSupabase(leads, userId) {
  try {
    // Process the leads to ensure they have the correct format for our database
    const processedLeads = leads.map(lead => {
      // Validate and normalize disposition
      const disposition = lead.disposition ? 
        validateDisposition(lead.disposition) : 'Not Contacted';

      return {
        id: lead.id || crypto.randomUUID(), // Use provided ID or generate a UUID
        first_name: lead.firstName || '',
        last_name: lead.lastName || '',
        email: lead.email || '',
        phone1: lead.phone1 || '',
        phone2: lead.phone2 || '',
        disposition: disposition,
        avatar: lead.avatar || '',
        mailing_address: lead.mailingAddress || '',
        property_address: lead.propertyAddress || '',
        tags: lead.tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Always associate leads with the authenticated user
        created_by: userId
      };
    });
    
    console.log('Processed leads for database storage');
    console.log('First processed lead:', JSON.stringify(processedLeads[0], null, 2));
    console.log(`Using authenticated user ID: ${userId} for created_by field`);
    
    // Insert leads into the leads table in Supabase database
    const { data, error } = await supabase
      .from('leads')
      .upsert(processedLeads, { 
        onConflict: 'id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('Database error when storing leads:', error.message);
      throw new Error(`Failed to store leads in Supabase database: ${error.message}`);
    }
    
    console.log(`Successfully stored ${processedLeads.length} leads in Supabase database for user: ${userId}`);
    
    return data || processedLeads;
  } catch (error) {
    console.error(`Error storing leads in Supabase database: ${error.message}`);
    throw error;
  }
}
