
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://imrmboyczebjlbnkgjns.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    // Create Supabase client with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get query params or request body
    let params = {};
    
    if (req.method === "GET") {
      const url = new URL(req.url);
      // Extract leadId or other identifiers like email, name, etc.
      const leadIdParam = url.searchParams.get("leadId");
      const emailParam = url.searchParams.get("email");
      const nameParam = url.searchParams.get("name");
      
      params = {
        leadId: leadIdParam,
        email: emailParam,
        name: nameParam
      };
    } else if (req.method === "POST") {
      params = await req.json();
    }
    
    const { leadId, email, name } = params;
    
    // Try to find a valid lead by ID first, if provided and not "undefined"
    if (leadId && leadId !== "undefined") {
      const { data: leadData, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email')
        .eq('id', leadId)
        .maybeSingle();
      
      if (!error && leadData) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              leadId: leadData.id,
              firstName: leadData.first_name,
              lastName: leadData.last_name,
              email: leadData.email,
            }
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" }, 
            status: 200 
          }
        );
      }
    }
    
    // If leadId is not provided or invalid, try to find by email
    if (email) {
      const { data: leadData, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email')
        .ilike('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && leadData) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              leadId: leadData.id,
              firstName: leadData.first_name,
              lastName: leadData.last_name,
              email: leadData.email,
            }
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" }, 
            status: 200 
          }
        );
      }
    }
    
    // If email is not provided or no lead found, try to find by name
    if (name) {
      // Try to match against first_name or last_name
      const { data: leadData, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && leadData) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              leadId: leadData.id,
              firstName: leadData.first_name,
              lastName: leadData.last_name,
              email: leadData.email,
            }
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" }, 
            status: 200 
          }
        );
      }
    }
    
    // If we get here, no valid lead was found
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "No valid lead found. Please select a lead first." 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 404 
      }
    );
  } catch (error) {
    console.error("Error in get-lead-for-document-manager function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
