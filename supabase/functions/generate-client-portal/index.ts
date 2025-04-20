
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

// Generate a random slug for the portal URL
function generateSlug(length = 8): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Generate a secure access token for authentication
function generateAccessToken(length = 32): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

serve(async (req) => {
  console.log("Portal generation function called");
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log("Supabase URL available:", !!supabaseUrl);
    console.log("Supabase Anon Key available:", !!supabaseAnonKey);
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
      }
    );

    // Get request data
    const requestData = await req.json();
    console.log("Request data:", JSON.stringify(requestData));
    
    const { leadId, createdBy } = requestData;

    if (!leadId) {
      console.error("Missing leadId in request");
      return new Response(
        JSON.stringify({ error: 'Lead ID is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Check if the lead exists
    console.log("Checking if lead exists:", leadId);
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('id, first_name, last_name')
      .eq('id', leadId)
      .single();

    if (leadError) {
      console.error("Error fetching lead:", leadError.message);
      return new Response(
        JSON.stringify({ error: 'Lead not found', details: leadError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }
    
    if (!lead) {
      console.error("Lead not found with ID:", leadId);
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Check if a portal already exists for this lead
    console.log("Checking for existing portal for lead:", leadId);
    const { data: existingPortal, error: existingPortalError } = await supabaseClient
      .from('client_portal_access')
      .select('*')
      .eq('lead_id', leadId)
      .single();
      
    if (existingPortalError && existingPortalError.code !== 'PGRST116') {
      console.error("Error checking existing portal:", existingPortalError);
    }

    if (existingPortal) {
      console.log("Found existing portal access", existingPortal.id);
      // Update the created_by field if it's not set and we have a creator now
      if (createdBy && !existingPortal.created_by) {
        await supabaseClient
          .from('client_portal_access')
          .update({ created_by: createdBy })
          .eq('id', existingPortal.id);
      }
      
      // Return the existing portal info - modified to be consistent with new URL format
      return new Response(
        JSON.stringify({ 
          portal: existingPortal,
          url: `/client-portal/${existingPortal.portal_slug}?token=${existingPortal.access_token}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Generate new portal access
    const portalSlug = generateSlug(10);
    const accessToken = generateAccessToken();
    
    console.log("Creating new portal access with slug:", portalSlug);

    // Check if client_portal_access table exists
    const { data: tableCheck, error: tableCheckError } = await supabaseClient
      .from('client_portal_access')
      .select('id')
      .limit(1);
      
    if (tableCheckError) {
      console.error("Error checking table existence:", tableCheckError.message);
      
      // If the table doesn't exist, create it
      if (tableCheckError.message.includes("relation") && tableCheckError.message.includes("does not exist")) {
        console.log("Table client_portal_access doesn't exist, trying to create it");
        
        // Since we can't create tables directly from edge functions, return a helpful error
        return new Response(
          JSON.stringify({ 
            error: 'The client_portal_access table does not exist. Please create it in your database.',
            tableError: tableCheckError.message
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }
    }

    // Store in the database with creator information
    console.log("Inserting new portal access record");
    const { data: newPortal, error: portalError } = await supabaseClient
      .from('client_portal_access')
      .insert({
        lead_id: leadId,
        portal_slug: portalSlug,
        access_token: accessToken,
        created_by: createdBy || null
      })
      .select()
      .single();

    if (portalError) {
      console.error("Error creating portal access:", portalError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to create portal access', details: portalError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    console.log("Successfully created new portal access record");
    
    return new Response(
      JSON.stringify({
        portal: newPortal,
        url: `/client-portal/${portalSlug}?token=${accessToken}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in generate-client-portal function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
