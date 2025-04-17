
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as pdfLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm";

// Configure PDF.js for a Node.js/Deno environment
// IMPORTANT: PDF.js needs to be configured for headless environments
const pdfjsLib = pdfLib.default;

// Required for Deno environment
// @ts-ignore - Deno doesn't have a global 'window' or 'document'
globalThis.navigator = { userAgent: "deno" };

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
    
    console.log("🔍 Loading PDF document...");
    
    // Set up the worker for PDF.js in Deno environment
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
    
    // Load the PDF document with enhanced options
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfArrayBuffer),
      // Enable all features to ensure maximum content extraction
      disableFontFace: false,
      cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/"
    });
    
    const pdfDocument = await loadingTask.promise;
    
    console.log(`📄 PDF loaded successfully. Pages: ${pdfDocument.numPages}`);
    
    // Extract text from all pages with improved extraction
    let fullText = '';
    let pageTexts = []; // Array to store text from each page
    
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      console.log(`Processing page ${pageNum} of ${pdfDocument.numPages}`);
      
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      
      // Get text content with more options
      const textContent = await page.getTextContent({
        normalizeWhitespace: false,  // Don't normalize whitespace to preserve exact content
        disableCombineTextItems: false // Combining items helps with better flow in headless environment
      });
      
      // Process text items with positioning to maintain proper order and spacing
      const textItems = textContent.items;
      let lastY = null;
      let lastX = null;
      let pageText = '';
      
      // Sort items by vertical position first, then by horizontal position
      const sortedItems = [...textItems].sort((a, b) => {
        // Get y-coordinate in page space
        const yDiff = b.transform[5] - a.transform[5];
        
        // If items are on different lines (using a small threshold)
        if (Math.abs(yDiff) > 5) {
          return yDiff; // Sort by y-coordinate (top to bottom)
        } else {
          // If on same line, sort by x-coordinate (left to right)
          return a.transform[4] - b.transform[4];
        }
      });
      
      // Process each text item
      for (const item of sortedItems) {
        if (!item.str) continue; // Skip empty items
        
        // Get coordinates
        const x = item.transform[4];
        const y = item.transform[5];
        
        // Insert appropriate spacing
        if (lastY !== null) {
          // If significant change in y-position, add a new line
          if (Math.abs(y - lastY) > 5) {
            pageText += '\n';
            lastX = null; // Reset x position after line break
          } 
          // If on the same line but with significant horizontal gap, add space
          else if (lastX !== null && (x - lastX) > (item.width || 10)) {
            pageText += ' ';
          }
        }
        
        // Add the text
        pageText += item.str;
        
        // Update last positions
        lastX = x + (item.width || 0);
        lastY = y;
      }
      
      pageTexts.push({
        pageNumber: pageNum,
        text: pageText
      });
      
      fullText += pageText + '\n\n--- PAGE BREAK ---\n\n';
    }
    
    console.log("📝 Extracted text from PDF, sending to OpenAI for analysis...");
    
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
    
    // Send the extracted text to OpenAI for analysis
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
            content: `Here is the full text extracted from the document. Please analyze it according to the instructions. The text has been extracted VERBATIM, with page breaks indicated:\n\n${fullText}`
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
    
    // Add the raw extracted text to the response for verification
    extractedData.rawExtractedText = {
      fullText: fullText,
      pageByPage: pageTexts
    };
    
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
