
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

    const { leadId, category, subcategory } = await req.json();

    // Validate leadId is not undefined, null, or "undefined" string
    if (!leadId || leadId === "undefined" || leadId === "null") {
      throw new Error("Invalid or missing leadId");
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
    
    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error retrieving documents: ${error.message}`);
    }

    // Generate URLs for each file
    const documentsWithUrls = data.map(doc => {
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
