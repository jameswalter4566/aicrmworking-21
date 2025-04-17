import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Simple delay function for async/await
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    console.log("Requesting Adobe access token...");
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
    console.log("Successfully obtained Adobe access token");
    
    // Store the API access point for all subsequent requests
    const api_access_point = tokenData.api_access_point || 'https://pdf-services.adobe.io';
    
    return {
      access_token: tokenData.access_token,
      api_base: api_access_point,
      expires_in: tokenData.expires_in
    };
  } catch (error) {
    console.error("Error getting Adobe access token:", error);
    throw new Error(`Failed to authenticate with Adobe API: ${error.message}`);
  }
}

/**
 * Builds Adobe API URL using the base URL from token response
 */
function buildAdobeApiUrl(apiBase: string, path: string): string {
  // Ensure path starts with / and apiBase doesn't end with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Uploads a PDF to Adobe's cloud storage
 */
async function uploadPdfToAdobe(accessToken: string, apiBase: string, pdfArrayBuffer: ArrayBuffer) {
  const clientId = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_ID');
  
  try {
    // Step 1: Get upload URI
    console.log("Requesting upload URI from Adobe...");
    const uploadUrl = buildAdobeApiUrl(apiBase, '/assets');
    const uploadResponse = await fetch(uploadUrl, {
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
async function createExtractionJob(accessToken: string, apiBase: string, assetID: string) {
  const clientId = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_ID');
  
  try {
    console.log(`Creating extraction job for asset ID: ${assetID}`);
    
    const extractUrl = buildAdobeApiUrl(apiBase, '/operation/extractpdf');
    const extractResponse = await fetch(extractUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': clientId!,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "assetID": assetID,
        "elementsToExtract": ["text", "tables"]
      })
    });
    
    console.log(`Extract response status: ${extractResponse.status}`);
    
    // Accept both 201 (Created) and 202 (Accepted) status codes as successful responses
    if (![201, 202].includes(extractResponse.status)) {
      const errorBody = await extractResponse.text();
      console.error(`Extract request failed: ${extractResponse.status} ${extractResponse.statusText}`, errorBody);
      throw new Error(`Failed to create extraction job: ${errorBody}`);
    }
    
    // Get location header which contains the job status URL
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
  let attempt = 0;
  
  // Increase polling attempts to respect Adobe's longer processing times
  // 120 attempts at 2-second intervals = 4 minutes max wait time
  const maxAttempts = 120;
  const defaultPollingInterval = 2000; // 2 seconds between each attempt by default
  
  console.log("Starting to poll job status...");
  
  // Poll until done, failed, or timeout
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
        
        // If we get a 401 Unauthorized, the token might have expired
        if (statusResponse.status === 401) {
          throw new Error("Adobe API authentication failed - token may have expired");
        }
        
        // For other errors, continue polling
        console.warn("Non-fatal error during polling, will retry");
      } else {
        const statusData = await statusResponse.json();
        status = statusData.status;
        console.log(`Job status: ${status}`);
        
        if (status === "done") {
          // Look for downloadUri in outputs array (preferred) or output array (older accounts)
          console.log("Job completed, looking for downloadUri...");
          
          // Debug log the full response structure
          console.log("Response structure:", JSON.stringify(statusData, null, 2));
          
          let downloadUri = null;
          
          // Check if downloadUri is in the content object (based on the log this is the most likely location)
          if (statusData.content && statusData.content.downloadUri) {
            console.log("Found downloadUri in content object");
            downloadUri = statusData.content.downloadUri;
          }
          
          // Check if downloadUri is in the resource object
          else if (statusData.resource && statusData.resource.downloadUri) {
            console.log("Found downloadUri in resource object");
            downloadUri = statusData.resource.downloadUri;
          }
          
          // Search in outputs array (newer API response format)
          else if (statusData.outputs && Array.isArray(statusData.outputs)) {
            console.log(`Found ${statusData.outputs.length} outputs`);
            
            // First try to find JSON output type (more efficient if we only need text)
            const jsonOutput = statusData.outputs.find((o: any) => o.type === "application/json");
            if (jsonOutput && jsonOutput.downloadUri) {
              console.log("Found JSON output with downloadUri");
              downloadUri = jsonOutput.downloadUri;
            } else {
              // Fall back to ZIP output type
              const zipOutput = statusData.outputs.find((o: any) => o.type === "application/zip");
              if (zipOutput && zipOutput.downloadUri) {
                console.log("Found ZIP output with downloadUri");
                downloadUri = zipOutput.downloadUri;
              }
            }
          }
          
          // Search in output property (older API response format)
          else if (statusData.output) {
            console.log("Checking older 'output' format");
            if (typeof statusData.output === 'object' && statusData.output.downloadUri) {
              downloadUri = statusData.output.downloadUri;
            }
          }
          
          // Check if downloadUri is directly on the statusData object
          else if (statusData.downloadUri) {
            console.log("Found downloadUri directly on status object");
            downloadUri = statusData.downloadUri;
          }
          
          // Final check if we have a valid downloadUri
          if (!downloadUri) {
            console.error("Job completed but no downloadUri was found in any expected location:", statusData);
            throw new Error("PDF extraction job completed but no downloadUri was provided: " + JSON.stringify(statusData, null, 2));
          }
          
          console.log("Successfully found download URI");
          return downloadUri;
        } else if (status === "failed") {
          const errorDetails = JSON.stringify(statusData.error || {});
          console.error("Job failed:", errorDetails);
          throw new Error(`PDF extraction job failed: ${errorDetails}`);
        }
        
        // Check if Adobe recommends a specific retry interval
        // This respects Adobe's server-recommended polling intervals
        if (statusData.retryIn) {
          // Adobe returns retryIn in seconds, convert to ms
          await delay(statusData.retryIn * 1000);
        } else {
          await delay(defaultPollingInterval);
        }
      }
    } catch (error) {
      console.error(`Error during poll attempt ${attempt}:`, error);
      
      // If this is a fatal error, stop polling
      if (error.message.includes("token may have expired") || 
          error.message.includes("PDF extraction job failed") ||
          error.message.includes("downloadUri not found")) {
        throw error;
      }
      
      // Otherwise continue polling
      await delay(defaultPollingInterval);
    }
  }
  
  if (status === "in progress") {
    throw new Error(`PDF extraction timed out after ${maxAttempts} polling attempts (${maxAttempts * 2} seconds)`);
  }
  
  // This should never happen as we either return from the function or throw an error above
  throw new Error("PDF extraction completed but no download URI available");
}

