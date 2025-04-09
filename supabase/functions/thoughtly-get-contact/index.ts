
// Follow Deno syntax
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { id } = await req.json();
    
    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Contact ID is required"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }
    
    // In a real implementation, this would call the Thoughtly API
    // For now, we'll simulate getting a contact from the database
    
    // Access Supabase from the Edge Function
    const supabaseClient = Deno.env.get('SUPABASE_URL') && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      ? await createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
      : null;
      
    let contactData;
    
    if (supabaseClient) {
      // Try to get the contact from the database
      const { data, error } = await supabaseClient
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        console.error('Error fetching contact from database:', error);
      } else if (data) {
        contactData = transformLeadData(data);
      }
    }
    
    // If not found in database or there was an error, return mock data
    if (!contactData) {
      console.log('Using mock data for contact:', id);
      contactData = getMockContactData(id);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: contactData
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to get contact"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});

// Function to transform database lead data to the expected format
function transformLeadData(leadData) {
  return {
    id: leadData.id,
    firstName: leadData.first_name,
    lastName: leadData.last_name,
    email: leadData.email,
    phone1: leadData.phone1,
    phone2: leadData.phone2,
    disposition: leadData.disposition,
    tags: leadData.tags || [],
    mailingAddress: leadData.mailing_address,
    propertyAddress: leadData.property_address,
    avatar: leadData.avatar,
    createdBy: leadData.created_by,
    createdAt: leadData.created_at,
    updatedAt: leadData.updated_at
  };
}

// Helper to create mock data for testing
function getMockContactData(id) {
  return {
    id: parseInt(id),
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone1: "(555) 123-4567",
    phone2: "(555) 987-6543",
    disposition: "Contacted",
    tags: ["buyer", "active"],
    mailingAddress: "123 Main St, Anytown, CA 90210",
    propertyAddress: "456 Oak Ave, Anytown, CA 90210",
    avatar: "",
    createdBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Helper function to create a Supabase client with the service role key
async function createClient(supabaseUrl: string, supabaseKey: string) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.7.1');
  return createClient(supabaseUrl, supabaseKey);
}
