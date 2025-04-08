
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
      } else if (user) {
        userId = user.id;
        console.log(`Request authenticated from user: ${userId}`);
      }
    } else {
      console.log('No Authorization header present, proceeding as anonymous upload');
    }
    
    // Log detailed request information for debugging
    console.log('Request path:', req.url);
    console.log('Request method:', req.method);
    
    // Log all headers for debugging
    console.log('All request headers:', 
      Object.fromEntries([...req.headers.entries()].map(([k, v]) => 
        [k, k.toLowerCase() === 'authorization' ? 'Bearer [REDACTED]' : v]
      ))
    );
    
    const { leads, leadType } = await req.json();
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      throw new Error('No valid leads data provided');
    }
    
    console.log(`Storing ${leads.length} leads with type: ${leadType || 'default'} for user: ${userId || 'anonymous'}`);
    
    // Store leads directly in Supabase database
    const result = await storeLeadsInSupabase(leads, userId);
    
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
    console.error(`Error stack: ${error.stack}`);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error.message === 'No valid leads data provided') statusCode = 400;
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

// Function to store leads in Supabase
async function storeLeadsInSupabase(leads, userId) {
  try {
    // Process the leads to ensure they have the correct format for our database
    const processedLeads = leads.map(lead => ({
      id: lead.id || Date.now(),
      first_name: lead.firstName || '',
      last_name: lead.lastName || '',
      email: lead.email || '',
      phone1: lead.phone1 || '',
      phone2: lead.phone2 || '',
      disposition: lead.disposition || 'Not Contacted',
      avatar: lead.avatar || '',
      mailing_address: lead.mailingAddress || '',
      property_address: lead.propertyAddress || '',
      tags: lead.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Track which user created this lead
      created_by: userId || null
    }));
    
    // Insert leads into the leads table in Supabase database
    const { data, error } = await supabase
      .from('leads')
      .upsert(processedLeads, { 
        onConflict: 'id',
        ignoreDuplicates: false
      });
    
    if (error) {
      throw new Error(`Failed to store leads in Supabase database: ${error.message}`);
    }
    
    console.log(`Successfully stored ${processedLeads.length} leads in Supabase database for user: ${userId || 'anonymous'}`);
    
    return data || processedLeads;
  } catch (error) {
    console.error(`Error storing leads in Supabase database: ${error.message}`);
    throw error;
  }
}
