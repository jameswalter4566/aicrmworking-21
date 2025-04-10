
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

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract data from request body
    const { leadId, leadData } = await req.json();

    if (!leadId) {
      throw new Error('Lead ID is required');
    }

    console.log(`Updating lead with ID: ${leadId}`);
    console.log('Update data:', JSON.stringify(leadData));

    // Check if disposition is being updated
    let oldDisposition = null;
    if (leadData.disposition) {
      // Fetch the current lead to get the old disposition value
      const { data: currentLead, error: fetchError } = await supabase
        .from('leads')
        .select('disposition')
        .eq('id', leadId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching current lead:', fetchError.message);
      } else if (currentLead) {
        oldDisposition = currentLead.disposition;
      }
    }

    // Transform the lead data from camelCase to snake_case for database
    const transformedData = {
      first_name: leadData.firstName,
      last_name: leadData.lastName,
      email: leadData.email,
      phone1: leadData.phone1,
      phone2: leadData.phone2,
      disposition: leadData.disposition,
      mailing_address: leadData.mailingAddress,
      property_address: leadData.propertyAddress,
      updated_at: new Date().toISOString(),
    };

    // Update the lead in the database
    const { data, error } = await supabase
      .from('leads')
      .update(transformedData)
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead:', error.message);
      throw new Error(`Failed to update lead: ${error.message}`);
    }

    console.log('Lead updated successfully:', data);

    // If disposition was changed, record it in the activity log
    if (oldDisposition && leadData.disposition && oldDisposition !== leadData.disposition) {
      const activityData = {
        lead_id: leadId,
        type: 'Disposition Change',
        description: `Disposition changed from ${oldDisposition} to ${leadData.disposition}`,
        timestamp: new Date().toISOString()
      };

      const { error: activityError } = await supabase
        .from('lead_activities')
        .insert(activityData);

      if (activityError) {
        console.error('Error recording disposition change activity:', activityError.message);
        // Don't throw error here, as the main update was successful
      }
    }

    // Transform the updated lead back to camelCase for the frontend
    const updatedLead = {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone1: data.phone1,
      phone2: data.phone2,
      disposition: data.disposition,
      avatar: data.avatar,
      mailingAddress: data.mailing_address,
      propertyAddress: data.property_address,
      tags: data.tags,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by
    };

    // Return the updated lead
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updatedLead,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in update-lead function: ${error.message}`);
    
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
