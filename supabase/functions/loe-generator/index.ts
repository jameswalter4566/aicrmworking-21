import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from 'https://cdn.skypack.dev/pdf-lib@1.17.1';
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
 * Import private key from PEM format with improved error handling
 */
async function importPrivateKey(pemPrivateKey: string) {
  try {
    if (!pemPrivateKey) {
      throw new Error("Private key is empty or not provided");
    }
    
    // Add header and footer if they're not present
    let formattedKey = pemPrivateKey;
    if (!formattedKey.includes("-----BEGIN PRIVATE KEY-----")) {
      formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
    }
    
    // Clean the private key - remove headers, footers, and newlines
    const pemContent = formattedKey
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/[\r\n\t ]/g, "")
      .trim();
    
    if (!pemContent) {
      throw new Error("Private key content is empty after formatting");
    }
    
    console.log("PEM content length:", pemContent.length);
    
    // Decode the base64 string with improved handling
    const binaryDer = base64ToArrayBuffer(pemContent);
    
    // Import the key
    return await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );
  } catch (error) {
    console.error("Error importing private key:", error);
    throw error;
  }
}

/**
 * Convert base64 to ArrayBuffer - with improved error handling
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  try {
    // Ensure the base64 string is properly padded
    const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    
    // Try standard approach first
    try {
      const binary = atob(paddedBase64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (e) {
      console.error("First attempt at base64 decoding failed:", e);
      
      // Try alternative approach with more aggressive cleaning
      const cleanedBase64 = paddedBase64
        .replace(/[^A-Za-z0-9+/=]/g, '') // Remove any non-base64 chars
        .padEnd(paddedBase64.length + (4 - paddedBase64.length % 4) % 4, '=');
      
      console.log("Attempting with cleaned base64 string");
      
      const binary = atob(cleanedBase64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }
  } catch (error) {
    console.error("All base64 decoding attempts failed:", error);
    throw new Error(`Base64 decoding failed: ${error.message}`);
  }
}

/**
 * Sends a document to DocuSign for signing
 */
async function sendToDocuSign(pdfBytes: Uint8Array, recipientEmail: string, recipientName: string, documentName: string) {
  try {
    // Convert PDF bytes to base64
    const base64Pdf = bufferToBase64(pdfBytes);
    
    // Get access token
    const accessToken = await getDocuSignAccessToken();
    
    // Create envelope definition
    const envelopeDefinition = {
      emailSubject: `Please sign your Letter of Explanation: ${documentName}`,
      documents: [
        {
          documentBase64: base64Pdf,
          name: documentName,
          fileExtension: "pdf",
          documentId: "1"
        }
      ],
      recipients: {
        signers: [
          {
            email: recipientEmail,
            name: recipientName,
            recipientId: "1",
            routingOrder: "1",
            tabs: {
              signHereTabs: [
                {
                  // Place signature at the end of the document
                  // In a production environment, you'd want to be more precise
                  anchorString: "Sincerely,",
                  anchorYOffset: "20",
                  anchorUnits: "pixels",
                  anchorXOffset: "0"
                }
              ]
            }
          }
        ]
      },
      status: "sent" // Send immediately
    };
    
    console.log("Preparing DocuSign envelope for recipient:", recipientEmail);
    
    const apiUrl = `${docusignBaseUrl}/restapi/v2.1/accounts/${docusignAccountId}/envelopes`;
    console.log(`Sending envelope to DocuSign API: ${apiUrl}`);
    
    // Send the envelope
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(envelopeDefinition)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Error sending envelope to DocuSign:', error);
      console.error('Response status:', response.status);
      console.error('Response status text:', response.statusText);
      throw new Error(`Failed to send envelope: ${error}`);
    }
    
    const result = await response.json();
    return {
      envelopeId: result.envelopeId,
      status: result.status
    };
  } catch (error) {
    console.error('Error in sendToDocuSign:', error);
    throw error;
  }
}

