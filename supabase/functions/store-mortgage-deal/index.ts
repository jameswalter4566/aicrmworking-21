
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
    // Extract lead data from request body
    const { leadId } = await req.json();

    if (!leadId) {
      throw new Error('Lead ID is required');
    }

    console.log(`Processing lead ID ${leadId} for pipeline`);

    // Fetch lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError) {
      console.error('Error fetching lead:', leadError.message);
      throw new Error(`Failed to fetch lead: ${leadError.message}`);
    }

    if (!lead) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Lead not found' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Calculate estimated deal value based on mortgage data
    let estimatedValue = 0;
    if (lead.mortgage_data?.property?.loanAmount) {
      estimatedValue = parseFloat(lead.mortgage_data.property.loanAmount);
    }

    // Calculate probability based on disposition
    let probability = 50; // Default
    switch (lead.disposition) {
      case 'Submitted': 
        probability = 75;
        break;
      case 'Appointment Set':
        probability = 60;
        break;
      case 'Contacted':
        probability = 40;
        break;
      case 'Not Contacted':
        probability = 20;
        break;
    }

    // Set a default closing date 30 days from now
    const closingDate = new Date();
    closingDate.setDate(closingDate.getDate() + 30);

    // Insert into mortgage_deals table
    const { data: deal, error: dealError } = await supabase
      .from('mortgage_deals')
      .insert({
        lead_id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone1: lead.phone1,
        phone2: lead.phone2,
        mailing_address: lead.mailing_address,
        property_address: lead.property_address,
        disposition: lead.disposition,
        mortgage_data: lead.mortgage_data,
        created_by: 'Current User', // In a real app, this would be the authenticated user
        stage: 'New',
        value: estimatedValue,
        probability: probability,
        closing_date: closingDate.toISOString()
      })
      .select()
      .single();

    if (dealError) {
      console.error('Error creating mortgage deal:', dealError.message);
      throw new Error(`Failed to create mortgage deal: ${dealError.message}`);
    }

    // Log activity
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: lead.id,
        type: 'Pipeline',
        description: 'Lead pushed to mortgage pipeline'
      });

    console.log('Deal successfully created:', deal.id);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: deal 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );
  } catch (error) {
    console.error(`Error in store-mortgage-deal function: ${error.message}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
