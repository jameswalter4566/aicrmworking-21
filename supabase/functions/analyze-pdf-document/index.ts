
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
    console.log(`Document type: ${fileType || 'Unknown'}`);
    
    // Download the PDF file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }
    
    // Convert to base64 for OpenAI
    const fileBuffer = await fileResponse.arrayBuffer();
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
    // Determine what to extract based on fileType
    let systemPrompt = "You are an expert at analyzing mortgage documents. Extract all relevant information from this document and format it as a structured JSON object.";
    
    if (fileType === "mortgage_statement") {
      systemPrompt = "Extract all mortgage information from this statement, including principal balance, interest rate, monthly payment amount, escrow details, property address, and lender information.";
    } else if (fileType === "w2") {
      systemPrompt = "Extract all income and employment information from this W-2, including employer name, address, employee details, wages, federal/state tax withholdings, and year of the W-2.";
    } else if (fileType === "paystub") {
      systemPrompt = "Extract all income information from this paystub, including employer, employee details, pay period, gross income, net income, YTD totals, and deductions.";
    } else if (fileType === "1003") {
      systemPrompt = "Extract all information from this mortgage application (1003 form), including borrower details, property information, employment, income, assets, liabilities, and declarations.";
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
                text: "Please analyze this document and extract all relevant information in a structured JSON format."
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
    
    // Update lead's mortgage data if leadId is provided
    if (leadId) {
      // Get existing mortgage data
      const { data: leadData, error: fetchError } = await supabase
        .from('leads')
        .select('mortgage_data')
        .eq('id', leadId)
        .single();
        
      if (fetchError) {
        console.error("Error fetching lead data:", fetchError);
      } else {
        // Merge existing data with new extracted data
        const existingMortgageData = leadData?.mortgage_data || {};
        const updatedMortgageData = mergeDocumentData(existingMortgageData, extractedData, fileType);
        
        // Update the lead with new data
        const { error: updateError } = await supabase
          .from('leads')
          .update({ mortgage_data: updatedMortgageData })
          .eq('id', leadId);
          
        if (updateError) {
          console.error("Error updating lead data:", updateError);
        } else {
          console.log("Successfully updated lead mortgage data");
        }
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
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

// Helper function to intelligently merge document data into mortgage_data structure
function mergeDocumentData(existingData: any, extractedData: any, documentType: string | undefined) {
  const result = { ...existingData };
  
  // Initialize sections if they don't exist
  if (!result.borrower) result.borrower = {};
  if (!result.property) result.property = {};
  if (!result.employment) result.employment = {};
  if (!result.income) result.income = {};
  if (!result.assets) result.assets = {};
  if (!result.liabilities) result.liabilities = {};
  
  // Based on document type, merge data into appropriate sections
  if (documentType === "mortgage_statement") {
    // Update property information
    if (extractedData.property) {
      result.property = { ...result.property, ...extractedData.property };
    }
    
    // Update liabilities (mortgage)
    if (extractedData.mortgage) {
      if (!result.liabilities.mortgages) result.liabilities.mortgages = [];
      
      // Check if this mortgage already exists in the data
      const existingMortgageIndex = result.liabilities.mortgages.findIndex(
        (m: any) => m.lender === extractedData.mortgage.lender && 
                    m.propertyAddress === extractedData.mortgage.propertyAddress
      );
      
      if (existingMortgageIndex >= 0) {
        result.liabilities.mortgages[existingMortgageIndex] = {
          ...result.liabilities.mortgages[existingMortgageIndex],
          ...extractedData.mortgage
        };
      } else {
        result.liabilities.mortgages.push(extractedData.mortgage);
      }
    }
  } 
  else if (documentType === "w2" || documentType === "paystub") {
    // Update employment information
    if (extractedData.employment) {
      if (!result.employment.employers) result.employment.employers = [];
      
      // Check if this employer already exists
      const existingEmployerIndex = result.employment.employers.findIndex(
        (e: any) => e.name === extractedData.employment.name
      );
      
      if (existingEmployerIndex >= 0) {
        result.employment.employers[existingEmployerIndex] = {
          ...result.employment.employers[existingEmployerIndex],
          ...extractedData.employment
        };
      } else {
        result.employment.employers.push(extractedData.employment);
      }
    }
    
    // Update income information
    if (extractedData.income) {
      result.income = { ...result.income, ...extractedData.income };
    }
  } 
  else if (documentType === "1003") {
    // For a 1003 form, we can potentially update all sections
    if (extractedData.borrower) {
      result.borrower = { ...result.borrower, ...extractedData.borrower };
    }
    if (extractedData.property) {
      result.property = { ...result.property, ...extractedData.property };
    }
    if (extractedData.employment) {
      result.employment = { ...result.employment, ...extractedData.employment };
    }
    if (extractedData.income) {
      result.income = { ...result.income, ...extractedData.income };
    }
    if (extractedData.assets) {
      result.assets = { ...result.assets, ...extractedData.assets };
    }
    if (extractedData.liabilities) {
      result.liabilities = { ...result.liabilities, ...extractedData.liabilities };
    }
    if (extractedData.declarations) {
      result.declarations = { ...result.declarations, ...extractedData.declarations };
    }
    if (extractedData.housing) {
      result.housing = { ...result.housing, ...extractedData.housing };
    }
    if (extractedData.loan) {
      result.loan = { ...result.loan, ...extractedData.loan };
    }
  }
  else {
    // For unknown document types, try to intelligently determine where data belongs
    // Start with borrower information
    if (extractedData.name || extractedData.firstName || extractedData.lastName || 
        extractedData.email || extractedData.phone || extractedData.address) {
      result.borrower = { 
        ...result.borrower, 
        firstName: extractedData.firstName || extractedData.name?.split(' ')[0] || result.borrower.firstName,
        lastName: extractedData.lastName || 
                 (extractedData.name?.split(' ').length > 1 ? 
                  extractedData.name.split(' ').slice(1).join(' ') : 
                  result.borrower.lastName),
        email: extractedData.email || result.borrower.email,
        phone: extractedData.phone || result.borrower.phone,
        homeAddress: extractedData.address || result.borrower.homeAddress
      };
    }
    
    // Look for income/employment related fields
    if (extractedData.employer || extractedData.income || extractedData.salary || 
        extractedData.wages || extractedData.ytd) {
      // Update employment information
      if (extractedData.employer) {
        if (!result.employment.employers) result.employment.employers = [];
        result.employment.employers.push({
          name: extractedData.employer,
          position: extractedData.position || extractedData.title || "Unknown",
          startDate: extractedData.startDate || "Unknown",
          address: extractedData.employerAddress || "Unknown"
        });
      }
      
      // Update income information
      if (extractedData.income || extractedData.salary || extractedData.wages) {
        result.income.monthlyIncome = extractedData.income || 
                                      extractedData.salary || 
                                      extractedData.wages || 
                                      result.income.monthlyIncome;
      }
    }
    
    // Look for property related fields
    if (extractedData.propertyAddress || extractedData.propertyValue || 
        extractedData.propertyType) {
      result.property = {
        ...result.property,
        address: extractedData.propertyAddress || result.property.address,
        value: extractedData.propertyValue || result.property.value,
        type: extractedData.propertyType || result.property.type
      };
    }
  }
  
  return result;
}
