import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// DocuSign configuration
const docusignBaseUrl = Deno.env.get('DOCUSIGN_BASE_URL') || 'https://demo.docusign.net';
const docusignAccountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
const docusignIntegrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
const docusignPrivateKey = Deno.env.get('DOCUSIGN_PRIVATE_KEY');
const docusignImpersonatedUserId = Deno.env.get('DOCUSIGN_IMPERSONATED_USER_ID');

/**
 * Gets a DocuSign access token using JWT flow
 */
async function getDocuSignAccessToken() {
  try {
    const response = await fetch(`${docusignBaseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': generateJWT()
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error getting DocuSign access token:', error);
      throw new Error(`Failed to get DocuSign token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error in getDocuSignAccessToken:', error);
    throw error;
  }
}

/**
 * Generates a JWT for DocuSign authentication
 */
function generateJWT() {
  // This is a simplified version - in production use a proper JWT library
  console.log("Would generate JWT with integration key and private key");
  return "WOULD_BE_A_REAL_JWT";
}

/**
 * Gets the status of an envelope
 */
async function getEnvelopeStatus(envelopeId: string) {
  try {
    const accessToken = await getDocuSignAccessToken();
    
    const response = await fetch(`${docusignBaseUrl}/restapi/v2.1/accounts/${docusignAccountId}/envelopes/${envelopeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get envelope status: ${error}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error getting status for envelope ${envelopeId}:`, error);
    throw error;
  }
}

/**
 * Downloads the signed document
 */
async function downloadSignedDocument(envelopeId: string) {
  try {
    const accessToken = await getDocuSignAccessToken();
    
    const response = await fetch(`${docusignBaseUrl}/restapi/v2.1/accounts/${docusignAccountId}/envelopes/${envelopeId}/documents/combined`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to download signed document: ${error}`);
    }
    
    const pdfBuffer = await response.arrayBuffer();
    return new Uint8Array(pdfBuffer);
  } catch (error) {
    console.error(`Error downloading signed document for envelope ${envelopeId}:`, error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('DocuSign Status Check function called');
    
    const { envelopeId, leadId, conditionId, checkOnly = true } = await req.json();
    
    if (!envelopeId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing envelope ID" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Checking status for envelope: ${envelopeId}`);
    
    // Get envelope status from DocuSign
    let status;
    try {
      const envelopeData = await getEnvelopeStatus(envelopeId);
      status = envelopeData.status;
      
      console.log(`Envelope status: ${status}`);
      
      // Update status in database
      if (leadId && conditionId) {
        await updateDocuSignStatus(leadId, conditionId, status);
      }
      
      // If completed and not just checking, download the signed document
      if (status === 'completed' && !checkOnly && leadId) {
        try {
          console.log('Downloading signed document');
          const signedPdf = await downloadSignedDocument(envelopeId);
          
          // Upload the signed document to storage
          const fileName = `Signed_LOE_${conditionId}_${Date.now()}.pdf`;
          const filePath = `leads/${leadId}/loe/signed/${fileName}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('borrower-documents')
            .upload(filePath, signedPdf, {
              contentType: 'application/pdf',
              upsert: true
            });
            
          if (uploadError) {
            console.error('Error uploading signed PDF:', uploadError);
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('borrower-documents')
              .getPublicUrl(filePath);
            
            // Update the condition with the signed document URL
            await updateSignedDocumentUrl(leadId, conditionId, publicUrl);
            
            return new Response(
              JSON.stringify({
                success: true,
                status,
                signedDocumentUrl: publicUrl
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (downloadError) {
          console.error('Error downloading and storing signed document:', downloadError);
        }
      }
    } catch (statusError) {
      console.error('Error getting envelope status:', statusError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error checking envelope status: ${statusError.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        status
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in DocuSign status check function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "An unknown error occurred" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Updates the DocuSign status for a condition
 */
async function updateDocuSignStatus(leadId: string, conditionId: string, status: string) {
  try {
    // First, update the envelope status in the docusign_envelopes table
    const { error: envelopeError } = await supabase
      .from('docusign_envelopes')
      .update({ status })
      .eq('lead_id', leadId)
      .eq('condition_id', conditionId);
    
    if (envelopeError) {
      console.error('Error updating envelope status:', envelopeError);
    }
    
    // Then, fetch the current conditions
    const { data, error } = await supabase
      .from('loan_conditions')
      .select('conditions_data')
      .eq('lead_id', leadId)
      .single();
    
    if (error) {
      console.error('Error fetching condition data:', error);
      return;
    }
    
    const conditionsData = data.conditions_data;
    
    // Find the condition in any of the condition groups and update it
    const conditionCategories = [
      'masterConditions', 
      'generalConditions', 
      'priorToFinalConditions', 
      'complianceConditions'
    ];
    
    let updated = false;
    
    for (const category of conditionCategories) {
      if (!conditionsData[category]) continue;
      
      const conditions = conditionsData[category];
      const conditionIndex = conditions.findIndex(c => c.id === conditionId);
      
      if (conditionIndex !== -1) {
        // Update the condition with DocuSign status
        conditionsData[category][conditionIndex].docuSignStatus = status;
        
        // If completed, update the condition status
        if (status === 'completed') {
          conditionsData[category][conditionIndex].isCompleted = true;
        }
        
        updated = true;
        break;
      }
    }
    
    if (updated) {
      // Save the updated conditions back to the database
      const { error: updateError } = await supabase
        .from('loan_conditions')
        .update({ conditions_data: conditionsData })
        .eq('lead_id', leadId);
      
      if (updateError) {
        console.error('Error updating condition with DocuSign status:', updateError);
      } else {
        console.log(`Successfully updated condition ${conditionId} with DocuSign status: ${status}`);
      }
    } else {
      console.log(`Could not find condition ${conditionId} in conditions data`);
    }
  } catch (err) {
    console.error('Error in updateDocuSignStatus:', err);
  }
}

/**
 * Updates the condition with the signed document URL
 */
async function updateSignedDocumentUrl(leadId: string, conditionId: string, signedDocumentUrl: string) {
  try {
    // First, update the signed document URL in the docusign_envelopes table
    const { error: envelopeError } = await supabase
      .from('docusign_envelopes')
      .update({ signed_document_url: signedDocumentUrl })
      .eq('lead_id', leadId)
      .eq('condition_id', conditionId);
    
    if (envelopeError) {
      console.error('Error updating signed document URL in envelopes:', envelopeError);
    }
    
    // Then, fetch the current conditions
    const { data, error } = await supabase
      .from('loan_conditions')
      .select('conditions_data')
      .eq('lead_id', leadId)
      .single();
    
    if (error) {
      console.error('Error fetching condition data:', error);
      return;
    }
    
    const conditionsData = data.conditions_data;
    
    // Find the condition in any of the condition groups and update it
    const conditionCategories = [
      'masterConditions', 
      'generalConditions', 
      'priorToFinalConditions', 
      'complianceConditions'
    ];
    
    let updated = false;
    
    for (const category of conditionCategories) {
      if (!conditionsData[category]) continue;
      
      const conditions = conditionsData[category];
      const conditionIndex = conditions.findIndex(c => c.id === conditionId);
      
      if (conditionIndex !== -1) {
        // Update the condition with the signed document URL
        conditionsData[category][conditionIndex].signedDocumentUrl = signedDocumentUrl;
        updated = true;
        break;
      }
    }
    
    if (updated) {
      // Save the updated conditions back to the database
      const { error: updateError } = await supabase
        .from('loan_conditions')
        .update({ conditions_data: conditionsData })
        .eq('lead_id', leadId);
      
      if (updateError) {
        console.error('Error updating condition with signed document URL:', updateError);
      } else {
        console.log(`Successfully updated condition ${conditionId} with signed document URL`);
      }
    } else {
      console.log(`Could not find condition ${conditionId} in conditions data`);
    }
  } catch (err) {
    console.error('Error in updateSignedDocumentUrl:', err);
  }
}
