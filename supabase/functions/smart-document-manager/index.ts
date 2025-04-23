
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const categoryDescriptions = `
🪪 Identification
Driver's License – A photo ID issued by a state DMV. Contains name, DOB, issue/expiration date, address, and photo.
Social Security Card – Federal document with the borrower's full legal name and SSN. No expiration or photo.
Passport – Federal document with name, DOB, nationality, photo, and passport number. May include visa stamps.

💵 Income
Pay Stubs – Employer-issued income breakdown by pay period. Includes gross/net pay, YTD totals, taxes withheld.
W-2 / 1099 – Annual wage summaries. W-2s from employers, 1099s from contract or self-employed work.
Tax Returns (1040s, K-1s) – Filed IRS forms with declared income, deductions, self-employment details.
Profit & Loss Statements – Self-employed income summary. Often broken into revenue, expenses, and net income.
Social Security / Pension Award Letters – Government or institution-issued benefit documentation showing monthly fixed income.
Unemployment Benefits – Statements showing unemployment compensation received from a state agency.
Child Support / Alimony Income – Court documents or bank statements showing regular incoming support payments.

💳 Assets
Bank Statements – Monthly bank account transaction summaries. Includes balances, deposits, and withdrawals.
Retirement Account Statements – IRA, 401(k), or pension account summaries. Often include vested balance, contributions, and account number.
Investment Statements – Brokerage reports showing stock/mutual fund ownership and balances.
Gift Letters – Signed declarations of non-repayable financial gifts used for down payments.
Asset Verification Forms – Signed lender forms or third-party VOA reports confirming asset availability.

🏠 Property Documents
Purchase Agreement – Real estate contract showing sale terms, price, signatures, and contingencies.
Appraisal Report – Property valuation completed by a licensed appraiser. Includes comparable sales, condition, and estimated value.
Homeowners Insurance – Policy declarations page showing coverage, insured address, and premium.
Flood Insurance – If required by property location, FEMA-based insurance declaration page.
Title Report / Commitment – Preliminary legal review of ownership, liens, and encumbrances.
Preliminary Title – Similar to above, often issued early in escrow.
Survey – Land boundary sketch showing property dimensions, easements, and structures.
Pest Inspection – Termite/wood destroying organism inspection report, often required in some states.
Property Photos – Visual documentation of the property condition and features.

📉 Credit & Liabilities
Credit Report – Tri-merge or single bureau credit profile. Contains trade lines, scores, inquiries, and public records.
Credit Explanation Letter – Borrower-written LOE explaining derogatory credit, inquiries, or disputes.
Student Loan Statements – Monthly or quarterly statements showing balances and minimum payments.
Car Loan / Lease Docs – Loan statements, lease contracts showing payment terms and ownership.
Credit Card Statements – Recent credit card bills showing balances, limits, and transactions.

🧾 Employment / VOE
Written VOE – Employer-completed form verifying position, hire date, income type and salary.
Verbal VOE – Lender call log or signed verification showing employer confirmation.
Employer Letters – Custom letters on company letterhead confirming employment or job offer.

📝 Compliance / Disclosures
Loan Estimate (LE) – Standard 3-page TILA-RESPA disclosure showing rates, fees, and terms.
Closing Disclosure (CD) – Final 5-page settlement form with exact closing costs and cash-to-close.
Truth in Lending (TIL) – APR-focused legacy disclosure. Still appears in some file types.
Right to Cancel Notice – 3-day rescission notice for refinances.
ECOA / Fair Lending Disclosure – Equal Credit Opportunity Act acknowledgment.
eConsent – Document allowing borrower to receive disclosures electronically.
Initial & Final Disclosures – Combined set of all required consumer-facing forms issued at start or end of file.

⚖️ Legal
Divorce Decree – Court-issued document detailing spousal support, asset division, and custodial terms.
Child Support Order – Court ruling specifying payment amount, frequency, and recipient.
Bankruptcy Discharge – Federal court documentation of completed bankruptcy.
Power of Attorney – Legal authorization allowing another individual to sign on the borrower's behalf.
Trust Documentation – Living or irrevocable trust paperwork indicating property ownership or control.

🏘️ HOA Documents
HOA Questionnaire – Form completed by the association verifying dues, rules, and litigation status.
HOA Dues Statement – Billing statement showing monthly/annual HOA fees.
HOA Insurance Certificate – Master policy covering condo or PUD common areas.

📂 Underwriting Conditions
Letter of Explanation (LOE) – Borrower-authored response to underwriter's questions.
Condition Clearing Docs – Documents provided to satisfy specific UW conditions (e.g., paystubs, bank letters).
Risk Assessment Docs – Internal analysis, income calculations, or manual reviews.
AUS Findings (DU/LP) – Desktop Underwriter or Loan Prospector output reports from Fannie/Freddie.

🧾 Title & Escrow
Escrow Instructions – Directional paperwork guiding title or escrow company duties.
Title Insurance – Final lender or owner's policy covering property title risks.
Settlement Statement (HUD-1 / ALTA) – Line-item document showing full closing debits/credits.
Wiring Instructions – Escrow or title company banking details for fund disbursement.
Bailee Letter – Instructional letter for warehouse line or investor collateral delivery.

🧷 Mortgage Insurance
MI Certificate – Final private mortgage insurance certificate for lender file.
MI Application – Initial request sent to the MI provider.
MI Cancellation Request – Filed request to remove MI based on LTV or seasoning.

📈 Investor / Funding
Purchase Advice – Final pricing statement from investor buying the loan.
Loan Purchase Agreement – Investor contract outlining pricing and delivery terms.
Investor Commitment – Approval confirmation for investor delivery.

🔍 Audit / Quality Control
Pre-Funding QC Review – Checklist confirming data/doc quality before closing.
Post-Closing Audit Docs – Audit findings or corrections after loan funding.
Fraud Check / Compliance Reports – Reports from tools like FraudGuard, Mavent, etc.
`;

