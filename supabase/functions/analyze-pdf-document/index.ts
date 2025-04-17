
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
    
    // Convert to base64 for OpenAI
    const fileBuffer = await fileResponse.arrayBuffer();
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
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

3. **Map extracted data to specific fields** of the **Uniform Residential Loan Application (Form 1003)**. Use the following schema for reference:

### SECTION I – Borrower Information
- Borrower First Name  
- Borrower Middle Name  
- Borrower Last Name  
- Suffix  
- Social Security Number  
- Date of Birth  
- Marital Status  
- Citizenship Status  
- Number of Dependents  
- Dependent Ages  
- Email Address  
- Home Phone  
- Mobile Phone  
- Current Address (Street, City, State, ZIP)  
- Time at Current Address (Years, Months)  
- Is this your Primary Residence?

### SECTION II – Financial Information: Assets and Liabilities
**Assets:**
- Checking Account Balances  
- Savings Account Balances  
- Retirement Accounts  
- Stocks and Bonds  
- Cash on Hand  
- Real Estate Owned (property details)

**Liabilities:**
- Credit Card Debts  
- Auto Loans  
- Student Loans  
- Mortgage Balances on Other Properties  
- Monthly Payment Obligations  
- Co-Signed Liabilities  

### SECTION III – Financial Information: Real Estate
- Property You Are Purchasing or Refinancing  
- Property Address  
- Intended Occupancy (Primary, Second Home, Investment)  
- Monthly Mortgage Payment  
- Property Taxes  
- Insurance  
- HOA Fees  
- Rental Income  

### SECTION IV – Employment and Income
**Current Employment:**
- Employer Name  
- Position/Title  
- Street Address  
- City, State, ZIP  
- Phone Number  
- Self-Employed?  
- Date of Employment Start  
- Income Type  
  - Base  
  - Overtime  
  - Bonuses  
  - Commissions  
  - Military  
  - Other

**Previous Employment (if <2 years):**
- Same fields as above

### SECTION V – Monthly Income and Combined Housing Expense
- Total Monthly Base Income  
- Other Income (Child Support, Alimony, Pension, etc.)  
- Total Combined Monthly Housing Expenses (Mortgage, Taxes, Insurance)

### SECTION VI – Details of Transaction
- Purchase Price  
- Loan Amount  
- Estimated Closing Costs  
- Down Payment  
- Seller Credits  
- Other Costs (HOA, Prepaids, etc.)

### SECTION VIII – Declarations
- Are you obligated to pay alimony or child support?  
- Have you declared bankruptcy in the last 7 years?  
- Are you party to a lawsuit?  
- Do you own any other properties?

### SECTION IX – Acknowledgments and Agreements
- Borrower Name  
- Date  
- Signature (only confirm presence if scanned)

### SECTION X – Information for Government Monitoring
- Gender  
- Ethnicity  
- Race  
- Chosen Not to Provide?

4. **If the document is a loan conditions or approval document**, extract the following information:
   - Loan conditions organized by:
     - Master conditions
     - General conditions
     - Prior to final conditions
     - Compliance conditions

5. **Matching Rules:**
   - If more than one borrower is listed, identify which document belongs to which person based on Name, DOB, SSN, or Address.
   - If values conflict across documents, flag as \`INCONSISTENT_DATA\`.

6. **Output Format:**
Return all extracted and classified data as structured **JSON**, organized by section headings.

7. **Fallbacks:**
   - If a field is not present, label it as \`MISSING\`.
   - If a document is unrecognizable or corrupted, label as \`UNRECOGNIZED_DOCUMENT\`.

You are acting as a trusted document processing agent in a mortgage underwriting pipeline. Ensure full security, privacy, and data integrity at all times.`;
    }
    
    // Call OpenAI to analyze the PDF
    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",  // Using GPT-4o for better document analysis
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
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${fileBase64}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      })
    });
    
    if (!openAiResponse.ok) {
      const error = await openAiResponse.json();
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }
    
    const aiResult = await openAiResponse.json();
    const extractedData = JSON.parse(aiResult.choices[0].message.content);
    
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
          // Get existing mortgage data
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
            
            // Check if this is the first time conditions are being added
            const { data: existingConditions, error: fetchError } = await supabase
              .from("loan_conditions")
              .select("created_at, updated_at")
              .eq("lead_id", leadId)
              .single();
              
            const isFirstConditionUpdate = !fetchError && existingConditions && 
              existingConditions.created_at === existingConditions.updated_at;
              
            if (isFirstConditionUpdate) {
              console.log(`First time conditions detected for lead ${leadId}. Updating loan status to Approved`);
              
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
              } catch (progressErr) {
                console.error("Exception during status update:", progressErr);
              }
            }
          }
        } catch (err) {
          console.error("Error in data storage process:", err);
        }
      }
    } else {
      // Update lead's mortgage data if leadId is provided (same as existing code)
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
    
    return new Response(
      JSON.stringify({
        success: true,
        data: processedData,
        documentType: extractedData.documentType || (fileType === "conditions" ? "Conditions" : "Unknown"),
        message: "Document successfully analyzed"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
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
