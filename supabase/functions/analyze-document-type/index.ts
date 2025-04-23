import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

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
    // Request upload URI
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
      console.error(`Upload URI request failed: ${uploadResponse.status}`, errorBody);
      throw new Error(`Failed to get Adobe upload URI: ${errorBody}`);
    }
    
    const uploadData = await uploadResponse.json();
    const { uploadUri, assetID } = uploadData;
    
    if (!uploadUri || !assetID) {
      throw new Error("Invalid upload URI or asset ID from Adobe");
    }
    
    console.log(`Got asset ID: ${assetID} and upload URI`);
    
    // Upload the PDF to the provided URI
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
 * Limits extraction to first 3 pages for large files
 */
async function createExtractionJob(accessToken: string, apiBase: string, assetID: string, limitToFirstThreePages = true) {
  const clientId = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_ID');
  
  try {
    console.log(`Creating extraction job for asset ID: ${assetID}`);
    
    // Configure the extraction request - THIS IS THE KEY CHANGE
    // The Adobe API is strict about the format of the elementsToExtract array
    const extractionRequest: any = {
      "assetID": assetID
    };
    
    // Always include the elementsToExtract array with proper format
    extractionRequest.elementsToExtract = ["text", "tables"];
    
    // If limiting to first 3 pages
    if (limitToFirstThreePages) {
      extractionRequest.pageRanges = [{
        "startPage": 1,
        "endPage": 3
      }];
    }
    
    console.log("Extraction request payload:", JSON.stringify(extractionRequest));
    
    const extractUrl = buildAdobeApiUrl(apiBase, '/operation/extractpdf');
    const extractResponse = await fetch(extractUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': clientId!,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(extractionRequest)
    });
    
    console.log(`Extract response status: ${extractResponse.status}`);
    
    // Log error response for debugging
    if (![201, 202].includes(extractResponse.status)) {
      const errorBody = await extractResponse.text();
      console.error(`Failed extraction response: ${errorBody}`);
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
  
  // 60 attempts at 2-second intervals = 2 minutes max wait time
  const maxAttempts = 60;
  const defaultPollingInterval = 2000; // 2 seconds between each attempt
  
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
        console.error(`Status check failed: ${statusResponse.status}`, errorText);
        
        // If we get a 401 Unauthorized, the token might have expired
        if (statusResponse.status === 401) {
          throw new Error("Adobe API authentication failed - token may have expired");
        }
        
        // For other errors, continue polling
        await new Promise(resolve => setTimeout(resolve, defaultPollingInterval));
        continue;
      } 
      
      const statusData = await statusResponse.json();
      status = statusData.status;
      console.log(`Job status: ${status}`);
      
      if (status === "done") {
        // Look for downloadUri
        console.log("Job completed, looking for downloadUri...");
        
        let downloadUri = null;
        
        // Check all potential locations where downloadUri might be
        if (statusData.content && statusData.content.downloadUri) {
          downloadUri = statusData.content.downloadUri;
        }
        else if (statusData.resource && statusData.resource.downloadUri) {
          downloadUri = statusData.resource.downloadUri;
        }
        else if (statusData.outputs && Array.isArray(statusData.outputs)) {
          // First try to find JSON output type
          const jsonOutput = statusData.outputs.find((o: any) => o.type === "application/json");
          if (jsonOutput && jsonOutput.downloadUri) {
            downloadUri = jsonOutput.downloadUri;
          } else {
            // Fall back to ZIP output type
            const zipOutput = statusData.outputs.find((o: any) => o.type === "application/zip");
            if (zipOutput && zipOutput.downloadUri) {
              downloadUri = zipOutput.downloadUri;
            }
          }
        }
        else if (statusData.output && typeof statusData.output === 'object' && statusData.output.downloadUri) {
          downloadUri = statusData.output.downloadUri;
        }
        else if (statusData.downloadUri) {
          downloadUri = statusData.downloadUri;
        }
        
        // Final check if we have a valid downloadUri
        if (!downloadUri) {
          throw new Error("PDF extraction job completed but no downloadUri was provided");
        }
        
        console.log("Successfully found download URI");
        return downloadUri;
      } else if (status === "failed") {
        const errorDetails = JSON.stringify(statusData.error || {});
        throw new Error(`PDF extraction job failed: ${errorDetails}`);
      }
      
      // Check if Adobe recommends a specific retry interval
      // This respects Adobe's server-recommended polling intervals
      if (statusData.retryIn) {
        // Adobe returns retryIn in seconds, convert to ms
        await new Promise(resolve => setTimeout(resolve, statusData.retryIn * 1000));
      } else {
        await new Promise(resolve => setTimeout(resolve, defaultPollingInterval));
      }
    } catch (error) {
      console.error(`Error during poll attempt ${attempt}:`, error);
      
      // If this is a fatal error, stop polling
      if (error.message.includes("token may have expired") || 
          error.message.includes("PDF extraction job failed")) {
        throw error;
      }
      
      // Otherwise continue polling
      await new Promise(resolve => setTimeout(resolve, defaultPollingInterval));
    }
  }
  
  if (status === "in progress") {
    throw new Error(`PDF extraction timed out after ${maxAttempts} polling attempts`);
  }
  
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
      throw new Error(`Failed to download extracted content: ${errorText}`);
    }
    
    // Store the content type for content handling decision
    const contentType = downloadResponse.headers.get("content-type") || "";
    console.log(`Downloaded content type: ${contentType}`);
    
    // Get the response as an array buffer
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
      const zipArray = new Uint8Array(responseData);
      const jszip = await JSZip.loadAsync(zipArray);
      console.log("Successfully loaded ZIP file, looking for structuredData.json");
      
      // List all files in the ZIP for debugging
      const fileNames = Object.keys(jszip.files);
      console.log("Files in ZIP:", fileNames);
      
      // Extract structuredData.json from the ZIP
      const structuredDataFile = jszip.file('structuredData.json');
      if (!structuredDataFile) {
        throw new Error("Invalid ZIP format: missing structuredData.json");
      }
      
      // Get the JSON content from the file
      const jsonString = await structuredDataFile.async('string');
      const extractedContent = JSON.parse(jsonString);
      
      console.log("Successfully parsed structured JSON data from ZIP");
      return extractedContent;
    } catch (zipError) {
      console.error("Failed to process ZIP file:", zipError);
      
      // Fallback: try to decode the response directly
      try {
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
        throw new Error("Failed to process downloaded content");
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
async function extractPdfWithAdobe(pdfArrayBuffer: ArrayBuffer, limitToFirstThreePages = true) {
  try {
    console.log("Getting Adobe PDF Services access token...");
    const { access_token: accessToken, api_base: apiBase } = await getAdobeAccessToken();
    
    console.log("Uploading PDF to Adobe cloud storage...");
    const assetID = await uploadPdfToAdobe(accessToken, apiBase, pdfArrayBuffer);
    
    console.log("Creating PDF extraction job...");
    const jobLocation = await createExtractionJob(accessToken, apiBase, assetID, limitToFirstThreePages);
    
    console.log("Polling job status until completion...");
    const downloadUri = await pollJobStatus(accessToken, jobLocation);
    
    console.log("Downloading extracted content...");
    const extractedContent = await downloadExtractedContent(downloadUri);
    
    return extractedContent;
  } catch (error) {
    console.error("Adobe PDF extraction failed:", error);
    throw error;
  }
}

/**
 * Identify document category and subcategory using OpenAI
 */
async function identifyDocumentType(extractedText: string) {
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAiKey) {
    throw new Error("OpenAI API key not configured");
  }
  
  const categories = {
    "Identification": ["Driver's License", "Social Security Card", "Passport"],
    "Income": ["Pay Stubs", "W-2s / 1099s", "Tax Returns (1040s, K-1s, etc.)", "Profit & Loss Statements", "Social Security / Pension Award Letters", "Unemployment Benefits", "Child Support / Alimony Income"],
    "Assets": ["Bank Statements", "Retirement Account Statements", "Investment Statements", "Gift Letters", "Asset Verification Forms"],
    "Property Documents": ["Purchase Agreement", "Appraisal Report", "Homeowners Insurance", "Flood Insurance", "Title Report / Title Commitment", "Preliminary Title", "Survey", "Pest Inspection", "Property Photos"],
    "Credit & Liabilities": ["Credit Report", "Credit Explanation Letter", "Student Loan Statements", "Car Loan / Lease Docs", "Credit Card Statements"],
    "Employment / VOE": ["Written Verification of Employment (VOE)", "Verbal VOE", "Employer Letters"],
    "Compliance / Disclosures": ["Loan Estimate (LE)", "Closing Disclosure (CD)", "Truth in Lending (TIL)", "Right to Cancel Notice", "ECOA / Fair Lending Disclosure", "eConsent", "Initial & Final Disclosures"],
    "Legal": ["Divorce Decree", "Child Support Order", "Bankruptcy Discharge", "Power of Attorney", "Trust Documentation"],
    "HOA Documents": ["HOA Questionnaire", "HOA Dues Statement", "HOA Insurance Certificate"],
    "Underwriting Conditions": ["Letter of Explanation (LOE)", "Condition Clearing Docs", "Risk Assessment Docs", "AUS Findings (DU/LP)"],
    "Title & Escrow": ["Escrow Instructions", "Title Insurance", "Settlement Statement (HUD-1 / ALTA)", "Wiring Instructions", "Bailee Letter"],
    "Mortgage Insurance": ["MI Certificate", "MI Application", "MI Cancellation Request"],
    "Investor / Funding": ["Purchase Advice", "Loan Purchase Agreement", "Investor Commitment"],
    "Audit / Quality Control": ["Pre-Funding QC Review", "Post-Closing Audit Docs", "Fraud Check / Compliance Reports"],
    "Other / Miscellaneous": ["Notes from Borrower", "Correspondence", "Internal Memos", "Supporting Docs Not Elsewhere Categorized"]
  };
  
  // Create a formatted list of categories and subcategories for the prompt
  let categoriesList = "";
  Object.entries(categories).forEach(([category, subcategories]) => {
    categoriesList += `${category}:\n`;
    subcategories.forEach(subcategory => {
      categoriesList += `- ${subcategory}\n`;
    });
    categoriesList += "\n";
  });
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a document classification expert for mortgage processing. 
Your task is to analyze document text and determine the category and subcategory from the predefined list below.
Return ONLY a JSON object with "category" and "subcategory" properties matching exactly one of the options below.
If you're unsure, use your best judgment to select the closest match from the available categories.

${categoriesList}`
          },
          {
            role: "user",
            content: extractedText.substring(0, 8000) // Limit context window for larger documents
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent results
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error: ${errorBody}`);
    }

    const result = await response.json();
    const classification = JSON.parse(result.choices[0].message.content);
    
    // Validate the classification against our known categories and subcategories
    if (!classification.category || !classification.subcategory) {
      throw new Error("Invalid classification: missing category or subcategory");
    }
    
    // Check if the category exists in our predefined list
    if (!Object.keys(categories).includes(classification.category)) {
      // Default to Other if category doesn't match
      classification.category = "Other / Miscellaneous";
      classification.subcategory = "Supporting Docs Not Elsewhere Categorized";
    } else {
      // Check if the subcategory exists within the identified category
      const validSubcategories = categories[classification.category];
      if (!validSubcategories.includes(classification.subcategory)) {
        // Use the first subcategory of the identified category as fallback
        classification.subcategory = validSubcategories[0];
      }
    }
    
    return classification;
  } catch (error) {
    console.error("Error identifying document type:", error);
    
    // Default classification as fallback
    return {
      category: "Other / Miscellaneous",
      subcategory: "Supporting Docs Not Elsewhere Categorized"
    };
  }
}