/**
 * Downloads and processes the extracted content
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
    
    // Store the content type for content handling decision
    const contentType = downloadResponse.headers.get("content-type") || "";
    console.log(`Downloaded content type: ${contentType}`);
    
    // Get the response once as an array buffer
    const responseData = await downloadResponse.arrayBuffer();
    console.log(`Downloaded data size: ${responseData.byteLength} bytes`);
    
    // If it's JSON, parse directly
    if (contentType.includes("application/json")) {
      console.log("Processing direct JSON response...");
      const jsonText = new TextDecoder().decode(responseData);
      try {
        const extractedContent = JSON.parse(jsonText);
        console.log("Successfully parsed JSON data");
        return extractedContent;
      } catch (jsonError) {
        console.error("Failed to parse JSON:", jsonError);
        throw new Error("Invalid JSON format in response");
      }
    }
    
    // Otherwise, assume it's a ZIP and process accordingly
    console.log("Processing ZIP file result...");
    try {
      // Convert array buffer to Uint8Array for JSZip
      const zipArray = new Uint8Array(responseData);
      console.log(`Processing ZIP file: ${zipArray.length} bytes`);
      
      // Load the ZIP file 
      const jszip = await JSZip.loadAsync(zipArray);
      console.log("Successfully loaded ZIP file, looking for structuredData.json");
      
      // List all files in the ZIP for debugging
      const fileNames = Object.keys(jszip.files);
      console.log("Files in ZIP:", fileNames);
      
      // Extract structuredData.json from the ZIP
      const structuredDataFile = jszip.file('structuredData.json');
      if (!structuredDataFile) {
        console.error("No structuredData.json found in the ZIP file");
        throw new Error("Invalid ZIP format: missing structuredData.json");
      }
      
      // Get the JSON content from the file
      const jsonString = await structuredDataFile.async('string');
      const extractedContent = JSON.parse(jsonString);
      
      console.log("Successfully parsed structured JSON data from ZIP");
      return extractedContent;
    } catch (zipError) {
      console.error("Failed to process ZIP file:", zipError);
      
      // If ZIP processing fails, try to decode the raw response as a fallback
      console.log("Attempting to parse response directly as a fallback...");
      
      try {
        // Try to decode as text
        const rawText = new TextDecoder().decode(responseData);
        if (!rawText || rawText.trim() === '') {
          throw new Error("Downloaded content is empty or invalid");
        }
        
        // Try to parse as JSON
        try {
          const jsonContent = JSON.parse(rawText);
          console.log("Successfully parsed response data as JSON");
          return jsonContent;
        } catch (jsonError) {
          console.log("Response is not valid JSON, using as raw text");
          return { elements: [{ Text: rawText }] };
        }
      } catch (textError) {
        console.error("Failed to decode response as text:", textError);
        throw new Error("Failed to process downloaded content in any supported format");
      }
    }
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
    const { access_token: accessToken, api_base: apiBase } = await getAdobeAccessToken();
    
    console.log("📤 Uploading PDF to Adobe cloud storage...");
    const assetID = await uploadPdfToAdobe(accessToken, apiBase, pdfArrayBuffer);
    
    console.log("🔍 Creating PDF extraction job...");
    const jobLocation = await createExtractionJob(accessToken, apiBase, assetID);
    
    console.log("⏳ Polling job status until completion...");
    const downloadUri = await pollJobStatus(accessToken, jobLocation);
    
    console.log("📥 Downloading extracted content...");
    const extractedContent = await downloadExtractedContent(downloadUri);
    
    // Validate extracted content
    if (!extractedContent || !extractedContent.elements || extractedContent.elements.length === 0) {
      console.warn("Adobe extraction returned empty or invalid content structure");
      throw new Error("Adobe extraction returned no usable content");
    }
    
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
        console.log(`Found ${extractedContent.elements.length} elements in Adobe extraction`);
        
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