// Add new document pattern recognition helper
const documentPatterns = {
  // Tax related patterns
  w2Pattern: /\b(W-2|W2|Form W-2|Wage and Tax Statement|W2 Form)\b|\bW[\s-]?2\b/i,
  taxReturnPattern: /\b(1040|Form 1040|Tax Return|Tax Filing|Schedule [A-Z]|IRS Form)\b/i,
  
  // Bank related patterns
  bankStatementPattern: /\b(Bank Statement|Account Statement|Statement of Account|Monthly Statement)\b/i,
  
  // Identification patterns
  driverLicensePattern: /\b(Driver'?s License|DL|Driver License|Driver ID|Operator'?s License)\b/i,
  
  // Credit related patterns
  creditReportPattern: /\b(Credit Report|Credit Bureau|Credit Score|FICO|Experian|TransUnion|Equifax)\b/i,
  
  // Pay related patterns
  payStubPattern: /\b(Pay ?Stub|Pay ?Statement|Earnings Statement|Salary Statement|Wage Statement)\b/i
};

// Add document classifier helper based on filename and context clues
function classifyByFilenameAndContent(filename: string, extractedText: string) {
  filename = filename.toLowerCase();
  
  // Check for W-2 forms first in both filename and content
  if (filename.includes('w-2') || filename.includes('w2') || 
      documentPatterns.w2Pattern.test(extractedText)) {
    return {
      category: "Income",
      subcategory: "W-2 / 1099"
    };
  }

  // Check for tax returns
  if (filename.includes('1040') || filename.includes('tax return') || 
      documentPatterns.taxReturnPattern.test(extractedText)) {
    return {
      category: "Income", 
      subcategory: "Tax Returns (1040s, K-1s)"
    };
  }
  
  // Check for bank statements
  if ((filename.includes('bank') && filename.includes('statement')) || 
      documentPatterns.bankStatementPattern.test(extractedText)) {
    return {
      category: "Assets",
      subcategory: "Bank Statements"
    };
  }
  
  // Check for driver's license
  if (filename.includes('license') || filename.includes('driver') || 
      documentPatterns.driverLicensePattern.test(extractedText)) {
    return {
      category: "Identification",
      subcategory: "Driver's License"
    };
  }
  
  // Check for pay stubs
  if ((filename.includes('pay') && (filename.includes('stub') || filename.includes('statement'))) || 
      documentPatterns.payStubPattern.test(extractedText)) {
    return {
      category: "Income",
      subcategory: "Pay Stubs"
    };
  }
  
  // Check for credit reports
  if ((filename.includes('credit') && filename.includes('report')) || 
      documentPatterns.creditReportPattern.test(extractedText)) {
    return {
      category: "Credit & Liabilities",
      subcategory: "Credit Report"
    };
  }
  
  // No match found, return null to allow AI to classify
  return null;
}