// Add a fallback document classification function that uses patterns and filename
function classifyDocumentByPatterns(fileName: string): { category: string, subcategory: string } | null {
  fileName = fileName.toLowerCase();
  
  // Tax document patterns - more specific first
  // W-2 pattern detection (high priority)
  if (fileName.includes('w-2') || fileName.includes('w2') || fileName.includes('wage') && fileName.includes('tax')) {
    return {
      category: "Income",
      subcategory: "W-2 / 1099"
    };
  }
  
  // 1099 pattern detection
  if (fileName.includes('1099')) {
    return {
      category: "Income",
      subcategory: "W-2 / 1099"
    };
  }
  
  // Tax returns pattern detection
  if (fileName.includes('1040') || fileName.includes('tax') && fileName.includes('return')) {
    return {
      category: "Income",
      subcategory: "Tax Returns (1040s, K-1s)"
    };
  }
  
  // Pay stubs pattern detection
  if ((fileName.includes('pay') && (fileName.includes('stub') || fileName.includes('statement'))) || 
      fileName.includes('paystub')) {
    return {
      category: "Income",
      subcategory: "Pay Stubs"
    };
  }
  
  // Bank statements pattern detection
  if (fileName.includes('bank') && fileName.includes('statement')) {
    return {
      category: "Assets",
      subcategory: "Bank Statements"
    };
  }

  // ID documents pattern detection
  if (fileName.includes('driver') || fileName.includes('license') || fileName.includes('id card')) {
    return {
      category: "Identification",
      subcategory: "Driver's License"
    };
  }
  
  // No pattern match found
  return null;
}

