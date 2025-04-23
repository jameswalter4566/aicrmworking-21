
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
    console.log("retrieve-documents function called");
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://imrmboyczebjlbnkgjns.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    // Create Supabase client with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json();
    console.log("Request body:", JSON.stringify(requestBody));
    
    const { leadId, category, subcategory } = requestBody;

    // Validate leadId is not undefined, null, or "undefined" string
    if (!leadId || leadId === "undefined" || leadId === "null") {
      console.error("Invalid leadId provided:", leadId);
      throw new Error("Invalid or missing leadId");
    }
    
    console.log(`Retrieving documents for leadId: ${leadId}`, 
      category ? `, category: ${category}` : "",
      subcategory ? `, subcategory: ${subcategory}` : "");

    // Verify the lead actually exists in the database
    const { data: leadExists, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .maybeSingle();

    if (leadError) {
      console.error("Error checking lead:", leadError);
      return new Response(
        JSON.stringify({ success: false, error: "Error validating leadId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!leadExists) {
      console.log(`Lead with id ${leadId} not found in database`);
      return new Response(
        JSON.stringify({ success: false, error: "Lead not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    console.log(`Lead exists: ${JSON.stringify(leadExists)}`);

    let query = supabase
      .from('document_files')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    // Log the SQL query that would be executed (for debugging)
    console.log(`Query to be executed: .from('document_files').select('*').eq('lead_id', ${leadId})`);
    
    // Add filters if provided
    if (category) {
      query = query.eq('category', category);
      console.log(`.eq('category', ${category})`);
    }
    
    if (subcategory) {
      query = query.eq('subcategory', subcategory);
      console.log(`.eq('subcategory', ${subcategory})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error retrieving documents:", error);
      throw new Error(`Error retrieving documents: ${error.message}`);
    }
    
    console.log(`Query returned ${data ? data.length : 0} documents`);

    // Generate URLs for each file
    const documentsWithUrls = data?.map(doc => {
      const publicUrl = supabase.storage.from('documents').getPublicUrl(doc.file_path).data.publicUrl;
      return {
        ...doc,
        url: publicUrl
      };
    }) || [];
    
    console.log(`Returning ${documentsWithUrls.length} documents with URLs`);

    return new Response(
      JSON.stringify({
        success: true,
        data: documentsWithUrls
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in retrieve-documents function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
