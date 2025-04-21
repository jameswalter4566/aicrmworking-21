
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
    // Extract lead ID from request body
    const { id } = await req.json();

    if (!id) {
      throw new Error('Lead ID is required');
    }

    console.log(`Fetching lead with ID: ${id}`);

    // Query the leads table for a specific lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (leadError) {
      console.error('Error fetching lead:', leadError.message);
      throw new Error(`Failed to fetch lead: ${leadError.message}`);
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

    // Fetch notes for this lead
    const { data: notes, error: notesError } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('Error fetching notes:', notesError.message);
      throw new Error(`Failed to fetch notes: ${notesError.message}`);
    }

    // Fetch activities for this lead
    const { data: activities, error: activitiesError } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', id)
      .order('timestamp', { ascending: false });

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError.message);
      throw new Error(`Failed to fetch activities: ${activitiesError.message}`);
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
      createdBy: lead.created_by,
      mortgageData: lead.mortgage_data,
      isMortgageLead: lead.is_mortgage_lead,
      addedToPipelineAt: lead.added_to_pipeline_at
    };

    console.log(`Successfully retrieved lead: ${formattedLead.firstName} ${formattedLead.lastName}`);

    // Return the lead data along with notes and activities
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          lead: formattedLead,
          notes: notes || [],
          activities: activities || []
        },
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