/**
 * Process the document and store it in the appropriate category
 */
async function processAndOrganizeDocument(
  supabase: any, 
  fileUrl: string, 
  fileName: string, 
  fileType: string, 
  leadId: string, 
  originalFile: any
) {
  try {
    console.log(`Processing document: ${fileName}`);
    
    // First try pattern-based classification by filename
    const patternClassification = classifyDocumentByPatterns(fileName);
    if (patternClassification) {
      console.log(`Pattern-based classification found: ${patternClassification.category} > ${patternClassification.subcategory}`);
      
      // Store the document with the pattern-based classification
      console.log(`Storing document using pattern classification: ${patternClassification.category}/${patternClassification.subcategory}`);
      
      // Create form data for the store-document function
      const formData = new FormData();
      formData.append("file", originalFile);
      formData.append("leadId", leadId);
      formData.append("category", patternClassification.category);
      formData.append("subcategory", patternClassification.subcategory);
      
      // Call the store-document function
      const { data, error } = await supabase.functions.invoke("store-document", {
        body: formData,
      });
      
      if (error) {
        console.error("Error storing document:", error);
        throw error;
      }
      
      console.log("Document successfully stored via pattern matching:", data);
      return {
        success: true,
        classification: patternClassification,
        data: data
      };
    }
    
    // Download the file if pattern matching didn't work
    console.log("No pattern match found. Downloading file from:", fileUrl);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }
    
    // Get the file content as an array buffer
    const fileArrayBuffer = await fileResponse.arrayBuffer();
    console.log(`File downloaded successfully (${fileArrayBuffer.byteLength} bytes)`);
    
    let extractedText = "";
    let documentClassification = {
      category: "Other / Miscellaneous",
      subcategory: "Supporting Docs Not Elsewhere Categorized"
    };
    
    // Only process PDFs with Adobe PDF Services API
    if (fileType === "application/pdf") {
      try {
        console.log("Extracting text from PDF...");
        // Extract only the first 3 pages to limit API usage
        const extractedContent = await extractPdfWithAdobe(fileArrayBuffer, true);
        
        // Convert extracted content to plain text for classification
        if (extractedContent && extractedContent.elements) {
          extractedText = extractedContent.elements
            .filter((element: any) => element.Text)
            .map((element: any) => element.Text)
            .join("\n");
            
          console.log(`Extracted text length: ${extractedText.length} characters`);
        } else {
          console.warn("No text elements found in the extracted content");
        }
        
        // Identify document type
        if (extractedText) {
          console.log("Identifying document type...");
          documentClassification = await identifyDocumentType(extractedText);
          console.log("Document classification:", documentClassification);
        }
      } catch (extractionError) {
        console.error("Error extracting PDF content:", extractionError);
        // Continue with OpenAI classification using just the filename
        console.log("Falling back to OpenAI classification with just filename...");
        documentClassification = await identifyDocumentType(fileName);
      }
    } else {
      console.log("Non-PDF file detected, classifying based on filename");
      // For non-PDF files, use OpenAI to classify based on filename
      documentClassification = await identifyDocumentType(fileName);
    }
    
    // Store the document in the identified category and subcategory
    console.log(`Storing document in ${documentClassification.category}/${documentClassification.subcategory}`);
    
    // Create form data for the store-document function
    const formData = new FormData();
    formData.append("file", originalFile);
    formData.append("leadId", leadId);
    formData.append("category", documentClassification.category);
    formData.append("subcategory", documentClassification.subcategory);
    
    // Call the store-document function to properly store and categorize the file
    const { data, error } = await supabase.functions.invoke("store-document", {
      body: formData,
    });
    
    if (error) {
      console.error("Error storing document:", error);
      throw error;
    }
    
    console.log("Document successfully stored:", data);
    return {
      success: true,
      classification: documentClassification,
      data: data
    };
  } catch (error) {
    console.error("Error in processAndOrganizeDocument:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get request data
    const formData = await req.formData();
    const file = formData.get("file");
    const leadId = formData.get("leadId");
    
    if (!file || !(file instanceof File)) {
      throw new Error("No file provided");
    }
    
    if (!leadId) {
      throw new Error("No lead ID provided");
    }
    
    console.log(`Received file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
    
    // Store file temporarily to get a URL
    const fileName = `temp_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('documents')
      .upload(`temp/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error("Error uploading temporary file:", uploadError);
      throw new Error(`Error uploading temporary file: ${uploadError.message}`);
    }
    
    // Get temporary file URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('documents')
      .getPublicUrl(`temp/${fileName}`);
      
    console.log("Temporary file URL:", publicUrl);
    
    // Process the document
    const result = await processAndOrganizeDocument(
      supabase,
      publicUrl,
      file.name,
      file.type,
      leadId as string,
      file
    );
    
    // Clean up temporary file
    await supabase.storage.from('documents').remove([`temp/${fileName}`]);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Document successfully processed and organized",
        data: result
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-document-type function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process document",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
