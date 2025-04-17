
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('LOE Generator function called');
    
    // Parse request body
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
    
    // Get lead information from database
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
    
    // Process each LOE condition
    const results = await Promise.all(conditions.map(async (condition) => {
      // Determine LOE type from condition text
      const loeType = determineLOEType(condition.text || condition.description);
      
      // Generate appropriate LOE content
      const loeContent = generateLOEContent(loeType, lead, condition);
      
      // In a production environment, we would:
      // 1. Generate a PDF with the content
      // 2. Upload to DocuSign
      // 3. Create envelope and send to borrower
      // 4. Update condition status

      // For now, we'll mock these operations
      const docuSignResult = await mockDocuSignProcess(lead, condition, loeType, loeContent);
      
      return {
        conditionId: condition.id,
        loeType,
        loeContent,
        generatedDocumentUrl: docuSignResult.documentUrl,
        envelopeId: docuSignResult.envelopeId,
        recipientEmail: docuSignResult.recipientEmail,
        sentTimestamp: docuSignResult.sentTimestamp,
        success: true
      };
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
  
  // Header
  let content = `${currentDate}\n\n`;
  content += `To: Loan Underwriter\n`;
  content += `Subject: Letter of Explanation - ${formatLOETypeTitle(loeType)}\n\n`;
  content += `Dear Underwriter,\n\n`;
  
  // Include the FULL condition text verbatim
  content += `I am writing in response to the following condition from underwriting:\n\n`;
  content += `"${condition.text || condition.description}"\n\n`;
  
  // Type-specific content
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
  
  // Closing
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

/**
 * Mock function to simulate PDF generation and DocuSign envelope creation
 * In a production environment, this would be replaced with actual DocuSign API calls
 */
async function mockDocuSignProcess(lead: any, condition: any, loeType: string, loeContent: string) {
  // Add a delay to simulate processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const mockDocumentId = `LOE-${loeType}-${Date.now()}`;
  const mockEnvelopeId = `env-${Date.now()}`;
  
  // In a real implementation, this would:
  // 1. Generate a PDF using a library like pdf-lib or pdfkit
  // 2. Upload to DocuSign
  // 3. Create envelope and add signer (borrower)
  // 4. Send for signature
  
  return {
    documentUrl: `https://example.com/documents/${mockDocumentId}.pdf`,
    envelopeId: mockEnvelopeId,
    recipientEmail: lead.email || 'borrower@example.com',
    sentTimestamp: new Date().toISOString()
  };
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
    `${first} ${lastName}-Smith`,
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
