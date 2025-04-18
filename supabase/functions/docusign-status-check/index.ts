import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v2.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// DocuSign configuration - updated base URL to correct endpoint
const docusignBaseUrl = Deno.env.get('DOCUSIGN_BASE_URL') || 'https://account-d.docusign.com';
const docusignAccountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
const docusignIntegrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
const docusignPrivateKey = Deno.env.get('DOCUSIGN_PRIVATE_KEY');
const docusignImpersonatedUserId = Deno.env.get('DOCUSIGN_IMPERSONATED_USER_ID');

/**
 * Gets a DocuSign access token using JWT flow
 */
async function getDocuSignAccessToken() {
  try {
    // Generate proper JWT token
    const jwt = await generateJWT();
    
    console.log(`Requesting token from ${docusignBaseUrl}/oauth/token`);
    
    const response = await fetch(`${docusignBaseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': jwt
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error getting DocuSign access token:', error);
      console.error('Response status:', response.status);
      console.error('Response status text:', response.statusText);
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
 * Properly generates a JWT for DocuSign authentication
 */
async function generateJWT() {
  try {
    // Check if we have all required credentials
    if (!docusignIntegrationKey || !docusignPrivateKey || !docusignImpersonatedUserId) {
      console.error('Missing required DocuSign credentials');
      throw new Error('Missing required DocuSign credentials');
    }
    
    console.log('Generating JWT token for DocuSign authentication');
    
    // Convert PEM to key object for signing
    const privateKey = await importPrivateKey(docusignPrivateKey);
    
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: docusignIntegrationKey,
      sub: docusignImpersonatedUserId,
      iat: now,
      exp: now + (60 * 60), // Token valid for 1 hour
      aud: docusignBaseUrl,
      scope: "signature impersonation"
    };
    
    // Create the JWT
    return await create({ alg: "RS256", typ: "JWT" }, payload, privateKey);
  } catch (error) {
    console.error("Error generating JWT:", error);
    throw new Error(`JWT generation failed: ${error.message}`);
  }
}

/**
 * Import private key from PEM format with robust error handling
 */
async function importPrivateKey(pemRaw: string) {
  try {
    if (!pemRaw) {
      throw new Error("Private key is empty or not provided");
    }
    
    // 1. Restore real line-breaks that were escaped as \n
    const pem = pemRaw.replace(/\\n/g, '\n').trim();
    
    // 2. Accept either PKCS#1 or PKCS#8 header format
    const body = pem
      .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, '')
      .replace(/-----END (RSA )?PRIVATE KEY-----/, '')
      .replace(/\s+/g, '');
    
    if (!body) {
      throw new Error("Private key content is empty after formatting");
    }
    
    console.log("Private key format processed, length:", body.length);
    
    // 3. Convert to ArrayBuffer directly
    const der = Uint8Array.from(atob(body), c => c.charCodeAt(0)).buffer;
    
    // 4. Import - PKCS#8 only!
    return await crypto.subtle.importKey(
      'pkcs8',
      der,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  } catch (error) {
    console.error("Error importing private key:", error);
    
    // Add more specific error info to help debug
    if (error.message && error.message.includes("decode base64")) {
      console.error("This appears to be a base64 decoding issue. Make sure your private key is properly formatted.");
      console.error("Verify your key is in PKCS#8 format and properly escaped in the environment variable.");
    }
    
    throw error;
  }
}

/**
 * Gets the status of an envelope
 */
async function getEnvelopeStatus(envelopeId: string) {
  try {
    const accessToken = await getDocuSignAccessToken();
    
    const apiUrl = `${docusignBaseUrl}/restapi/v2.1/accounts/${docusignAccountId}/envelopes/${envelopeId}`;
    console.log(`Getting envelope status from: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
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
    
    const apiUrl = `${docusignBaseUrl}/restapi/v2.1/accounts/${docusignAccountId}/envelopes/${envelopeId}/documents/combined`;
    console.log(`Downloading signed document from: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
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
            if (leadId) {
              await updateSignedDocumentUrl(leadId, conditionId, publicUrl);
            }
            
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
