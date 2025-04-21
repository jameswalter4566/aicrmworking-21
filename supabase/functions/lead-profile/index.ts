
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
  console.log("lead-profile function called with method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Responding to OPTIONS request with CORS headers");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract lead ID from request body
    const { id } = await req.json();

    console.log(`Received request for lead ID: ${id} (${typeof id})`);

    if (!id) {
      console.error("No lead ID provided in request body");
      throw new Error('Lead ID is required');
    }

    console.log(`Fetching lead with ID: ${id}`);

    // Determine if the ID is numeric or string and handle differently
    let query = supabase.from('leads').select('*');
    
    // If id is numeric or can be converted to a number
    if (!isNaN(Number(id))) {
      query = query.eq('id', Number(id));
    } else {
      // If id is likely a string (could be a UUID)
      query = query.eq('id', id);
    }

    // Using maybeSingle() instead of single() to handle the case when no row is found
    const { data: lead, error: leadError } = await query.maybeSingle();

    if (leadError) {
      console.error('Error fetching lead:', leadError.message);
      throw new Error(`Failed to fetch lead: ${leadError.message}`);
    }

    if (!lead) {
      console.log('No lead found with the provided ID');
      
      // Add additional debug information to help troubleshoot
      console.log(`ID value: "${id}", Type: ${typeof id}`);
      
      // Check if a lead exists in the database at all (for debugging)
      const { data: anyLeads, error: countError } = await supabase
        .from('leads')
        .select('id')
        .limit(1);
        
      if (!countError && anyLeads) {
        console.log(`Database has leads. Sample ID: ${anyLeads[0]?.id}`);
      } else if (countError) {
        console.error('Error checking for any leads:', countError.message);
      } else {
        console.log('No leads found in database at all');
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Lead not found',
          debug: {
            idProvided: id,
            idType: typeof id,
            wasNumeric: !isNaN(Number(id))
          }
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
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('Error fetching notes:', notesError.message);
      throw new Error(`Failed to fetch notes: ${notesError.message}`);
    }

    // Fetch activities for this lead
    const { data: activities, error: activitiesError } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', lead.id)
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
