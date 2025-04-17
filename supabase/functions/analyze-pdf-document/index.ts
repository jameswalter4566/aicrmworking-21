
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const { fileUrl, fileType, leadId } = await req.json();
    
    console.log(`📥 Received request for PDF analysis:`, { fileUrl, fileType, leadId });
    
    if (!fileUrl) {
      console.error("❌ No fileUrl provided in request");
      return new Response(
        JSON.stringify({ error: 'File URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize OpenAI API
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      console.error("❌ OpenAI API key not configured");
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the PDF file
    console.log("📥 Downloading PDF file...");
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }

    // Get the array buffer of the PDF
    const pdfArrayBuffer = await fileResponse.arrayBuffer();
    
    console.log("📑 Converting PDF to text using alternative approach...");
    
    // Instead of using PDF.js directly, we'll send the PDF to OpenAI's API
    // which can handle document analysis with its vision capabilities
    console.log("📤 Sending PDF content to OpenAI for analysis...");
    
    // Create a base64 version of the PDF for OpenAI
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));
    
    // Determine the appropriate prompt based on fileType
    let systemPrompt = "";
    
    if (fileType === "conditions") {
      systemPrompt = `You are an expert mortgage loan condition analyzer. Your task is to extract loan conditions from underwriting approval letters and organize them into categories.

Instructions:
1. Extract all conditions from the mortgage approval document. EXTRACT THE FULL VERBATIM TEXT of each condition exactly as written.
2. Categorize conditions into these standard sections:
   - "masterConditions" - The most critical conditions that must be met
   - "generalConditions" - Standard conditions that apply to most loans
   - "priorToFinalConditions" - Conditions that must be satisfied before final approval
   - "complianceConditions" - Regulatory and legal compliance requirements

3. For each condition, provide:
   - "text" - The FULL VERBATIM TEXT of the condition EXACTLY as written in the document. DO NOT summarize or paraphrase.
   - "category" - Which category it belongs to
   - "id" - A unique identifier (you can generate this)
   - "status" - Default to "no_action" for all conditions
   - "originalText" - Also provide the complete original text as a separate field

4. Return the data in a structured JSON format with the following array fields:
   - masterConditions
   - generalConditions
   - priorToFinalConditions
   - complianceConditions`;
    } else {
      // General mortgage document analysis prompt
      systemPrompt = `You are an intelligent mortgage document analyzer. Analyze the provided document text and classify it.`;
    }

    // Use a simpler approach with OpenAI's vision capabilities to analyze the PDF
    const aiResult = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this PDF document and extract information according to the instructions."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64PDF}`
                }
              }
            ]
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent results
        response_format: { type: "json_object" }
      })
    });

    if (!aiResult.ok) {
      const error = await aiResult.text();
      console.error("❌ OpenAI API error:", error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const analysisResult = await aiResult.json();
    console.log("✅ OpenAI analysis complete");
    
    // Parse the analysis result
    const extractedData = JSON.parse(analysisResult.choices[0].message.content);
    
    // Process conditions if this is a conditions document
    if (fileType === "conditions" && leadId) {
      console.log("💾 Saving analyzed conditions to database...");
      
      // Create Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Save to loan_conditions table
      const { error: saveError } = await supabase
        .from('loan_conditions')
        .upsert({
          lead_id: leadId,
          conditions_data: extractedData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "lead_id"
        });
        
      if (saveError) {
        console.error("❌ Error saving conditions:", saveError);
      } else {
        console.log("✅ Conditions saved successfully");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        message: "Document successfully analyzed",
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("❌ Error processing document:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process document",
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