async function getAdobeAccessToken() {
  const clientId = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_ID');
  const clientSecret = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error("Adobe PDF credentials not set");
  const res = await fetch('https://pdf-services.adobe.io/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return { access_token: json.access_token, api_base: json.api_access_point || "https://pdf-services.adobe.io" };
}

function buildAdobeApiUrl(apiBase: string, path: string) {
  return `${apiBase.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function uploadPdfToAdobe(accessToken: string, apiBase: string, pdfBuffer: ArrayBuffer) {
  const clientId = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_ID');
  const assetsUrl = buildAdobeApiUrl(apiBase, '/assets');
  const res = await fetch(assetsUrl, {
    method: 'POST',
    headers: { 'X-API-Key': clientId || "", 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaType: "application/pdf" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  const { uploadUri, assetID } = json;
  const uploadRes = await fetch(uploadUri, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: pdfBuffer });
  if (!uploadRes.ok) throw new Error(await uploadRes.text());
  return assetID;
}

async function createExtractionJob(accessToken: string, apiBase: string, assetID: string) {
  const clientId = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_ID');
  const extractUrl = buildAdobeApiUrl(apiBase, '/operation/extractpdf');
  const res = await fetch(extractUrl, {
    method: 'POST',
    headers: { 'X-API-Key': clientId || "", 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assetID,
      elementsToExtract: ["text", "tables"],
      pageRanges: [{ startPage: 1, endPage: 3 }], // Only first 3 pages
    }),
  });
  if (![201, 202].includes(res.status)) throw new Error(await res.text());
  const location = res.headers.get('location');
  if (!location) throw new Error("No job location");
  return location;
}

async function pollJobStatus(accessToken: string, location: string) {
  const clientId = Deno.env.get('ADOBE_PDF_SERVICES_CLIENT_ID');
  let status = "in progress", tries = 0;
  while (status === "in progress" && tries < 60) {
    tries++;
    const res = await fetch(location, { headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': clientId || "" } });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    status = data.status;
    if (status === "done") {
      let downloadUri = 
        data.content?.downloadUri || 
        data.resource?.downloadUri ||
        (data.outputs && Array.isArray(data.outputs) && data.outputs[0]?.downloadUri) ||
        data.output?.downloadUri || data.downloadUri;
      if (!downloadUri) throw new Error("Job finished but no download URI found");
      return downloadUri;
    }
    if (status === "failed") throw new Error("Extraction job failed");
    await new Promise(res => setTimeout(res, data.retryIn ? data.retryIn * 1000 : 2000));
  }
  throw new Error("Timed out waiting for extraction");
}

async function downloadExtractedContent(downloadUri: string) {
  const res = await fetch(downloadUri);
  if (!res.ok) throw new Error(await res.text());
  const contentType = res.headers.get("content-type") || "";
  const buf = await res.arrayBuffer();
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  // Assume it's a ZIP file
  const zip = await JSZip.loadAsync(new Uint8Array(buf));
  const jsonFile = zip.file('structuredData.json');
  if (!jsonFile) throw new Error("No structuredData.json in extracted ZIP");
  return JSON.parse(await jsonFile.async('string'));
}

async function extractPdfText(pdfBuffer: ArrayBuffer) {
  const { access_token, api_base } = await getAdobeAccessToken();
  const assetID = await uploadPdfToAdobe(access_token, api_base, pdfBuffer);
  const extractionJob = await createExtractionJob(access_token, api_base, assetID);
  const downloadUri = await pollJobStatus(access_token, extractionJob);
  return await downloadExtractedContent(downloadUri);
}

async function classifyDocument(text: string, fileName: string) {
  // First try to classify based on filename and text patterns
  const patternClassification = classifyByFilenameAndContent(fileName, text);
  if (patternClassification) {
    console.log(`Document classified based on pattern matching: ${patternClassification.category} > ${patternClassification.subcategory}`);
    return patternClassification;
  }

  // If pattern matching doesn't work, use OpenAI
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) throw new Error("OpenAI API key not set.");
  
  // More explicit, strict, zero-compromise prompt for US mortgage docs
  const systemPrompt = `
You are a professional US MORTGAGE document classifier and you must be EXTREMELY strict about matching.
DO NOT use "Miscellaneous" or "Supporting Docs Not Elsewhere Categorized" unless there is no absolutely possible match.
When you see US tax forms (like W-2, 1040, 1099 etc.), you MUST classify them as the exact subcategory (e.g., "W-2 / 1099" for W-2 or 1099, "Tax Returns (1040s, K-1s)" for 1040).
ALWAYS pay close attention to both the full filename (${fileName}) and extracted text. If the filename contains clues (like "w2", "W-2", "1040" etc.), give these heavy weight.
If you spot "Driver's License", "passport", "pay stub" etc. either in text or filename, pick the correct subcategory listed below.
DO NOT label as "Other / Miscellaneous" or "Supporting Docs Not Elsewhere Categorized" unless truly nothing matches—if you do, include a "reason" explaining why.
You must output ONLY a JSON with "category" and "subcategory" fields.

Here are all allowed US mortgage document categories and subcategories:

${categoryDescriptions}

Be clinical, strict, and conservative. Pay close attention to form numbers, document headers, and filename clues.
`;

  const userPrompt = `Filename: ${fileName}
Extracted Text Start:\n${text.substring(0, 8000)}
  
Classify this document strictly per the above. If you pick "Other / Miscellaneous" or "Supporting Docs Not Elsewhere Categorized", provide a "reason" in your JSON answer explaining why, otherwise just give category and subcategory.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.05,
      response_format: { type: "json_object" }
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  const result = await response.json();
  try {
    // Parse and return only category/subcategory (ignore "reason" if present)
    const out = JSON.parse(result.choices?.[0]?.message?.content ?? "{}");
    return {
      category: out.category || "Other / Miscellaneous",
      subcategory: out.subcategory || "Supporting Docs Not Elsewhere Categorized"
    };
  } catch (e) {
    return { category: "Other / Miscellaneous", subcategory: "Supporting Docs Not Elsewhere Categorized" };
  }
}

// -- MAIN FUNCTION HANDLER --

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Expecting FormData with files[] and leadId
    const formData = await req.formData();
    const leadId = formData.get("leadId");
    if (!leadId) throw new Error("No leadId provided");

    // Get files in upload order
    const files: File[] = [];
    const n = parseInt(formData.get("fileCount")?.toString() || "0", 10);
    for (let i = 0; i < n; i++) {
      const file = formData.get(`file${i}`) as File;
      if (file && file instanceof File) files.push(file);
    }
    if (!files.length) throw new Error("No files found in request");

    const results: Array<any> = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let extractedText: string = "";
      let determinedCategory = { category: "Other / Miscellaneous", subcategory: "Supporting Docs Not Elsewhere Categorized" };

      // If PDF, use Adobe extraction (only first 3 pages)
      if (file.type === "application/pdf") {
        const extraction = await extractPdfText(await file.arrayBuffer());
        extractedText =
          extraction && extraction.elements
            ? extraction.elements.filter((e: any) => e.Text).map((e: any) => e.Text).join("\n")
            : "";
      } else {
        // Fallback: for images/etc, pass filename for pattern recognition
        extractedText = file.name;
      }

      // Call classification with both text content and filename
      if (extractedText) {
        determinedCategory = await classifyDocument(extractedText, file.name);
      }

      // Compose final form for storing doc
      const storeForm = new FormData();
      storeForm.append("file", file);
      storeForm.append("leadId", leadId.toString());
      storeForm.append("category", determinedCategory.category || "Other / Miscellaneous");
      storeForm.append("subcategory", determinedCategory.subcategory || "Supporting Docs Not Elsewhere Categorized");

      // Store doc using store-document function (order preserved)
      const { data, error } = await supabase.functions.invoke("store-document", { body: storeForm });
      results.push({
        file: file.name,
        status: error ? "error" : "stored",
        result: error ? error.message ?? error : data,
        category: determinedCategory.category,
        subcategory: determinedCategory.subcategory,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Documents processed and stored by subcategory.",
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error?.message ?? String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