/**
 * Convert Uint8Array to base64 string
 */
function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

async function generatePDF(content: string): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Add a new page
  const page = pdfDoc.addPage([612, 792]); // Letter size
  
  // Get the font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const lineHeight = 14;
  
  // Set margins
  const margin = {
    top: 50,
    left: 50,
    right: 50,
    bottom: 50
  };

  // Split content into lines
  const lines = content.split('\n');
  let y = page.getHeight() - margin.top;

  // Draw content
  for (const line of lines) {
    if (y < margin.bottom) {
      // Add new page if we run out of space
      y = page.getHeight() - margin.top;
      page = pdfDoc.addPage([612, 792]);
    }

    if (line.trim()) {
      page.drawText(line.trim(), {
        x: margin.left,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }
    y -= lineHeight;
  }

  // Save the PDF
  return await pdfDoc.save();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('LOE Generator function called');
    
    const { leadId, conditions, sendForSignature = false, recipientEmail, recipientName } = await req.json();
    
    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing conditions parameter" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing LOE for lead ID: ${leadId || 'not provided'}`);
    console.log(`Conditions to process: ${conditions.length}`);
    console.log(`Send for signature: ${sendForSignature}`);
    
    let lead = null;
    
    if (leadId) {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching lead data:', error);
        // Continue without lead data - we'll use provided recipient info if available
      } else {
        lead = data;
      }
    }
    
    const results = await Promise.all(conditions.map(async (condition) => {
      const loeType = determineLOEType(condition.text || condition.description);
      
      // Create a safe version of lead data with default values for required fields
      const safeLead = lead || {};
      const loeContent = generateLOEContent(loeType, safeLead, condition);
      
      try {
        // Generate PDF content using our PDF generator
        const pdfBytes = await generatePDF(loeContent);
        
        const fileName = `LOE_${condition.id}_${Date.now()}.pdf`;
        const filePath = leadId ? `leads/${leadId}/loe/${fileName}` : `loe/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('borrower-documents')
          .upload(filePath, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true
          });
          
        if (uploadError) {
          console.error('Error uploading PDF file:', uploadError);
          throw new Error('Failed to upload LOE PDF file');
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('borrower-documents')
          .getPublicUrl(filePath);
        
        let docusignResult = null;
        let docusignError = null;
        
        // If sendForSignature is true and we have recipient info, send to DocuSign
        if (sendForSignature) {
          try {
            if (!docusignAccountId || !docusignIntegrationKey || !docusignPrivateKey) {
              console.warn('DocuSign credentials not configured, skipping signature request');
              docusignError = "DocuSign credentials not configured";
            } else {
              // Use explicitly provided recipient email/name, or fallback safely
              const signerEmail = recipientEmail || '';
              
              // Create a safe recipient name, ensuring we don't try to access properties of undefined
              const signerName = recipientName || 'Borrower';
                
              if (!signerEmail) {
                throw new Error("Missing recipient email address for DocuSign");
              }
              
              console.log('Sending document to DocuSign for signature to:', signerEmail);
              
              try {
                docusignResult = await sendToDocuSign(
                  pdfBytes,
                  signerEmail,
                  signerName,
                  `Letter of Explanation - ${formatLOETypeTitle(loeType)}`
                );
                
                console.log('DocuSign envelope created:', docusignResult);
                
                // Store the envelope ID and status in the database
                if (leadId) {
                  await supabase.from('docusign_envelopes')
                    .insert({
                      lead_id: leadId,
                      condition_id: condition.id,
                      envelope_id: docusignResult.envelopeId,
                      status: docusignResult.status,
                      document_name: fileName,
                      document_url: publicUrl
                    });
                }
              } catch (docuSignSendError) {
                // Capture the DocuSign error but still return the document URL
                docusignError = `DocuSign error: ${docuSignSendError.message}`;
                console.error('Error sending document to DocuSign:', docuSignSendError);
              }
            }
          } catch (docusignError) {
            console.error('Error sending document to DocuSign:', docusignError);
            // Don't rethrow - we want to return the generated document URL even if DocuSign fails
          }
        }
        
        // After generating the LOE, update the condition with the document URL
        if (leadId) {
          await updateConditionWithDocumentUrl(leadId, condition.id, publicUrl, docusignResult?.envelopeId);
        }
        
        // We still return success:true even if DocuSign failed
        // The client can handle the DocuSign error and still show the generated document
        return {
          conditionId: condition.id,
          loeType,
          documentUrl: publicUrl,
          docusign: docusignResult,
          error: docusignError, // Include the DocuSign error if any
          success: !docusignError // Success is true if there's no DocuSign error
        };
      } catch (error) {
        console.error(`Error generating PDF for condition ${condition.id}:`, error);
        return {
          conditionId: condition.id,
          loeType,
          success: false,
          error: error.message
        };
      }
    }));
    
    // We consider the overall operation successful if we at least generated documents
    const isOverallSuccess = results.some(result => result.documentUrl);
    
    console.log('LOE processing completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: isOverallSuccess, 
        processedCount: results.length,
        results
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error('Error in LOE generator function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "An unknown error occurred" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

/**
 * Updates a condition with the document URL in the conditions_data
 */
async function updateConditionWithDocumentUrl(leadId: string, conditionId: string, documentUrl: string, envelopeId?: string) {
  try {
    // First, fetch the current conditions
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
        // Update the condition with the document URL
        conditionsData[category][conditionIndex].documentUrl = documentUrl;
        
        // If we have a DocuSign envelope ID, add it
        if (envelopeId) {
          conditionsData[category][conditionIndex].docuSignEnvelopeId = envelopeId;
          conditionsData[category][conditionIndex].docuSignStatus = 'sent';
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
        console.error('Error updating condition with document URL:', updateError);
      } else {
        console.log(`Successfully updated condition ${conditionId} with document URL`);
      }
    } else {
      console.log(`Could not find condition ${conditionId} in conditions data`);
    }
  } catch (err) {
    console.error('Error in updateConditionWithDocumentUrl:', err);
  }
}

/**
 * Determines the type of LOE from the condition text
 */
function determineLOEType(conditionText: string): string {
  const text = (conditionText || '').toLowerCase();
  
  if (text.includes('credit inquiry') || text.includes('credit inquiries')) {
    return 'credit_inquiry';
  }
  
  if (text.includes('large deposit') || text.includes('deposits')) {
    return 'large_deposit';
  }
  
  if (text.includes('employment gap') || text.includes('job gap') || text.includes('employment history')) {
    return 'employment_gap';
  }
  
  if (text.includes('late payment') || text.includes('delinquency') || text.includes('missed payment')) {
    return 'late_payment';
  }
  
  if (text.includes('address') || text.includes('residence')) {
    return 'address_discrepancy';
  }
  
  if (text.includes('name') || text.includes('alias')) {
    return 'name_variation';
  }
  
  return 'general';
}

/**
 * Generates LOE content based on type and borrower data
 */
function generateLOEContent(loeType: string, lead: any, condition: any): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Safely construct borrower name with fallbacks
  const firstName = lead.first_name || 'Borrower';
  const lastName = lead.last_name || '';
  const borrowerName = `${firstName} ${lastName}`.trim();
  
  const propertyAddress = lead.property_address || 'Subject Property';
  
  let content = `${currentDate}\n\n`;
  content += `To: Loan Underwriter\n`;
  content += `Subject: Letter of Explanation - ${formatLOETypeTitle(loeType)}\n\n`;
  content += `Dear Underwriter,\n\n`;
  
  content += `I am writing in response to the following condition from underwriting:\n\n`;
  content += `"${condition.text || condition.description}"\n\n`;
  
  switch(loeType) {
    case 'credit_inquiry':
      content += `I am writing to explain the recent credit inquiries on my credit report. `;
      content += `These inquiries were made as part of my research to find the best rates for ${getRandomCreditInquiryReason()}. `;
      content += `I ultimately decided to proceed with only one of these options and did not open multiple new accounts. `;
      content += `Please be assured that I have not taken on any additional debt that is not reflected in my credit report.\n\n`;
      break;
      
    case 'large_deposit':
      content += `I am writing to explain the large deposit of $${getRandomAmount(1000, 10000)} that appeared in my bank statement. `;
      content += `This deposit represents ${getRandomLargeDepositSource()} and is not a loan or gift requiring repayment. `;
      content += `I have maintained proper documentation of this transaction and can provide additional evidence if required.\n\n`;
      break;
      
    case 'employment_gap':
      content += `I am writing to explain the gap in my employment history from ${getRandomPastDate(12, 18)} to ${getRandomPastDate(3, 6)}. `;
      content += `During this period, I ${getRandomEmploymentGapReason()}. `;
      content += `I have since secured stable employment with ${lead.mortgage_data?.basicInfo?.employer || 'my current employer'} `;
      content += `and my position remains secure with a steady income stream.\n\n`;
      break;
      
    case 'late_payment':
      content += `I am writing to explain the late payment on my ${getRandomAccount()} that occurred on ${getRandomPastDate(3, 24)}. `;
      content += `This late payment was due to ${getRandomLatePaymentReason()} and does not reflect my typical financial behavior. `;
      content += `I have maintained a good payment history before and after this isolated incident, `;
      content += `and have taken steps to ensure this situation will not occur again by ${getRandomPreventativeMeasure()}.\n\n`;
      break;
      
    case 'address_discrepancy':
      content += `I am writing to explain the discrepancy in my address history. `;
      content += `The address listed as ${getRandomAddress()} appears on my records due to ${getRandomAddressDiscrepancyReason()}. `;
      content += `My current permanent address is ${lead.mailing_address || propertyAddress}, `;
      content += `and all correspondence should be sent there.\n\n`;
      break;
      
    case 'name_variation':
      content += `I am writing to explain the variation in my name that appears on some documents. `;
      content += `The name "${getRandomNameVariation(lead.first_name, lead.last_name)}" appears due to ${getRandomNameVariationReason()}. `;
      content += `My legal name is ${borrowerName || 'the name on my government-issued ID'}, which appears on my government-issued ID `;
      content += `and should be used for all official loan documentation.\n\n`;
      break;
      
    default:
      content += `I would like to clarify that this situation occurred due to specific circumstances that I can explain in detail. `;
      content += `The information provided in my loan application is accurate and complete to the best of my knowledge. `;
      content += `I am committed to providing any additional information or documentation required to process my mortgage application.\n\n`;
  }
  
  content += `Please let me know if you require any additional information or documentation to support this explanation.\n\n`;
  content += `Sincerely,\n\n\n`;
  content += `${borrowerName || 'Borrower'}\n`;
  content += `${lead.phone1 || ''}\n`;
  content += `${lead.email || ''}`;
  
  return content;
}

/**
 * Format LOE type as a readable title
 */
function formatLOETypeTitle(loeType: string): string {
  switch (loeType) {
    case 'credit_inquiry': return 'Credit Inquiries';
    case 'large_deposit': return 'Large Deposit';
    case 'employment_gap': return 'Employment Gap';
    case 'late_payment': return 'Late Payment';
    case 'address_discrepancy': return 'Address Discrepancy';
    case 'name_variation': return 'Name Variation';
    default: return 'Requested Information';
  }
}

// Helper functions for generating realistic mock content
function getRandomCreditInquiryReason(): string {
  const reasons = [
    'a new auto loan',
    'refinancing options',
    'a personal loan',
    'credit card offers',
    'a home equity line of credit',
    'student loan refinancing'
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function getRandomAmount(min: number, max: number): string {
  const amount = Math.floor(Math.random() * (max - min + 1)) + min;
  return amount.toLocaleString('en-US');
}

function getRandomLargeDepositSource(): string {
  const sources = [
    'proceeds from the sale of my vehicle',
    'a tax refund',
    'a bonus from my employer',
    'proceeds from selling personal property',
    'an inheritance from a family member',
    'funds transferred from my personal savings account'
  ];
  return sources[Math.floor(Math.random() * sources.length)];
}

function getRandomPastDate(minMonthsAgo: number, maxMonthsAgo: number): string {
  const now = new Date();
  const monthsAgo = Math.floor(Math.random() * (maxMonthsAgo - minMonthsAgo + 1)) + minMonthsAgo;
  const pastDate = new Date(now.setMonth(now.getMonth() - monthsAgo));
  return pastDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getRandomEmploymentGapReason(): string {
  const reasons = [
    'was furthering my education by attending courses in my field',
    'was caring for an ill family member who has since recovered',
    'relocated to a new city and was searching for suitable employment',
    'was completing a professional certification program',
    'took time off to raise my children who are now in school',
    'was recovering from a medical condition that has been fully resolved'
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function getRandomAccount(): string {
  const accounts = [
    'credit card account',
    'auto loan',
    'mortgage payment',
    'student loan',
    'personal loan',
    'utility bill'
  ];
  return accounts[Math.floor(Math.random() * accounts.length)];
}

function getRandomLatePaymentReason(): string {
  const reasons = [
    'an unexpected medical emergency',
    'a temporary mail delivery issue that delayed my payment',
    'a banking error that has since been resolved',
    'a temporary technical issue with my online banking portal',
    'an oversight during a period of travel',
    'a brief financial hardship that has since been resolved'
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function getRandomPreventativeMeasure(): string {
  const measures = [
    'setting up automatic payments',
    'creating calendar reminders for due dates',
    'maintaining a larger emergency fund',
    'enrolling in paperless statements and notifications',
    'using a dedicated bill payment app',
    'reorganizing my monthly budget to prioritize loan payments'
  ];
  return measures[Math.floor(Math.random() * measures.length)];
}

function getRandomAddress(): string {
  const addresses = [
    '123 Previous Street, Anytown, ST 12345',
    '456 Former Avenue, Othertown, ST 67890',
    '789 Old Road, Somewhere, ST 13579',
    'PO Box 246, Mailtown, ST 24680'
  ];
  return addresses[Math.floor(Math.random() * addresses.length)];
}

function getRandomAddressDiscrepancyReason(): string {
  const reasons = [
    'a temporary relocation for work',
    'the use of a family member\'s address while transitioning between residences',
    'a previous residence I forgot to update with all institutions',
    'an error in data entry by a previous creditor',
    'the use of a secondary mailing address during a renovation period',
    'an old address that remained in some systems after I moved'
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function getRandomNameVariation(firstName?: string, lastName?: string): string {
  const first = firstName || 'John';
  const last = lastName || 'Doe';
  
  const variations = [
    `${first.charAt(0)}. ${last}`,
    `${first} ${last.charAt(0)}.`,
    `${first.substring(0, first.length-1)}y ${last}`,
    `${first} ${last?.charAt(0)}-${last?.charAt(1) || ''}`,
    `${firstName || 'Jane'} ${lastName || 'Smith'} (née ${randomLastName()})`,
    `${firstName || 'J.'} ${lastName || 'D.'}`
  ];
  return variations[Math.floor(Math.random() * variations.length)];
}

function randomLastName(): string {
  const lastNames = ['Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis'];
  return lastNames[Math.floor(Math.random() * lastNames.length)];
}

function getRandomNameVariationReason(): string {
  const reasons = [
    'the use of a nickname on some documents',
    'a clerical error on a previous application',
    'my maiden name being used on older accounts',
    'a shortened version of my name I sometimes use',
    'a legal name change that was in process',
    'an abbreviation used on informal documents'
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}
