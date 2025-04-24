
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
    console.log('Retrieve-leads function called - Path:', req.url);
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    // Extract JWT token from Authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    let isAuthenticated = false;
    
    // Try to authenticate with the token if it exists
    if (authHeader) {
      try {
        // Extract token from Bearer token format
        const token = authHeader.replace('Bearer ', '');
        console.log('Token found in Authorization header');
        
        // Verify the token and get user information
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError) {
          console.error('Auth error:', authError.message);
          console.log('Will proceed with anonymous access');
        } else if (user) {
          userId = user.id;
          isAuthenticated = true;
          console.log(`Request authenticated from user: ${userId}`);
        }
      } catch (tokenError) {
        console.error('Token parsing error:', tokenError);
        console.log('Will proceed with anonymous access');
      }
    } else {
      console.log('No Authorization header present, proceeding with anonymous access');
    }
    
    // Extract request body parameters
    let requestBody = { source: 'all', industryFilter: null, leadId: null, exactMatch: false };
    try {
      if (req.headers.get('content-type')?.includes('application/json')) {
        const body = await req.json().catch(() => ({}));
        requestBody = { ...requestBody, ...body };
        console.log('Request body:', JSON.stringify(requestBody));
      }
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      // Continue with default values
    }
    
    console.log(`Retrieving leads with parameters:`, requestBody);
    
    // SECURITY CHECK: If not authenticated, return an empty array
    if (!isAuthenticated) {
      console.log('User is not authenticated. Returning empty array for security.');
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: [],
          metadata: {
            userId: 'anonymous',
            isAuthenticated: false,
            totalLeadCount: 0,
            userLeadCount: 0,
            source: requestBody.source,
            industryFilter: requestBody.industryFilter,
            leadId: requestBody.leadId,
            retrievedCount: 0
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Get user-specific count
    let userLeadCount = 0;
    if (userId) {
      const { count, error: userCountError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId);
        
      if (userCountError) {
        console.error('Error counting user leads:', userCountError.message);
      } else {
        userLeadCount = count || 0;
        console.log(`Leads created by user ${userId}: ${userLeadCount}`);
      }
    }
    
    // Fetch leads based on parameters and authentication status
    let leads = [];
    
    // If specific leadId is provided, prioritize that - but still ensure it belongs to the authenticated user
    if (requestBody.leadId) {
      console.log(`Fetching specific lead ID: ${requestBody.leadId}`);
      leads = await fetchLeadById(requestBody.leadId, userId);
      
      if (leads.length === 0) {
        console.log(`Lead ID ${requestBody.leadId} not found for this user, returning empty array`);
      } else {
        console.log(`Found lead with ID: ${requestBody.leadId} belonging to user: ${userId}`);
      }
    } else {
      // CRITICAL SECURITY FIX: Always fetch only the authenticated user's leads
      // The previous issue was here - we were fetching all leads when a user had none
      leads = await fetchLeadsFromSupabase(userId, requestBody.source, requestBody.industryFilter);
    }
    
    console.log(`Successfully retrieved ${leads.length} leads for user: ${userId}`);
    
    // Return the response
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: leads,
        metadata: {
          userId: userId || 'anonymous',
          isAuthenticated,
          totalLeadCount: userLeadCount, // Only count the user's own leads
          userLeadCount: userLeadCount,
          source: requestBody.source,
          industryFilter: requestBody.industryFilter,
          leadId: requestBody.leadId,
          retrievedCount: leads.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in retrieve-leads function: ${error.message}`);
    console.error(`Stack trace: ${error.stack}`);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error.message.includes('Unauthorized')) statusCode = 401;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});

// Function to fetch a specific lead by ID - with security check for user ownership
async function fetchLeadById(leadId, userId) {
  try {
    console.log(`Starting fetchLeadById for ID: ${leadId} - Ensuring it belongs to user: ${userId}`);
    
    // Initialize query to the leads table WITH security check for user ownership
    let query = supabase.from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('created_by', userId); // CRITICAL: Only fetch leads created by this user
    
    console.log('Executing Supabase query for specific lead ID with ownership check...');
    const { data, error } = await query;
    
    if (error) {
      console.error(`Query error: ${error.code} - ${error.message}`, error);
      throw new Error(`Failed to fetch lead by ID from Supabase database: ${error.message}`);
    }
    
    // Log raw data for debugging
    console.log(`Raw query returned ${data?.length || 0} results for ID ${leadId} belonging to user ${userId}`);
    if (data && data.length > 0) {
      console.log(`Found lead with ID ${leadId} for user ${userId}:`, JSON.stringify(data[0].id, null, 2));
    } else {
      console.log(`No lead found with ID: ${leadId} for user: ${userId}`);
      // Return empty array if no lead found with this ID for this user
      return [];
    }
    
    // Transform the data to match the expected format
    const transformedLeads = (data || []).map(lead => ({
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
      createdBy: lead.created_by,
      isMortgageLead: lead.is_mortgage_lead || false,
      addedToPipelineAt: lead.added_to_pipeline_at,
      mortgageData: lead.mortgage_data
    }));
    
    console.log(`Transformed ${transformedLeads.length} leads for ID ${leadId} belonging to user ${userId}`);
    if (transformedLeads.length > 0) {
      console.log(`Lead ${leadId} name: ${transformedLeads[0].firstName} ${transformedLeads[0].lastName}`);
    }
    
    return transformedLeads;
  } catch (error) {
    console.error(`Error fetching lead by ID (${leadId}) from Supabase database: ${error.message}`);
    console.error(`Stack trace: ${error.stack}`);
    throw error;
  }
}

// Function to fetch leads from Supabase with user filtering - ALWAYS filtered by user ID
async function fetchLeadsFromSupabase(userId, source = 'all', industryFilter = null) {
  try {
    console.log(`Starting fetchLeadsFromSupabase - userId: ${userId || 'anonymous'}, source: ${source}, industryFilter: ${industryFilter || 'none'}`);
    
    // SECURITY CRITICAL: If no userId is provided, return empty array
    if (!userId) {
      console.log('No userId provided, returning empty array for security');
      return [];
    }
    
    // Initialize query to the leads table
    let query = supabase.from('leads').select('*');
    
    // Add ordering
    query = query.order('created_at', { ascending: false });
    
    // Apply source filtering if needed
    if (source !== 'all') {
      console.log(`Filtering by source: ${source}`);
      // Implement source filtering logic if needed
    }
    
    // Apply industry filtering if specified
    if (industryFilter === 'mortgage') {
      console.log('Filtering for mortgage leads');
      query = query.eq('is_mortgage_lead', true);
    }
    
    // CRITICAL SECURITY FIX: ALWAYS filter by user ID
    console.log(`Filtering leads for user: ${userId}`);
    query = query.eq('created_by', userId);
    
    console.log('Executing Supabase query with proper security filters...');
    const { data, error } = await query;
    
    if (error) {
      console.error(`Query error: ${error.code} - ${error.message}`, error);
      throw new Error(`Failed to fetch leads from Supabase database: ${error.message}`);
    }
    
    // Log raw data for debugging
    console.log(`Raw query returned ${data?.length || 0} results`);
    if (data && data.length > 0) {
      console.log('First lead sample:', JSON.stringify(data[0].id, null, 2));
    } else {
      console.log('No leads found in query result - this is expected for new users');
    }
    
    // Transform the data to match the expected format
    const transformedLeads = (data || []).map(lead => ({
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
      createdBy: lead.created_by,
      isMortgageLead: lead.is_mortgage_lead || false,
      addedToPipelineAt: lead.added_to_pipeline_at,
      mortgageData: lead.mortgage_data
    }));
    
    console.log(`Transformed ${transformedLeads.length} leads for user ${userId}`);
    
    return transformedLeads;
  } catch (error) {
    console.error(`Error fetching leads from Supabase database: ${error.message}`);
    console.error(`Stack trace: ${error.stack}`);
    throw error;
  }
}

// REMOVED the fetchAllLeads function entirely as it was the source of the security issue
