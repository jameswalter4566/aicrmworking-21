import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { extract1003Data } from './extract1003.ts';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { fileUrl, fileName, leadId, preserveMortgageStatus = true } = await req.json();

    if (!fileUrl || !leadId) {
      throw new Error('File URL and Lead ID are required');
    }

    console.log(`Processing document for lead ${leadId}: ${fileName}`);
    console.log(`File URL: ${fileUrl}`);
    console.log(`Preserve mortgage status: ${preserveMortgageStatus}`);

    // Extract JWT token from Authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
        console.log(`Request authenticated from user: ${userId}`);
      }
    }

    // If preserveMortgageStatus is true, we need to first fetch existing lead data
    let currentLeadData = null;
    if (preserveMortgageStatus) {
      const { data: existingLead, error: fetchError } = await supabase
        .from('leads')
        .select('is_mortgage_lead, added_to_pipeline_at')
        .eq('id', leadId)
        .single();
      
      if (!fetchError && existingLead) {
        currentLeadData = existingLead;
        console.log('Current lead mortgage status:', currentLeadData.is_mortgage_lead);
        console.log('Current lead pipeline timestamp:', currentLeadData.added_to_pipeline_at);
      }
    }

    // Download the PDF file
    console.log('Downloading PDF file...');
    const fileResponse = await fetch(fileUrl);
    
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }
    
    const fileBuffer = await fileResponse.arrayBuffer();
    console.log(`File downloaded: ${fileBuffer.byteLength} bytes`);

    // Extract data from the PDF
    console.log('Extracting data from PDF...');
    const extractedData = await extract1003Data(fileBuffer);
    
    if (!extractedData) {
      throw new Error('Failed to extract data from PDF');
    }
    
    console.log('Data extracted successfully');

    // Record the document in the documents table
    const documentRecord = {
      lead_id: leadId,
      file_name: fileName,
      file_url: fileUrl,
      document_type: '1003',
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
      status: 'processed'
    };

    const { error: documentError } = await supabase
      .from('documents')
      .insert(documentRecord);

    if (documentError) {
      console.error('Error recording document:', documentError.message);
      // Continue even if document recording fails
    }

    // Update the lead with the extracted data
    const updateData: any = {
      mortgage_data: extractedData,
      updated_at: new Date().toISOString()
    };

    // Preserve mortgage lead status if requested
    if (preserveMortgageStatus && currentLeadData) {
      updateData.is_mortgage_lead = currentLeadData.is_mortgage_lead;
      
      if (currentLeadData.added_to_pipeline_at) {
        updateData.added_to_pipeline_at = currentLeadData.added_to_pipeline_at;
      }
    }

    // Update personal information if available
    if (extractedData.borrower?.data?.personalInfo) {
      const personalInfo = extractedData.borrower.data.personalInfo;
      
      if (personalInfo.firstName) {
        updateData.first_name = personalInfo.firstName;
      }
      
      if (personalInfo.lastName) {
        updateData.last_name = personalInfo.lastName;
      }
    }

    // Update contact information if available
    if (extractedData.borrower?.data?.contactDetails) {
      const contactDetails = extractedData.borrower.data.contactDetails;
      
      if (contactDetails.emailAddress) {
        updateData.email = contactDetails.emailAddress;
      }
      
      if (contactDetails.cellPhoneNumber) {
        updateData.phone1 = contactDetails.cellPhoneNumber;
      }
      
      if (contactDetails.homePhoneNumber && !contactDetails.cellPhoneNumber) {
        updateData.phone1 = contactDetails.homePhoneNumber;
      } else if (contactDetails.homePhoneNumber) {
        updateData.phone2 = contactDetails.homePhoneNumber;
      }
    }

    // Update property address if available
    if (extractedData.property?.propertyAddress) {
      updateData.property_address = extractedData.property.propertyAddress;
    }

    console.log('Updating lead with extracted data');
    console.log('Mortgage status being preserved:', updateData.is_mortgage_lead);

    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update lead: ${updateError.message}`);
    }

    // Record activity
    const activityData = {
      lead_id: leadId,
      type: 'Document Processing',
      description: `Smart 1003 Builder processed document: ${fileName}`,
      timestamp: new Date().toISOString()
    };

    await supabase
      .from('lead_activities')
      .insert(activityData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Document processed successfully',
        data: {
          leadId,
          extractedFields: Object.keys(extractedData).length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in smart-1003-builder function: ${error.message}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
