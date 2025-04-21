
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// OpenAI API key for processing documents
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
// Adobe PDF Services credentials
const adobeClientId = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_ID') || '';
const adobeClientSecret = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_SECRET') || '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrls, leadId } = await req.json();
    
    if (!fileUrls || !Array.isArray(fileUrls) || fileUrls.length === 0) {
      throw new Error('No file URLs provided');
    }
    
    if (!leadId) {
      throw new Error('No lead ID provided');
    }

    console.log(`Processing ${fileUrls.length} documents for lead ${leadId}`);

    // Step 1: Extract data from uploaded documents
    const extractedDocData = await processDocuments(fileUrls);
    
    // Step 2: Use OpenAI to analyze the extracted data and map to 1003 fields
    const processedFormData = await analyzeDataWithOpenAI(extractedDocData);
    
    // Step 3: Update lead with the extracted mortgage data
    await updateLeadWithFormData(leadId, processedFormData);
    
    // Return success response with identified fields and missing fields
    return new Response(
      JSON.stringify({
        success: true,
        processedFields: processedFormData.processedFields,
        missingFields: processedFormData.missingFields,
        message: 'Documents processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in smart-1003-builder function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

/**
 * Process documents using Adobe PDF Services API
 */
async function processDocuments(fileUrls) {
  try {
    console.log(`Processing ${fileUrls.length} documents with Adobe PDF Services`);
    
    const extractedDataArray = [];
    
    // If we have Adobe credentials, use PDF Services API
    if (adobeClientId && adobeClientSecret) {
      // Get access token for Adobe PDF Services
      const tokenResponse = await fetch('https://pdf-services.adobe.io/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          'client_id': adobeClientId,
          'client_secret': adobeClientSecret
        })
      });
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to get Adobe PDF Services token');
      }
      
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      
      // Process each document
      for (const fileUrl of fileUrls) {
        // For data URLs (base64), we need to decode and extract the binary data
        let pdfBuffer;
        
        if (fileUrl.startsWith('data:')) {
          // Extract base64 content from data URL
          const base64String = fileUrl.split(',')[1];
          pdfBuffer = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));
        } else {
          // For regular URLs, fetch the file
          const fileResponse = await fetch(fileUrl);
          pdfBuffer = new Uint8Array(await fileResponse.arrayBuffer());
        }
        
        // 1. Upload PDF to Adobe cloud
        const uploadResponse = await fetch('https://pdf-services.adobe.io/assets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-API-Key': adobeClientId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ mediaType: 'application/pdf' })
        });
        
        const uploadData = await uploadResponse.json();
        const { uploadUri, assetID } = uploadData;
        
        // Upload the actual PDF
        await fetch(uploadUri, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/pdf' },
          body: pdfBuffer
        });
        
        // 2. Start extraction job
        const extractResponse = await fetch('https://pdf-services.adobe.io/operation/extractpdf', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-API-Key': adobeClientId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            assetID,
            elementsToExtract: ['text', 'tables']
          })
        });
        
        const location = extractResponse.headers.get('location');
        if (!location) {
          throw new Error('Adobe PDF Services did not return extraction job location');
        }
        
        // 3. Poll for job completion
        let extractedData = null;
        let attempt = 0;
        const maxAttempts = 30;
        
        while (!extractedData && attempt < maxAttempts) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          
          const statusResponse = await fetch(location, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'X-API-Key': adobeClientId
            }
          });
          
          if (!statusResponse.ok) {
            continue;
          }
          
          const statusData = await statusResponse.json();
          
          if (statusData.status === 'done') {
            // Get the downloadUri for content
            const downloadUri = statusData.content?.downloadUri;
            
            if (downloadUri) {
              const contentResponse = await fetch(downloadUri);
              const contentData = await contentResponse.json();
              extractedData = contentData;
            }
          } else if (statusData.status === 'failed') {
            throw new Error('Adobe PDF Services extraction failed');
          }
        }
        
        if (!extractedData) {
          throw new Error('PDF extraction timed out');
        }
        
        extractedDataArray.push(extractedData);
      }
    } else {
      // Fallback to OpenAI for document analysis if Adobe credentials are not available
      for (const fileUrl of fileUrls) {
        let fileContent;
        
        if (fileUrl.startsWith('data:')) {
          // Extract base64 content from data URL
          const base64String = fileUrl.split(',')[1];
          fileContent = base64String;
        } else {
          // For regular URLs, fetch the file and convert to base64
          const fileResponse = await fetch(fileUrl);
          const buffer = await fileResponse.arrayBuffer();
          fileContent = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        }
        
        // Use OpenAI's PDF understanding capabilities
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'You are a document processing assistant specializing in extracting structured data from mortgage and financial documents.'
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text', 
                    text: 'Extract all text content from this PDF document and structure it into sections.'
                  }
                ]
              }
            ],
            max_tokens: 4000
          })
        });
        
        const openaiData = await openaiResponse.json();
        const extractedText = openaiData?.choices?.[0]?.message?.content || '';
        
        extractedDataArray.push({
          content: { text: extractedText },
          source: 'openai-extraction'
        });
      }
    }
    
    return extractedDataArray;
  } catch (error) {
    console.error('Error processing documents:', error);
    throw new Error(`Document processing failed: ${error.message}`);
  }
}

