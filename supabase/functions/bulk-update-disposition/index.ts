
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Validate disposition value
const VALID_DISPOSITIONS = [
  'Not Contacted',
  'Contacted',
  'Appointment Set',
  'Submitted',
  'Dead',
  'DNC'
];

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract data from request body
    const { leadIds, disposition } = await req.json();

    // Validate input data
    if (!leadIds || !Array.isArray(leadIds)) {
      throw new Error('Lead IDs must be provided as an array');
    }

    if (!disposition) {
      throw new Error('Disposition is required');
    }

    if (!VALID_DISPOSITIONS.includes(disposition)) {
      throw new Error(`Invalid disposition value. Valid options are: ${VALID_DISPOSITIONS.join(', ')}`);
    }

    // Enforce the 50 leads limit
    if (leadIds.length > 50) {
      throw new Error('Maximum of 50 leads can be updated at once');
    }

    console.log(`Bulk updating ${leadIds.length} leads to disposition: ${disposition}`);
    
    // Prepare update data
    const updateData = {
      disposition: disposition,
      updated_at: new Date().toISOString(),
    };

    // Update all leads in a single query
    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .in('id', leadIds)
      .select('id, disposition');

    if (error) {
      console.error('Error updating leads:', error.message);
      throw new Error(`Failed to update leads: ${error.message}`);
    }

    console.log(`Successfully updated ${data.length} leads`);

    // Record activity entries for each lead
    const activities = leadIds.map(leadId => ({
      lead_id: leadId,
      type: 'Disposition Change',
      description: `Disposition changed to ${disposition} (bulk update)`,
      timestamp: new Date().toISOString()
    }));

    if (activities.length > 0) {
      const { error: activityError } = await supabase
        .from('lead_activities')
        .insert(activities);

      if (activityError) {
        console.error('Error recording disposition change activities:', activityError.message);
        // We'll continue even if activity logging fails
      }
    }

    // Return the updated leads
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        message: `Successfully updated ${data.length} leads`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in bulk-update-disposition function: ${error.message}`);
    
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
