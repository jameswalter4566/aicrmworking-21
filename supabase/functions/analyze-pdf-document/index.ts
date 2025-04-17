
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Gets an access token for Adobe PDF Services API
 */
async function getAdobeAccessToken() {
  const clientId = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_ID');
  const clientSecret = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error("Adobe PDF Services API credentials not configured");
  }
  
  try {
    const response = await fetch('https://pdf-services.adobe.io/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'client_id': clientId,
        'client_secret': clientSecret
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Adobe access token: ${error}`);
    }
    
    const tokenData = await response.json();
    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting Adobe access token:", error);
    throw new Error(`Failed to authenticate with Adobe API: ${error.message}`);
  }
}

/**
 * Uploads a PDF to Adobe's cloud storage
 */
async function uploadPdfToAdobe(accessToken: string, pdfArrayBuffer: ArrayBuffer) {
  const clientId = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_ID');
  
  try {
    // Step 1: Get upload URI
    console.log("Requesting upload URI from Adobe...");
    const uploadResponse = await fetch('https://pdf-services.adobe.io/assets', {
      method: 'POST',
      headers: {
        'X-API-Key': clientId!,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'mediaType': 'application/pdf'
      })
    });
    
    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      console.error(`Upload URI request failed: ${uploadResponse.status} ${uploadResponse.statusText}`, errorBody);
      throw new Error(`Failed to get Adobe upload URI: ${errorBody}`);
    }
    
    const uploadData = await uploadResponse.json();
    const { uploadUri, assetID } = uploadData;
    
    if (!uploadUri || !assetID) {
      console.error("Invalid response from Adobe asset creation:", uploadData);
      throw new Error("Invalid upload URI or asset ID from Adobe");
    }
    
    console.log(`Got asset ID: ${assetID} and upload URI`);
    
    // Step 2: Upload the PDF to the provided URI
    console.log(`Uploading PDF (${pdfArrayBuffer.byteLength} bytes) to Adobe cloud...`);
    const uploadResult = await fetch(uploadUri, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf'
      },
      body: pdfArrayBuffer
    });
    
    if (!uploadResult.ok) {
      const errorBody = await uploadResult.text();
      console.error(`PDF upload failed: ${uploadResult.status} ${uploadResult.statusText}`, errorBody);
      throw new Error(`Failed to upload PDF to Adobe: ${errorBody}`);
    }
    
    console.log("PDF successfully uploaded to Adobe cloud");
    return assetID;
  } catch (error) {
    console.error("Error in uploadPdfToAdobe:", error);
    throw error;
  }
}

/**
 * Creates a PDF extraction job with Adobe
 */
async function createExtractionJob(accessToken: string, assetID: string) {
  const clientId = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_ID');
  
  try {
    console.log(`Creating extraction job for asset ID: ${assetID}`);
    
    // Try the most basic extraction request possible
    const extractResponse = await fetch('https://pdf-services.adobe.io/operation/extractpdf', {
      method: 'POST',
      headers: {
        'X-API-Key': clientId!,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "assetID": assetID
      })
    });
    
    console.log(`Extract response status: ${extractResponse.status}`);
    
    if (extractResponse.status !== 201) {
      const errorBody = await extractResponse.text();
      console.error(`Extract request failed: ${extractResponse.status} ${extractResponse.statusText}`, errorBody);
      throw new Error(`Failed to create extraction job: ${errorBody}`);
    }
    
    const location = extractResponse.headers.get('location');
    if (!location) {
      throw new Error("No location header returned for extraction job");
    }
    
    console.log(`Extraction job created, location: ${location}`);
    return location;
  } catch (error) {
    console.error("Error in createExtractionJob:", error);
    throw error;
  }
}

/**
 * Polls the job status until completion or timeout
 */
async function pollJobStatus(accessToken: string, jobLocation: string) {
  const clientId = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_ID');
  let status = "in progress";
  let downloadUri = null;
  let attempt = 0;
  const maxAttempts = 10; // Reduce to 10 attempts (20 seconds total wait time)
  
  console.log("Starting to poll job status...");
  
  // Poll every 2 seconds until done or failed
  while (status === "in progress" && attempt < maxAttempts) {
    attempt++;
    console.log(`Polling attempt ${attempt}/${maxAttempts}...`);
    
    try {
      const statusResponse = await fetch(jobLocation, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': clientId!
        }
      });
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error(`Status check failed: ${statusResponse.status} ${statusResponse.statusText}`, errorText);
        throw new Error(`Failed to get job status: ${errorText}`);
      }
      
      const statusData = await statusResponse.json();
      status = statusData.status;
      console.log(`Job status: ${status}`);
      
      if (status === "done") {
        downloadUri = statusData.downloadUri;
        console.log("Job completed successfully, download URI available");
        break;
      } else if (status === "failed") {
        console.error("Job failed:", JSON.stringify(statusData.error || {}));
        throw new Error(`PDF extraction job failed: ${JSON.stringify(statusData.error || {})}`);
      }
      
      // Wait 2 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error during poll attempt ${attempt}:`, error);
      // Continue polling despite errors
    }
  }
  
  if (!downloadUri) {
    throw new Error("PDF extraction timed out or no download URI available");
  }
  
  return downloadUri;
}

/**
 * Downloads the extracted content
 */
