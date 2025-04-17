
/**
 * Letter of Explanation (LOE) templates and utility functions
 * Used for generating structured content for different types of LOEs
 */

/**
 * Types of Letters of Explanation 
 */
export enum LOEType {
  CREDIT_INQUIRY = 'credit_inquiry',
  LARGE_DEPOSIT = 'large_deposit',
  EMPLOYMENT_GAP = 'employment_gap',
  LATE_PAYMENT = 'late_payment',
  ADDRESS_DISCREPANCY = 'address_discrepancy',
  NAME_VARIATION = 'name_variation',
  GENERAL = 'general'
}

/**
 * Format LOE type as a human-readable title
 */
export function formatLOETypeTitle(loeType: string): string {
  switch (loeType) {
    case LOEType.CREDIT_INQUIRY: return 'Credit Inquiries';
    case LOEType.LARGE_DEPOSIT: return 'Large Deposit';
    case LOEType.EMPLOYMENT_GAP: return 'Employment Gap';
    case LOEType.LATE_PAYMENT: return 'Late Payment';
    case LOEType.ADDRESS_DISCREPANCY: return 'Address Discrepancy';
    case LOEType.NAME_VARIATION: return 'Name Variation';
    default: return 'Requested Information';
  }
}

/**
 * Determine LOE type from condition text
 */
export function determineLOEType(conditionText: string): LOEType {
  const text = (conditionText || '').toLowerCase();
  
  if (text.includes('credit inquiry') || text.includes('credit inquiries')) {
    return LOEType.CREDIT_INQUIRY;
  }
  
  if (text.includes('large deposit') || text.includes('deposits')) {
    return LOEType.LARGE_DEPOSIT;
  }
  
  if (text.includes('employment gap') || text.includes('job gap') || text.includes('employment history')) {
    return LOEType.EMPLOYMENT_GAP;
  }
  
  if (text.includes('late payment') || text.includes('delinquency') || text.includes('missed payment')) {
    return LOEType.LATE_PAYMENT;
  }
  
  if (text.includes('address') || text.includes('residence')) {
    return LOEType.ADDRESS_DISCREPANCY;
  }
  
  if (text.includes('name') || text.includes('alias')) {
    return LOEType.NAME_VARIATION;
  }
  
  return LOEType.GENERAL;
}

/**
 * Interface for LOE generation parameters
 */
export interface LOEParams {
  borrowerName: string;
  propertyAddress?: string;
  conditionText?: string;
  // Type-specific parameters
  creditInquiryReason?: string;
  depositAmount?: number;
  depositSource?: string;
  employmentGapStartDate?: string;
  employmentGapEndDate?: string;
  employmentGapReason?: string;
  latePaymentAccount?: string;
  latePaymentDate?: string;
  latePaymentReason?: string;
  alternateAddress?: string;
  addressDiscrepancyReason?: string;
  nameVariation?: string;
  nameVariationReason?: string;
}

/**
 * Generate LOE content based on type and parameters
 */
export function generateLOEContent(loeType: LOEType, params: LOEParams): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Header
  let content = `${currentDate}\n\n`;
  content += `To: Loan Underwriter\n`;
  content += `Subject: Letter of Explanation - ${formatLOETypeTitle(loeType)}\n\n`;
  content += `Dear Underwriter,\n\n`;
  
  // Type-specific content
  switch (loeType) {
    case LOEType.CREDIT_INQUIRY:
      content += getCreditInquiryContent(params);
      break;
      
    case LOEType.LARGE_DEPOSIT:
      content += getLargeDepositContent(params);
      break;
      
    case LOEType.EMPLOYMENT_GAP:
      content += getEmploymentGapContent(params);
      break;
      
    case LOEType.LATE_PAYMENT:
      content += getLatePaymentContent(params);
      break;
      
    case LOEType.ADDRESS_DISCREPANCY:
      content += getAddressDiscrepancyContent(params);
      break;
      
    case LOEType.NAME_VARIATION:
      content += getNameVariationContent(params);
      break;
      
    default:
      content += getGeneralExplanationContent(params);
  }
  
  // Closing
  content += `\n\nPlease let me know if you require any additional information or documentation to support this explanation.\n\n`;
  content += `Sincerely,\n\n\n`;
  content += `${params.borrowerName}\n`;
  
  return content;
}

