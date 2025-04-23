
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const leadId = formData.get("leadId") as string;
    const category = formData.get("category") as string;
    const subcategory = formData.get("subcategory") as string;
    
    // Validate leadId is not undefined, null, or "undefined" string
    if (!file) {
      throw new Error("Missing required file");
    }
    
    if (!leadId || leadId === "undefined" || leadId === "null") {
      throw new Error("Invalid or missing leadId");
    }
    
    if (!category || !subcategory) {
      throw new Error("Missing required fields: category, subcategory");
    }

    // Create document path format: lead_id/category/subcategory/filename
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = `${leadId}/${category}/${subcategory}/${fileName}`;
    
    console.log(`Storing file at path: ${filePath}`);

    // Upload file to storage
    const { data: fileData, error: uploadError } = await supabase
      .storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }

    // Record document metadata in database
    const { data: metaData, error: metaError } = await supabase
      .from('document_files')
      .insert({
        lead_id: leadId,
        category: category,
        subcategory: subcategory,
        file_name: fileName,
        original_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type
      })
      .select()
      .single();

    if (metaError) {
      // If metadata storage fails, try to clean up the file
      await supabase.storage.from('documents').remove([filePath]);
      throw new Error(`Error storing document metadata: ${metaError.message}`);
    }

    const publicUrl = supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;

    return new Response(
      JSON.stringify({
        success: true,
        message: "File uploaded successfully",
        data: { ...metaData, url: publicUrl }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in store-document function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
