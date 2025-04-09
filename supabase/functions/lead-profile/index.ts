
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
    // Check if it's a GET request
    if (req.method !== 'GET') {
      throw new Error('Method not allowed. Please use GET.');
    }

    // Extract lead ID from URL
    const url = new URL(req.url);
    const leadId = url.searchParams.get('id');

    if (!leadId) {
      throw new Error('Lead ID is required');
    }

    console.log(`Fetching lead with ID: ${leadId}`);

    // Query the leads table for a specific lead
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error) {
      console.error('Error fetching lead:', error.message);
      throw new Error(`Failed to fetch lead: ${error.message}`);
    }

    if (!lead) {
      console.log('No lead found with the provided ID');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Lead not found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Format lead data to match the expected structure
    const formattedLead = {
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
    };

    console.log(`Successfully retrieved lead: ${formattedLead.firstName} ${formattedLead.lastName}`);

    // Return the lead data
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: formattedLead,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in lead-profile function: ${error.message}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