function getCreditInquiryContent(params: LOEParams): string {
  return `I am writing to explain the recent credit inquiries on my credit report. ` +
    `These inquiries were made as part of my research to find the best rates for ${params.creditInquiryReason || 'my financial needs'}. ` +
    `I ultimately decided to proceed with only one of these options and did not open multiple new accounts. ` +
    `Please be assured that I have not taken on any additional debt that is not reflected in my credit report.`;
}

function getLargeDepositContent(params: LOEParams): string {
  const amount = params.depositAmount ? 
    `$${params.depositAmount.toLocaleString('en-US')}` : 
    'a large deposit';
  
  return `I am writing to explain ${amount} that appeared in my bank statement. ` +
    `This deposit represents ${params.depositSource || 'funds from a legitimate source'} and is not a loan or gift requiring repayment. ` +
    `I have maintained proper documentation of this transaction and can provide additional evidence if required.`;
}

function getEmploymentGapContent(params: LOEParams): string {
  const dateRange = params.employmentGapStartDate && params.employmentGapEndDate ? 
    `from ${params.employmentGapStartDate} to ${params.employmentGapEndDate}` :
    'in my employment history';
  
  return `I am writing to explain the gap in my employment history ${dateRange}. ` +
    `During this period, I ${params.employmentGapReason || 'was engaged in activities that temporarily prevented full-time employment'}. ` +
    `I have since secured stable employment and my position remains secure with a steady income stream.`;
}

function getLatePaymentContent(params: LOEParams): string {
  const accountInfo = params.latePaymentAccount ? 
    `on my ${params.latePaymentAccount}` :
    'on an account';
  
  const dateInfo = params.latePaymentDate ? 
    `that occurred on ${params.latePaymentDate}` :
    'in my credit history';
  
  return `I am writing to explain the late payment ${accountInfo} ${dateInfo}. ` +
    `This late payment was due to ${params.latePaymentReason || 'an unusual circumstance'} and does not reflect my typical financial behavior. ` +
    `I have maintained a good payment history before and after this isolated incident, ` +
    `and have taken steps to ensure this situation will not occur again.`;
}

function getAddressDiscrepancyContent(params: LOEParams): string {
  const addressInfo = params.alternateAddress ? 
    `listed as ${params.alternateAddress}` :
    'discrepancy';
  
  return `I am writing to explain the discrepancy in my address history. ` +
    `The address ${addressInfo} appears on my records due to ${params.addressDiscrepancyReason || 'specific circumstances'}. ` +
    `My current permanent address is ${params.propertyAddress || 'as listed on my application'}, ` +
    `and all correspondence should be sent there.`;
}

function getNameVariationContent(params: LOEParams): string {
  const nameInfo = params.nameVariation ? 
    `"${params.nameVariation}"` :
    'variation';
  
  return `I am writing to explain the variation in my name that appears on some documents. ` +
    `The name ${nameInfo} appears due to ${params.nameVariationReason || 'specific circumstances'}. ` +
    `My legal name is ${params.borrowerName}, which appears on my government-issued ID ` +
    `and should be used for all official loan documentation.`;
}

function getGeneralExplanationContent(params: LOEParams): string {
  return `I am writing in response to your request for a letter of explanation regarding "${params.conditionText || 'your request'}". ` +
    `I would like to clarify that this situation occurred due to specific circumstances that I can explain in detail. ` +
    `The information provided in my loan application is accurate and complete to the best of my knowledge. ` +
    `I am committed to providing any additional information or documentation required to process my mortgage application.`;
}