/**
 * Analyze extracted document data with OpenAI to map to 1003 form fields
 */
async function analyzeDataWithOpenAI(extractedDocData) {
  try {
    console.log('Analyzing extracted data with OpenAI');
    
    // Compile all extracted text to send to OpenAI
    let combinedText = '';
    
    for (const doc of extractedDocData) {
      // Handle Adobe PDF Services extraction format
      if (doc.elements) {
        for (const element of doc.elements) {
          if (element.Text) {
            combinedText += element.Text + '\n';
          } else if (element.Path) {
            // Handle tables or other structured content
            combinedText += `Table or structured content detected\n`;
          }
        }
      }
      // Handle OpenAI extraction format
      else if (doc.content?.text) {
        combinedText += doc.content.text + '\n';
      }
    }
    
    // Prepare prompt for OpenAI with all possible 1003 form fields
    const formFieldsMap = `
    Form 1003 Field Mapping Guide:
    
    # Borrower Information
    - borrower.firstName: First name of the borrower
    - borrower.lastName: Last name of the borrower
    - borrower.ssn: Social Security Number (format: XXX-XX-XXXX)
    - borrower.dob: Date of Birth (format: YYYY-MM-DD)
    - borrower.phoneNumber: Primary phone number
    - borrower.email: Email address
    - borrower.maritalStatus: Marital status (Single, Married, Separated, etc.)
    - borrower.citizenship: Citizenship status
    - borrower.dependents: Number of dependents
    - borrower.mailingAddress: Current mailing address
    
    # Employment & Income
    - employment.employerName: Current employer name
    - employment.position: Job title/position
    - employment.yearsAtJob: Years at current job (numeric)
    - employment.monthlyIncome: Monthly income (numeric)
    - employment.employerAddress: Employer address
    - employment.employmentType: Type of employment (Full-time, Part-time, Self-employed, etc.)
    - employment.industry: Industry sector
    - employment.employerPhone: Employer phone number
    - employment.isSelfEmployed: Whether borrower is self-employed (true/false)
    - employment.isFamilyMember: Whether employer is a family member (true/false)
    - employment.previousEmployment: Previous employment history
    
    # Assets
    - assets: Array of asset objects with the following fields
      - accountType: Type of account (Checking, Savings, etc.)
      - bankName: Name of financial institution
      - accountNumber: Account number (last 4 digits)
      - balance: Current balance (numeric)
    - assets.investments: Details about investment accounts
    
    # Liabilities
    - liabilities.creditCards: Credit card accounts and balances
    - liabilities.loans: Outstanding loan information
    - liabilities.carLoans: Car loan information
    - liabilities.studentLoans: Student loan information
    - liabilities.otherDebts: Information about other debts/liabilities
    
    # Property Information
    - property.address: Property street address
    - property.city: Property city
    - property.state: Property state
    - property.zipCode: Property ZIP code
    - property.estimatedValue: Estimated property value (numeric)
    - property.propertyType: Type of property
    - property.occupancy: Occupancy status
    
    # Loan Information
    - loan.purpose: Purpose of the loan
    - loan.loanAmount: Requested loan amount
    - loan.loanType: Type of loan
    - loan.mortgageTerm: Term of mortgage in years
    - loan.amortizationType: Type of amortization
    - loan.interestRate: Interest rate
    `;
    
    const analyzedData = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant specialized in analyzing mortgage and financial documents to extract information for a 1003 mortgage application form. 
            Extract as much relevant information as possible from the provided documents and map it to the appropriate 1003 form fields. 
            Return your response as a JSON object with two main sections:
            1. "processedFields": An object containing all the extracted fields organized by section (borrower, employment, assets, liabilities, property)
            2. "missingFields": An array of objects identifying fields that couldn't be found in the documents, each with section, field, and label properties
            
            ${formFieldsMap}`
          },
          {
            role: 'user',
            content: `Analyze the following extracted document text and extract all relevant information for a 1003 mortgage application form:\n\n${combinedText}`
          }
        ],
        response_format: { type: "json_object" }
      })
    });
    
    const openaiResult = await analyzedData.json();
    if (!openaiResult.choices || openaiResult.choices.length === 0) {
      throw new Error('Invalid response from OpenAI');
    }
    
    const extractedFormData = JSON.parse(openaiResult.choices[0].message.content);
    
    return extractedFormData;
  } catch (error) {
    console.error('Error analyzing data with OpenAI:', error);
    throw new Error(`Data analysis failed: ${error.message}`);
  }
}

/**
 * Update lead with extracted form data
 */
async function updateLeadWithFormData(leadId, formData) {
  try {
    console.log(`Updating lead ${leadId} with extracted form data`);
    
    // Extract the processed fields to update in the lead
    const { processedFields, missingFields } = formData;
    
    // Add metadata about the processing
    const mortgageData = {
      ...processedFields,
      autoFilledAt: new Date().toISOString(),
      documentProcessing: {
        status: 'completed',
        missingFields: missingFields
      }
    };
    
    // Update the lead using the update-lead function
    const updateLeadUrl = `${supabaseUrl}/functions/v1/update-lead`;
    const response = await fetch(updateLeadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        leadId,
        leadData: { mortgageData }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update lead: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating lead:', error);
    throw new Error(`Failed to update lead data: ${error.message}`);
  }
}
