
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

    const requestData = await req.json();
    const { leadId, category, subcategory } = requestData;

    console.log("Document retrieval request:", { leadId, category, subcategory });

    // Validate leadId is not undefined, null, or "undefined" string
    if (!leadId || leadId === "undefined" || leadId === "null") {
      throw new Error("Invalid or missing leadId");
    }

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
      return new Response(
        JSON.stringify({ success: false, error: "Lead not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    let query = supabase
      .from('document_files')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    // Add filters if provided
    if (category) {
      query = query.eq('category', category);
    }
    
    // Handle potential subcategory mismatches - common for Income documents
    if (subcategory) {
      if (category === "Income" && subcategory === "W-2s / 1099s") {
        // Try the singular version if looking for the plural
        const { data: singularData, error: singularError } = await supabase
          .from('document_files')
          .select('*')
          .eq('lead_id', leadId)
          .eq('category', category)
          .eq('subcategory', "W-2 / 1099")
          .order('created_at', { ascending: false });
          
        if (!singularError && singularData && singularData.length > 0) {
          console.log(`Found ${singularData.length} documents with subcategory "W-2 / 1099"`);
          
          // Generate URLs for each file
          const documentsWithUrls = singularData.map(doc => {
            const publicUrl = supabase.storage.from('documents').getPublicUrl(doc.file_path).data.publicUrl;
            return {
              ...doc,
              url: publicUrl
            };
          });
          
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
        }
      }
      
      // If no special case handling worked, continue with the original query
      query = query.eq('subcategory', subcategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error retrieving documents:", error);
      throw new Error(`Error retrieving documents: ${error.message}`);
    }

    console.log(`Retrieved ${data ? data.length : 0} documents for leadId=${leadId}, category=${category}, subcategory=${subcategory}`);

    // Generate URLs for each file
    const documentsWithUrls = data ? data.map(doc => {
      const publicUrl = supabase.storage.from('documents').getPublicUrl(doc.file_path).data.publicUrl;
      return {
        ...doc,
        url: publicUrl
      };
    }) : [];

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
