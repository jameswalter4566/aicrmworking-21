
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

    // Step 1: Extract raw text from documents (mock implementation)
    const extractedData = await mockExtractDataFromDocuments(fileUrls);
    
    // Step 2: Process extracted data with AI to identify 1003 fields (mock implementation)
    const processedFormData = await mockProcessDataForForm(extractedData);
    
    // Step 3: Update lead with the extracted mortgage data
    // Using existing update-lead function
    await updateLeadData(leadId, processedFormData);

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

// Mock function to simulate extracting data from documents
async function mockExtractDataFromDocuments(fileUrls) {
  console.log('Mocking document extraction for', fileUrls);
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return mock extracted data
  return {
    rawText: "Mock extracted text from documents",
    documentTypes: ["Bank Statement", "W2", "Pay Stub"],
    extractionTime: new Date().toISOString()
  };
}

// Mock function to simulate AI processing of extracted data
async function mockProcessDataForForm(extractedData) {
  console.log('Mocking AI processing of extracted data');
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock processed form data
  const mockProcessedData = {
    borrower: {
      firstName: "John",
      lastName: "Doe",
      ssn: "XXX-XX-1234",
      dob: "1980-01-15",
      phoneNumber: "(555) 123-4567",
      email: "john.doe@example.com",
      maritalStatus: "Married"
    },
    employment: {
      employerName: "ACME Corporation",
      position: "Software Engineer",
      yearsAtJob: 5,
      monthlyIncome: 8500
    },
    assets: [
      {
        accountType: "Checking",
        bankName: "First National Bank",
        accountNumber: "XXXX1234",
        balance: 12500.75
      },
      {
        accountType: "Savings", 
        bankName: "First National Bank",
        accountNumber: "XXXX5678",
        balance: 45000.50
      }
    ],
    property: {
      address: "123 Main St",
      city: "Anytown",
      state: "CA",
      zipCode: "12345",
      estimatedValue: 750000
    }
  };
  
  // Mock list of missing fields that couldn't be determined
  const mockMissingFields = [
    { section: "borrower", field: "citizenship", label: "Citizenship Status" },
    { section: "borrower", field: "mailingAddress", label: "Current Mailing Address" },
    { section: "employment", field: "previousEmployment", label: "Previous Employment History" },
    { section: "assets", field: "investments", label: "Investment Accounts" },
    { section: "liabilities", field: "creditCards", label: "Credit Card Accounts" },
    { section: "liabilities", field: "loans", label: "Outstanding Loans" }
  ];
  
  return {
    processedFields: mockProcessedData,
    missingFields: mockMissingFields
  };
}

// Function to update lead data in Supabase
async function updateLeadData(leadId, processedData) {
  // Use the existing update-lead edge function URL
  const updateLeadUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-lead`;
  
  try {
    const response = await fetch(updateLeadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        leadId,
        leadData: {
          mortgageData: {
            ...processedData.processedFields,
            autoFilledAt: new Date().toISOString(),
            documentProcessing: {
              status: 'completed',
              missingFields: processedData.missingFields
            }
          }
        }
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
