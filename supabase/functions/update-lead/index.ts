
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

    // Add handling for mortgage lead designation
    const isMortgageLead = leadData.isMortgageLead || false;
    const addedToPipelineAt = isMortgageLead ? new Date().toISOString() : null;

    // Transform the lead data from camelCase to snake_case for database
    const transformedData: any = {
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

    // Handle mortgage data if provided
    if (leadData.mortgageData) {
      // Ensure data consistency between personalInfo and borrower paths
      const mortgageData = leadData.mortgageData;
      
      // Special handling for syncing personalInfo to borrower data structure
      if (mortgageData.personalInfo && !mortgageData.borrower) {
        mortgageData.borrower = {
          data: {
            personalInfo: mortgageData.personalInfo.personalInfo || {},
            contactDetails: mortgageData.personalInfo.contactDetails || {},
            addressHistory: mortgageData.personalInfo.addressHistory || {}
          },
          section: "personalInfo"
        };
      } else if (mortgageData.personalInfo && mortgageData.borrower) {
        // Update borrower data with personalInfo
        mortgageData.borrower.data = {
          ...mortgageData.borrower.data,
          personalInfo: mortgageData.personalInfo.personalInfo || mortgageData.borrower.data.personalInfo || {},
          contactDetails: mortgageData.personalInfo.contactDetails || mortgageData.borrower.data.contactDetails || {},
          addressHistory: mortgageData.personalInfo.addressHistory || mortgageData.borrower.data.addressHistory || {}
        };
      } else if (mortgageData.borrower && !mortgageData.personalInfo) {
        // Sync from borrower to personalInfo
        mortgageData.personalInfo = {
          personalInfo: mortgageData.borrower.data.personalInfo || {},
          contactDetails: mortgageData.borrower.data.contactDetails || {},
          addressHistory: mortgageData.borrower.data.addressHistory || {}
        };
      }
      
      transformedData.mortgage_data = mortgageData;
      
      // Important fix: Sync personal information from mortgage data to lead fields
      if (mortgageData.personalInfo?.personalInfo) {
        // Sync first name if available
        if (mortgageData.personalInfo.personalInfo.firstName) {
          transformedData.first_name = mortgageData.personalInfo.personalInfo.firstName;
        }
        
        // Sync last name if available
        if (mortgageData.personalInfo.personalInfo.lastName) {
          transformedData.last_name = mortgageData.personalInfo.personalInfo.lastName;
        }
      }
      
      // Also check borrower.data structure if it exists
      if (mortgageData.borrower?.data?.personalInfo) {
        // Sync first name if available and not already set
        if (mortgageData.borrower.data.personalInfo.firstName && !transformedData.first_name) {
          transformedData.first_name = mortgageData.borrower.data.personalInfo.firstName;
        }
        
        // Sync last name if available and not already set
        if (mortgageData.borrower.data.personalInfo.lastName && !transformedData.last_name) {
          transformedData.last_name = mortgageData.borrower.data.personalInfo.lastName;
        }
      }

      // Sync email from contact details if available
      if (mortgageData.personalInfo?.contactDetails?.emailAddress) {
        transformedData.email = mortgageData.personalInfo.contactDetails.emailAddress;
      } else if (mortgageData.borrower?.data?.contactDetails?.emailAddress) {
        transformedData.email = mortgageData.borrower.data.contactDetails.emailAddress;
      }
    }

    // Update the lead in the database
    transformedData.is_mortgage_lead = isMortgageLead;
    if (addedToPipelineAt) {
      transformedData.added_to_pipeline_at = addedToPipelineAt;
    }

    // Filter out undefined values to prevent nullifying existing data
    Object.keys(transformedData).forEach(key => {
      if (transformedData[key] === undefined) {
        delete transformedData[key];
      }
    });

    console.log('Final transformed data for database update:', transformedData);

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

    // Record mortgage data updates in activity log if present
    if (leadData.mortgageData) {
      const mortgageActivityData = {
        lead_id: leadId,
        type: 'Mortgage Information Update',
        description: `Mortgage information updated`,
        timestamp: new Date().toISOString()
      };

      const { error: mortgageActivityError } = await supabase
        .from('lead_activities')
        .insert(mortgageActivityData);

      if (mortgageActivityError) {
        console.error('Error recording mortgage update activity:', mortgageActivityError.message);
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
      createdBy: data.created_by,
      mortgageData: data.mortgage_data
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
