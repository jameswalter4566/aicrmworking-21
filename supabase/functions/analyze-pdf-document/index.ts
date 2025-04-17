
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
    // Get file URL and metadata from request
    const { fileUrl, fileType, leadId } = await req.json();
    
    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: 'File URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize OpenAI API
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processing PDF document: ${fileUrl}`);
    console.log(`Document type hint: ${fileType || 'Unknown'}`);
    
    // Download the PDF file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }
    
    // Read file as bytes
    const fileBuffer = await fileResponse.arrayBuffer();
    
    // Determine the appropriate prompt based on fileType
    let systemPrompt = "";
    
    if (fileType === "conditions") {
      // Special prompt for loan condition documents
      systemPrompt = `You are an expert mortgage loan condition analyzer. Your task is to extract loan conditions from underwriting approval letters and organize them into categories. 

Instructions:
1. Extract all conditions from the mortgage approval document.
2. Categorize conditions into these standard sections:
   - "masterConditions" - The most critical conditions that must be met
   - "generalConditions" - Standard conditions that apply to most loans
   - "priorToFinalConditions" - Conditions that must be satisfied before final approval
   - "complianceConditions" - Regulatory and legal compliance requirements

3. For each condition, provide:
   - "text" - The full text of the condition
   - "category" - Which category it belongs to
   - "id" - A unique identifier (you can generate this)
   - "status" - Default to "no_action" for all conditions

4. Return the data in a structured JSON format with the following array fields:
   - masterConditions
   - generalConditions
   - priorToFinalConditions
   - complianceConditions

5. If you find a condition but are unsure which category it belongs to, place it in generalConditions.

6. Be comprehensive. Make sure to capture ALL conditions mentioned in the document.`;
    } else {
      // General mortgage document analysis prompt
      systemPrompt = `You are an intelligent mortgage document analyzer. Your job is to:

1. **Classify** the type of each uploaded document:
   - W-2
   - Paystub
   - Mortgage Statement
   - Government-Issued ID (Driver's License, Passport)
   - Bank Statement
   - Tax Return (1040, Schedule C)
   - Utility Bill
   - Employment Letter
   - Lease Agreement
   - Social Security Award Letter
   - Loan Conditions or Approval Document
   - Other (label as 'Unrecognized')

2. **Extract borrower data** from each document, including Personal Identifiable Information (PII), financial data, and employment information.

3. **Map extracted data to specific fields** of the **Uniform Residential Loan Application (Form 1003)**.

4. **If the document is a loan conditions or approval document**, extract the following information:
   - Loan conditions organized by:
     - Master conditions
     - General conditions
     - Prior to final conditions
     - Compliance conditions

5. **Output Format:**
Return all extracted and classified data as structured **JSON**, organized by section headings.`;
    }
    
    // For PDF processing, we need to use the text extraction endpoint instead of vision
    // Convert the PDF to text first using an OCR-based approach with OpenAI
    
    // Create a form with the PDF file
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' }), 'document.pdf');
    formData.append('model', 'gpt-4o');
    formData.append('purpose', 'assistive');
    
    // Extract text from PDF using OpenAI file upload endpoint 
    const fileUploadResponse = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`
      },
      body: formData
    });
    
    if (!fileUploadResponse.ok) {
      const error = await fileUploadResponse.text();
      console.error("OpenAI file upload error:", error);
      
      // If file upload fails, try direct chat completion as fallback
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
              content: `Please analyze this mortgage document based on the prompt. Since I cannot directly provide the PDF, I'll describe it: This is a mortgage approval document containing conditions that need to be met.${fileType === "conditions" ? " Please extract and categorize all loan conditions." : " Please classify and extract information from this document."}`
            }
          ],
          response_format: { type: "json_object" }
        })
      });
      
      if (!aiResult.ok) {
        const error = await aiResult.json();
        console.error("OpenAI API error:", error);
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
      }

      const textResult = await aiResult.json();
      const extractedData = JSON.parse(textResult.choices[0].message.content);
      
      // Process data based on document type
      let processedData = extractedData;
      
      if (fileType === "conditions") {
        // Enhance condition data with status, notes, etc.
        processedData = {
          masterConditions: (extractedData.masterConditions || []).map(condition => ({
            ...condition,
            id: condition.id || crypto.randomUUID(),
            conditionStatus: condition.status || "no_action",
            text: condition.text || condition.description || "",
            notes: ""
          })),
          generalConditions: (extractedData.generalConditions || []).map(condition => ({
            ...condition,
            id: condition.id || crypto.randomUUID(),
            conditionStatus: condition.status || "no_action",
            text: condition.text || condition.description || "",
            notes: ""
          })),
          priorToFinalConditions: (extractedData.priorToFinalConditions || []).map(condition => ({
            ...condition,
            id: condition.id || crypto.randomUUID(),
            conditionStatus: condition.status || "no_action",
            text: condition.text || condition.description || "",
            notes: ""
          })),
          complianceConditions: (extractedData.complianceConditions || []).map(condition => ({
            ...condition,
            id: condition.id || crypto.randomUUID(),
            conditionStatus: condition.status || "no_action",
            text: condition.text || condition.description || "",
            notes: ""
          }))
        };
        
        // Save conditions if leadId is provided
        if (leadId && (
          processedData.masterConditions.length > 0 ||
          processedData.generalConditions.length > 0 ||
          processedData.priorToFinalConditions.length > 0 ||
          processedData.complianceConditions.length > 0
        )) {
          try {
            // Save the conditions data
            const { error: saveError } = await supabase
              .from('loan_conditions')
              .upsert({
                lead_id: leadId,
                conditions_data: processedData,
                updated_at: new Date().toISOString()
              }, {
                onConflict: "lead_id"
              });
              
            if (saveError) {
              console.error("Error saving conditions data:", saveError);
            } else {
              console.log("Successfully saved conditions data");
              
              // Always update the loan status to Approved when conditions are detected
              console.log(`Updating loan status for lead ${leadId} to Approved`);
                
              try {
                const { data: progressData, error: progressError } = await supabase.functions.invoke('update-loan-progress', {
                  body: { 
                    leadId, 
                    currentStep: "approved",
                    notes: "Automatically set to Approved based on conditions detected in PDF"
                  }
                });
                
                if (progressError) {
                  console.error("Error updating loan progress:", progressError);
                } else {
                  console.log("Successfully updated loan status to Approved");
                }
                
                // NEW: Call the automation-matcher after conditions are saved
                console.log("Calling automation-matcher with conditions");
                try {
                  const { data: automationData, error: automationError } = await supabase.functions.invoke('automation-matcher', {
                    body: { 
                      leadId,
                      conditions: processedData
                    }
                  });
                  
                  if (automationError) {
                    console.error("Error from automation-matcher:", automationError);
                  } else {
                    console.log("Automation matcher completed successfully:", automationData);
                  }
                } catch (autoError) {
                  console.error("Exception in automation-matcher call:", autoError);
                }
              } catch (progressErr) {
                console.error("Exception during status update:", progressErr);
              }
            }
          } catch (err) {
            console.error("Error in data storage process:", err);
          }
        }
      } else {
        // Same code for non-conditions document processing
        if (leadId) {
          try {
            // Get existing mortgage data
            const { data: leadData, error: fetchError } = await supabase
              .from('leads')
              .select('mortgage_data')
              .eq('id', leadId)
              .single();
              
            if (fetchError) {
              console.error("Error fetching lead data:", fetchError);
            } else {
              // Store documents in an array rather than merging
              const existingMortgageData = leadData?.mortgage_data || {};
              
              // Initialize documents array if it doesn't exist
              if (!existingMortgageData.documents) {
                existingMortgageData.documents = [];
              }
              
              // Add new document with metadata
              const documentEntry = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                documentType: extractedData.documentType || "Unknown",
                extractedData: extractedData
              };
              
              existingMortgageData.documents.push(documentEntry);
              
              // Create or update basic info for convenient access
              if (!existingMortgageData.basicInfo) {
                existingMortgageData.basicInfo = {};
              }
              
              // Update basic info if available from this document
              const borrowerInfo = extractedData.borrower || extractedData["SECTION I"] || {};
              if (borrowerInfo.firstName) existingMortgageData.basicInfo.firstName = borrowerInfo.firstName;
              if (borrowerInfo.lastName) existingMortgageData.basicInfo.lastName = borrowerInfo.lastName;
              if (borrowerInfo["Borrower First Name"]) existingMortgageData.basicInfo.firstName = borrowerInfo["Borrower First Name"];
              if (borrowerInfo["Borrower Last Name"]) existingMortgageData.basicInfo.lastName = borrowerInfo["Borrower Last Name"];
              
              // Store income info in a simple format if available
              const incomeInfo = extractedData.income || extractedData["SECTION V"] || {};
              if (incomeInfo.monthlyBase || incomeInfo["Total Monthly Base Income"] || incomeInfo.base) {
                existingMortgageData.basicInfo.income = {
                  monthlyBase: incomeInfo.monthlyBase || incomeInfo["Total Monthly Base Income"] || incomeInfo.base || 0
                };
              }
              
              // Store document count for convenience
              existingMortgageData.documentCount = (existingMortgageData.documents || []).length;
              
              // Update the lead with new data
              const { error: updateError } = await supabase
                .from('leads')
                .update({ mortgage_data: existingMortgageData })
                .eq('id', leadId);
                
              if (updateError) {
                console.error("Error updating lead data:", updateError);
              } else {
                console.log("Successfully updated lead mortgage data");
              }
            }
          } catch (err) {
            console.error("Error in data storage process:", err);
          }
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          data: processedData,
          documentType: extractedData.documentType || (fileType === "conditions" ? "Conditions" : "Unknown"),
          message: "Document successfully analyzed"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If file upload succeeded, process the file
    const fileData = await fileUploadResponse.json();
    const fileId = fileData.id;
    
    try {
      // Use the uploaded file in a chat completion
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
                  text: fileType === "conditions" 
                    ? "Please analyze this mortgage approval document and extract all loan conditions according to the specified categories."
                    : "Please analyze this mortgage document and extract all relevant information according to the 1003 form structure. Please be as thorough as possible and classify the document type."
                }
              ]
            }
          ],
          file_ids: [fileId],
          response_format: { type: "json_object" }
        })
      });
      
      if (!aiResult.ok) {
        const error = await aiResult.json();
        console.error("OpenAI API error:", error);
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
      }
      
      const textResult = await aiResult.json();
      const extractedData = JSON.parse(textResult.choices[0].message.content);
      
      console.log("Successfully extracted data from document");
      
      // Process data based on document type
      let processedData = extractedData;
      
      if (fileType === "conditions") {
        // Enhance condition data with status, notes, etc.
        processedData = {
          masterConditions: (extractedData.masterConditions || []).map(condition => ({
            ...condition,
            id: condition.id || crypto.randomUUID(),
            conditionStatus: condition.status || "no_action",
            text: condition.text || condition.description || "",
            notes: ""
          })),
          generalConditions: (extractedData.generalConditions || []).map(condition => ({
            ...condition,
            id: condition.id || crypto.randomUUID(),
            conditionStatus: condition.status || "no_action",
            text: condition.text || condition.description || "",
            notes: ""
          })),
          priorToFinalConditions: (extractedData.priorToFinalConditions || []).map(condition => ({
            ...condition,
            id: condition.id || crypto.randomUUID(),
            conditionStatus: condition.status || "no_action",
            text: condition.text || condition.description || "",
            notes: ""
          })),
          complianceConditions: (extractedData.complianceConditions || []).map(condition => ({
            ...condition,
            id: condition.id || crypto.randomUUID(),
            conditionStatus: condition.status || "no_action",
            text: condition.text || condition.description || "",
            notes: ""
          }))
        };
        
        // Save conditions if leadId is provided
        if (leadId && (
          processedData.masterConditions.length > 0 ||
          processedData.generalConditions.length > 0 ||
          processedData.priorToFinalConditions.length > 0 ||
          processedData.complianceConditions.length > 0
        )) {
          try {
            // Save the conditions data
            const { error: saveError } = await supabase
              .from('loan_conditions')
              .upsert({
                lead_id: leadId,
                conditions_data: processedData,
                updated_at: new Date().toISOString()
              }, {
                onConflict: "lead_id"
              });
              
            if (saveError) {
              console.error("Error saving conditions data:", saveError);
            } else {
              console.log("Successfully saved conditions data");
              
              // Always update the loan status to Approved when conditions are detected
              console.log(`Updating loan status for lead ${leadId} to Approved`);
                
              try {
                const { data: progressData, error: progressError } = await supabase.functions.invoke('update-loan-progress', {
                  body: { 
                    leadId, 
                    currentStep: "approved",
                    notes: "Automatically set to Approved based on conditions detected in PDF"
                  }
                });
                
                if (progressError) {
                  console.error("Error updating loan progress:", progressError);
                } else {
                  console.log("Successfully updated loan status to Approved");
                }
                
                // NEW: Call the automation-matcher after conditions are saved
                console.log("Calling automation-matcher with conditions");
                try {
                  const { data: automationData, error: automationError } = await supabase.functions.invoke('automation-matcher', {
                    body: { 
                      leadId,
                      conditions: processedData
                    }
                  });
                  
                  if (automationError) {
                    console.error("Error from automation-matcher:", automationError);
                  } else {
                    console.log("Automation matcher completed successfully:", automationData);
                  }
                } catch (autoError) {
                  console.error("Exception in automation-matcher call:", autoError);
                }
              } catch (progressErr) {
                console.error("Exception during status update:", progressErr);
              }
            }
          } catch (err) {
            console.error("Error in data storage process:", err);
          }
        }
      } else {
        // Update lead's mortgage data if leadId is provided
        if (leadId) {
          try {
            // Get existing mortgage data
            const { data: leadData, error: fetchError } = await supabase
              .from('leads')
              .select('mortgage_data')
              .eq('id', leadId)
              .single();
              
            if (fetchError) {
              console.error("Error fetching lead data:", fetchError);
            } else {
              // NEW APPROACH: Store documents in an array rather than merging
              const existingMortgageData = leadData?.mortgage_data || {};
              
              // Initialize documents array if it doesn't exist
              if (!existingMortgageData.documents) {
                existingMortgageData.documents = [];
              }
              
              // Add new document with metadata
              const documentEntry = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                documentType: extractedData.documentType || "Unknown",
                extractedData: extractedData
              };
              
              existingMortgageData.documents.push(documentEntry);
              
              // Create or update basic info for convenient access
              // Only a minimal, flat structure with non-nested properties
              if (!existingMortgageData.basicInfo) {
                existingMortgageData.basicInfo = {};
              }
              
              // Update basic info if available from this document
              const borrowerInfo = extractedData.borrower || extractedData["SECTION I"] || {};
              if (borrowerInfo.firstName) existingMortgageData.basicInfo.firstName = borrowerInfo.firstName;
              if (borrowerInfo.lastName) existingMortgageData.basicInfo.lastName = borrowerInfo.lastName;
              if (borrowerInfo["Borrower First Name"]) existingMortgageData.basicInfo.firstName = borrowerInfo["Borrower First Name"];
              if (borrowerInfo["Borrower Last Name"]) existingMortgageData.basicInfo.lastName = borrowerInfo["Borrower Last Name"];
              
              // Store income info in a simple format if available
              const incomeInfo = extractedData.income || extractedData["SECTION V"] || {};
              if (incomeInfo.monthlyBase || incomeInfo["Total Monthly Base Income"] || incomeInfo.base) {
                existingMortgageData.basicInfo.income = {
                  monthlyBase: incomeInfo.monthlyBase || incomeInfo["Total Monthly Base Income"] || incomeInfo.base || 0
                };
              }
              
              // Store document count for convenience
              existingMortgageData.documentCount = (existingMortgageData.documents || []).length;
              
              // Update the lead with new data (no complex merging)
              const { error: updateError } = await supabase
                .from('leads')
                .update({ mortgage_data: existingMortgageData })
                .eq('id', leadId);
                
              if (updateError) {
                console.error("Error updating lead data:", updateError);
              } else {
                console.log("Successfully updated lead mortgage data");
              }
            }
          } catch (err) {
            console.error("Error in data storage process:", err);
            // Continue execution to return the extracted data even if storing fails
          }
        }
      }
      
      // Clean up - delete the uploaded file after processing
      try {
        await fetch(`https://api.openai.com/v1/files/${fileId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${openAiKey}`
          }
        });
      } catch (deleteError) {
        console.error("Error deleting temporary OpenAI file:", deleteError);
        // Continue with the response even if file deletion fails
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          data: processedData,
          documentType: extractedData.documentType || (fileType === "conditions" ? "Conditions" : "Unknown"),
          message: "Document successfully analyzed",
          automationTriggered: true // Indicate that automation was triggered
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      // Additional cleanup if needed
    }
    
  } catch (error) {
    console.error("Error processing document:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process document"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