async function downloadExtractedContent(downloadUri: string) {
  try {
    console.log("Downloading extracted content...");
    const downloadResponse = await fetch(downloadUri);
    
    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      console.error(`Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`, errorText);
      throw new Error(`Failed to download extracted content: ${errorText}`);
    }
    
    return await downloadResponse.json();
  } catch (error) {
    console.error("Error downloading extracted content:", error);
    throw error;
  }
}

/**
 * Process PDF extraction with Adobe PDF Services API
 */
async function extractPdfWithAdobe(pdfArrayBuffer: ArrayBuffer) {
  try {
    console.log("🔑 Getting Adobe PDF Services access token...");
    const accessToken = await getAdobeAccessToken();
    
    console.log("📤 Uploading PDF to Adobe cloud storage...");
    const assetID = await uploadPdfToAdobe(accessToken, pdfArrayBuffer);
    
    console.log("🔍 Creating PDF extraction job...");
    const jobLocation = await createExtractionJob(accessToken, assetID);
    
    console.log("⏳ Polling job status until completion...");
    const downloadUri = await pollJobStatus(accessToken, jobLocation);
    
    console.log("📥 Downloading extracted content...");
    const extractedContent = await downloadExtractedContent(downloadUri);
    
    return extractedContent;
  } catch (error) {
    console.error("❌ Adobe PDF extraction failed:", error);
    throw error;
  }
}

/**
 * Main handler for the edge function
 */
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
    console.log("📥 Downloading PDF file from:", fileUrl);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      console.error(`Failed to download file: ${fileResponse.status} ${fileResponse.statusText}`, errorText);
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }

    // Get the array buffer of the PDF
    const pdfArrayBuffer = await fileResponse.arrayBuffer();
    console.log(`📄 PDF file downloaded successfully (${pdfArrayBuffer.byteLength} bytes)`);
    
    console.log("📑 Processing PDF document extraction...");
    
    // Extract PDF content using Adobe PDF Services API
    let extractedContent;
    let isAdobeExtraction = false;
    try {
      extractedContent = await extractPdfWithAdobe(pdfArrayBuffer);
      console.log("✅ Adobe PDF extraction completed successfully");
      isAdobeExtraction = true;
    } catch (adobeError) {
      console.error("❌ Adobe PDF extraction failed:", adobeError);
      console.log("⚠️ Falling back to OpenAI for direct analysis...");
      
      // Fallback to use OpenAI directly if Adobe extraction fails
      extractedContent = null;
    }
    
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

    console.log("📤 Sending PDF content to OpenAI for analysis...");
    
    const messages = [
      {
        role: "system",
        content: systemPrompt
      }
    ];
    
    // Use different approaches based on whether Adobe extraction was successful
    if (isAdobeExtraction && extractedContent) {
      // If we have Adobe extraction results, use that structured data
      console.log("Using Adobe extracted content for OpenAI analysis");
      
      // Get all text elements from Adobe's extraction
      let documentText = "";
      
      // Process the extracted content from Adobe to create a simpler text representation
      if (extractedContent.elements && Array.isArray(extractedContent.elements)) {
        for (const element of extractedContent.elements) {
          if (element.Text) {
            documentText += element.Text + "\n";
          }
        }
      }
      
      console.log(`Document text length: ${documentText.length} characters`);
      
      if (documentText.length === 0) {
        console.warn("No text extracted from Adobe results, falling back to base64 method");
        // Convert PDF to base64 as fallback
        const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));
        
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: "Please extract and analyze the text content from this PDF document."
            },
            {
              type: "text",
              text: `I'm providing this document as a base64-encoded PDF. The document is a mortgage approval letter containing loan conditions. Please extract the conditions and categorize them according to the instructions.`
            }
          ]
        });
      } else {
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze the following document that was extracted from a PDF file."
            },
            {
              type: "text",
              text: documentText
            }
          ]
        });
      }
    } else {
      // Fallback: Convert PDF to base64 and use GPT-4's ability to work with text
      console.log("Using base64 encoding for OpenAI PDF analysis");
      const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));
      
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Please extract and analyze the text content from this PDF document."
          },
          {
            type: "text",
            text: `I'm providing this document as a base64-encoded PDF. The document is a mortgage approval letter containing loan conditions. Please extract the conditions and categorize them according to the instructions.`
          }
        ]
      });
    }
    
    // Use OpenAI to analyze the content
    console.log("Making request to OpenAI API...");
    const aiResult = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.2, // Lower temperature for more consistent results
        response_format: { type: "json_object" }
      })
    });

    if (!aiResult.ok) {
      const errorBody = await aiResult.text();
      console.error(`OpenAI API error: ${aiResult.status} ${aiResult.statusText}`, errorBody);
      throw new Error(`OpenAI API error: ${errorBody}`);
    }

    const analysisResult = await aiResult.json();
    console.log("✅ OpenAI analysis complete");
    
    // Parse the analysis result
    const extractedData = JSON.parse(analysisResult.choices[0].message.content);
    
    // Add the raw extracted text from Adobe if available
    if (isAdobeExtraction && extractedContent) {
      extractedData.rawExtractedText = {
        source: "adobe_pdf_services",
        fullText: extractedContent.elements
          ?.filter((element: any) => element.Text)
          ?.map((element: any) => element.Text)
          ?.join("\n") || "",
        extractionTimestamp: new Date().toISOString()
      };
    }
    
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
