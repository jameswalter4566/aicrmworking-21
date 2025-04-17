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

async function generateTextContent(content: string): Promise<Uint8Array> {
  // Convert text content to a Uint8Array for upload
  const encoder = new TextEncoder();
  return encoder.encode(content);
}

async function generateBasicPDF(content: string): Promise<Uint8Array> {
  // Create a very basic PDF using text content
  // This is a simplified approach without using external PDF libraries
  
  // PDF header
  const header = "%PDF-1.7\n";
  
  // Objects
  const objects: string[] = [];
  
  // Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  
  // Pages
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  
  // Page
  objects.push("3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n");
  
  // Font
  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica >>\nendobj\n");
  
  // Content - Here we add the actual letter content
  const lines = content.split("\n").map(line => line.trim());
  const contentStream = lines.map(line => 
    line ? `BT /F1 12 Tf 50 ${700 - (lines.indexOf(line) * 15)} Td (${line.replace(/[()\\]/g, "\\$&")}) Tj ET` : ""
  ).join("\n");
  
  objects.push(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`);
  
  // Cross-reference table
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  let offset = header.length;
  
  for (const obj of objects) {
    xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    offset += obj.length;
  }
  
  // Trailer
  const trailer = "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + offset + "\n%%EOF";
  
  // Combine everything
  const pdf = header + objects.join("") + xref + trailer;
  
  // Convert to Uint8Array
  const encoder = new TextEncoder();
  return encoder.encode(pdf);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('LOE Generator function called');
    
    const { leadId, conditions } = await req.json();
    
    if (!leadId || !conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid request parameters" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing LOE for lead ID: ${leadId}`);
    console.log(`Conditions to process: ${conditions.length}`);
    
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();
    
    if (leadError) {
      console.error('Error fetching lead data:', leadError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to fetch lead data" 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const results = await Promise.all(conditions.map(async (condition) => {
      const loeType = determineLOEType(condition.text || condition.description);
      const loeContent = generateLOEContent(loeType, lead, condition);
      
      try {
        // Generate PDF content
        const pdfBytes = await generateBasicPDF(loeContent);
        
        const fileName = `LOE_${condition.id}_${Date.now()}.pdf`;
        const filePath = `leads/${leadId}/loe/${fileName}`;
        
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
        
        // After generating the LOE, update the condition with the document URL
        await updateConditionWithDocumentUrl(leadId, condition.id, publicUrl);
        
        return {
          conditionId: condition.id,
          loeType,
          documentUrl: publicUrl,
          success: true
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
    
    console.log('LOE processing completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCount: results.length,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Updates a condition with the document URL in the conditions_data
 */
async function updateConditionWithDocumentUrl(leadId: string, conditionId: string, documentUrl: string) {
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
  
  const borrowerName = `${lead.first_name || 'Borrower'} ${lead.last_name || ''}`;
  const propertyAddress = lead.property_address || 'Subject Property';
  
  let content = `${currentDate}\n\n`;
  content += `To: Loan Underwriter\n`;
  content += `Subject: Letter of Explanation - ${formatLOETypeTitle(loeType)}\n\n`;
  content += `Dear Underwriter,\n\n`;
  
  content += `I am writing in response to the following condition from underwriting:\n\n`;
  content += `"${condition.text || condition.description}"\n\n`;
  
  switch (loeType) {
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
      content += `My legal name is ${borrowerName}, which appears on my government-issued ID `;
      content += `and should be used for all official loan documentation.\n\n`;
      break;
      
    default:
      content += `I would like to clarify that this situation occurred due to specific circumstances that I can explain in detail. `;
      content += `The information provided in my loan application is accurate and complete to the best of my knowledge. `;
      content += `I am committed to providing any additional information or documentation required to process my mortgage application.\n\n`;
  }
  
  content += `Please let me know if you require any additional information or documentation to support this explanation.\n\n`;
  content += `Sincerely,\n\n\n`;
  content += `${borrowerName}\n`;
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
    `${first} ${lastName?.charAt(0)}-${lastName?.charAt(1)}`,
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
