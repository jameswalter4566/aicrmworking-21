
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get file URL and metadata from request
    const { fileUrl, fileType, leadId } = await req.json();
    
    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: 'File URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize OpenAI API
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processing PDF document: ${fileUrl}`);
    console.log(`Document type hint: ${fileType || 'Unknown'}`);
    
    // Download the PDF file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }
    
    // Convert to base64 for OpenAI
    const fileBuffer = await fileResponse.arrayBuffer();
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
    // Comprehensive prompt for mortgage document analysis
    const systemPrompt = `You are an intelligent mortgage document analyzer. Your job is to:

1. **Classify** the type of each uploaded document:
   - W-2
   - Paystub
   - Mortgage Statement
   - Government-Issued ID (Driver's License, Passport)
   - Bank Statement
   - Tax Return (1040, Schedule C)
   - Utility Bill
   - Employment Letter
   - Lease Agreement
   - Social Security Award Letter
   - Other (label as 'Unrecognized')

2. **Extract borrower data** from each document, including Personal Identifiable Information (PII), financial data, and employment information.

3. **Map extracted data to specific fields** of the **Uniform Residential Loan Application (Form 1003)**. Use the following schema for reference:

### SECTION I – Borrower Information
- Borrower First Name  
- Borrower Middle Name  
- Borrower Last Name  
- Suffix  
- Social Security Number  
- Date of Birth  
- Marital Status  
- Citizenship Status  
- Number of Dependents  
- Dependent Ages  
- Email Address  
- Home Phone  
- Mobile Phone  
- Current Address (Street, City, State, ZIP)  
- Time at Current Address (Years, Months)  
- Is this your Primary Residence?

### SECTION II – Financial Information: Assets and Liabilities
**Assets:**
- Checking Account Balances  
- Savings Account Balances  
- Retirement Accounts  
- Stocks and Bonds  
- Cash on Hand  
- Real Estate Owned (property details)

**Liabilities:**
- Credit Card Debts  
- Auto Loans  
- Student Loans  
- Mortgage Balances on Other Properties  
- Monthly Payment Obligations  
- Co-Signed Liabilities  

### SECTION III – Financial Information: Real Estate
- Property You Are Purchasing or Refinancing  
- Property Address  
- Intended Occupancy (Primary, Second Home, Investment)  
- Monthly Mortgage Payment  
- Property Taxes  
- Insurance  
- HOA Fees  
- Rental Income  

### SECTION IV – Employment and Income
**Current Employment:**
- Employer Name  
- Position/Title  
- Street Address  
- City, State, ZIP  
- Phone Number  
- Self-Employed?  
- Date of Employment Start  
- Income Type  
  - Base  
  - Overtime  
  - Bonuses  
  - Commissions  
  - Military  
  - Other

**Previous Employment (if <2 years):**
- Same fields as above

### SECTION V – Monthly Income and Combined Housing Expense
- Total Monthly Base Income  
- Other Income (Child Support, Alimony, Pension, etc.)  
- Total Combined Monthly Housing Expenses (Mortgage, Taxes, Insurance)

### SECTION VI – Details of Transaction
- Purchase Price  
- Loan Amount  
- Estimated Closing Costs  
- Down Payment  
- Seller Credits  
- Other Costs (HOA, Prepaids, etc.)

### SECTION VIII – Declarations
- Are you obligated to pay alimony or child support?  
- Have you declared bankruptcy in the last 7 years?  
- Are you party to a lawsuit?  
- Do you own any other properties?

### SECTION IX – Acknowledgments and Agreements
- Borrower Name  
- Date  
- Signature (only confirm presence if scanned)

### SECTION X – Information for Government Monitoring
- Gender  
- Ethnicity  
- Race  
- Chosen Not to Provide?

4. **Matching Rules:**
   - If more than one borrower is listed, identify which document belongs to which person based on Name, DOB, SSN, or Address.
   - If values conflict across documents, flag as \`INCONSISTENT_DATA\`.

5. **Output Format:**
Return all extracted and classified data as structured **JSON**, organized by 1003 section headings.

6. **Fallbacks:**
   - If a field is not present, label it as \`MISSING\`.
   - If a document is unrecognizable or corrupted, label as \`UNRECOGNIZED_DOCUMENT\`.

You are acting as a trusted document processing agent in a mortgage underwriting pipeline. Ensure full security, privacy, and data integrity at all times.`;
    
    // Call OpenAI to analyze the PDF
    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",  // Using GPT-4o for better document analysis
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this mortgage document and extract all relevant information according to the 1003 form structure. Please be as thorough as possible and classify the document type."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${fileBase64}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      })
    });
    
    if (!openAiResponse.ok) {
      const error = await openAiResponse.json();
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }
    
    const aiResult = await openAiResponse.json();
    const extractedData = JSON.parse(aiResult.choices[0].message.content);
    
    console.log("Successfully extracted data from document");
    
    // Update lead's mortgage data if leadId is provided
    if (leadId) {
      try {
        // Get existing mortgage data
        const { data: leadData, error: fetchError } = await supabase
          .from('leads')
          .select('mortgage_data')
          .eq('id', leadId)
          .single();
          
        if (fetchError) {
          console.error("Error fetching lead data:", fetchError);
        } else {
          // Merge existing data with new extracted data
          const existingMortgageData = leadData?.mortgage_data || {};
          const updatedMortgageData = mergeDocumentData(existingMortgageData, extractedData);
          
          // Update the lead with new data
          const { error: updateError } = await supabase
            .from('leads')
            .update({ mortgage_data: updatedMortgageData })
            .eq('id', leadId);
            
          if (updateError) {
            console.error("Error updating lead data:", updateError);
          } else {
            console.log("Successfully updated lead mortgage data");
          }
        }
      } catch (err) {
        console.error("Error in data merging process:", err);
        // Continue execution to return the extracted data even if merging fails
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        documentType: extractedData.documentType || "Unknown",
        message: "Document successfully analyzed"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error processing document:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process document"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to intelligently merge document data into mortgage_data structure
// COMPLETELY REWRITTEN to avoid maximum call stack exceeded errors
function mergeDocumentData(existingData, extractedData) {
  // Safety check for null/undefined inputs
  const existing = existingData || {};
  const extracted = extractedData || {};
  
  // Create a very simple base object without deep copying
  let result = {};
  
  // Initialize core sections - avoid complex nesting
  result.borrower = {};
  result.property = {};
  result.employment = { employers: [], previousEmployers: [] };
  result.income = {};
  result.assets = {};
  result.liabilities = {};
  result.declarations = {};
  result.housing = {};
  result.loan = {};
  result.governmentMonitoring = {};
  
  // Extremely simplified merging approach
  // 1. First, copy basic values from existing data
  if (existing.borrower) {
    Object.assign(result.borrower, existing.borrower);
  }
  
  if (existing.property) {
    Object.assign(result.property, existing.property);
  }
  
  if (existing.income) {
    Object.assign(result.income, existing.income);
  }
  
  if (existing.assets) {
    Object.assign(result.assets, existing.assets);
  }
  
  if (existing.liabilities) {
    Object.assign(result.liabilities, existing.liabilities);
  }
  
  if (existing.declarations) {
    Object.assign(result.declarations, existing.declarations);
  }
  
  if (existing.housing) {
    Object.assign(result.housing, existing.housing);
  }
  
  if (existing.loan) {
    Object.assign(result.loan, existing.loan);
  }
  
  if (existing.governmentMonitoring) {
    Object.assign(result.governmentMonitoring, existing.governmentMonitoring);
  }
  
  // Special handling for employers to avoid deep nesting issues
  if (existing.employment && Array.isArray(existing.employment.employers)) {
    // Shallow copy of employers
    for (let i = 0; i < existing.employment.employers.length; i++) {
      if (existing.employment.employers[i]) {
        result.employment.employers.push({...existing.employment.employers[i]});
      }
    }
  }
  
  if (existing.employment && Array.isArray(existing.employment.previousEmployers)) {
    // Shallow copy of previous employers
    for (let i = 0; i < existing.employment.previousEmployers.length; i++) {
      if (existing.employment.previousEmployers[i]) {
        result.employment.previousEmployers.push({...existing.employment.previousEmployers[i]});
      }
    }
  }
  
  // 2. Then, merge data from extracted information
  // Borrower info
  const borrowerData = extracted.borrower || extracted["SECTION I"] || {};
  if (Object.keys(borrowerData).length > 0) {
    // Direct key mapping to avoid complex lookups
    result.borrower.firstName = borrowerData.firstName || borrowerData["Borrower First Name"] || result.borrower.firstName;
    result.borrower.middleName = borrowerData.middleName || borrowerData["Borrower Middle Name"] || result.borrower.middleName;
    result.borrower.lastName = borrowerData.lastName || borrowerData["Borrower Last Name"] || result.borrower.lastName;
    result.borrower.suffix = borrowerData.suffix || borrowerData["Suffix"] || result.borrower.suffix;
    result.borrower.ssn = borrowerData.ssn || borrowerData["Social Security Number"] || result.borrower.ssn;
    result.borrower.dateOfBirth = borrowerData.dateOfBirth || borrowerData["Date of Birth"] || result.borrower.dateOfBirth;
    result.borrower.maritalStatus = borrowerData.maritalStatus || borrowerData["Marital Status"] || result.borrower.maritalStatus;
    result.borrower.citizenship = borrowerData.citizenship || borrowerData["Citizenship Status"] || result.borrower.citizenship;
    result.borrower.dependents = borrowerData.dependents || borrowerData["Number of Dependents"] || result.borrower.dependents;
    result.borrower.dependentAges = borrowerData.dependentAges || borrowerData["Dependent Ages"] || result.borrower.dependentAges;
    result.borrower.email = borrowerData.email || borrowerData["Email Address"] || result.borrower.email;
    result.borrower.homePhone = borrowerData.homePhone || borrowerData["Home Phone"] || result.borrower.homePhone;
    result.borrower.mobilePhone = borrowerData.mobilePhone || borrowerData["Mobile Phone"] || result.borrower.mobilePhone;
    result.borrower.currentAddress = borrowerData.currentAddress || borrowerData["Current Address"] || result.borrower.currentAddress;
    result.borrower.timeAtCurrentAddress = borrowerData.timeAtCurrentAddress || borrowerData["Time at Current Address"] || result.borrower.timeAtCurrentAddress;
    result.borrower.isPrimaryResidence = borrowerData.isPrimaryResidence || borrowerData["Is this your Primary Residence"] || result.borrower.isPrimaryResidence;
  }
  
  // Assets data - simplified approach with direct field assignment
  const financialData = extracted.assets || extracted["SECTION II"] || extracted["Financial Information"] || {};
  const assetsData = financialData.assets || financialData["Assets"] || {};
  
  if (Object.keys(assetsData).length > 0) {
    result.assets.checkingAccounts = assetsData.checkingAccounts || assetsData["Checking Account Balances"] || result.assets.checkingAccounts;
    result.assets.savingsAccounts = assetsData.savingsAccounts || assetsData["Savings Account Balances"] || result.assets.savingsAccounts;
    result.assets.retirementAccounts = assetsData.retirementAccounts || assetsData["Retirement Accounts"] || result.assets.retirementAccounts;
    result.assets.stocksAndBonds = assetsData.stocksAndBonds || assetsData["Stocks and Bonds"] || result.assets.stocksAndBonds;
    result.assets.cashOnHand = assetsData.cashOnHand || assetsData["Cash on Hand"] || result.assets.cashOnHand;
    result.assets.realEstateOwned = assetsData.realEstateOwned || assetsData["Real Estate Owned"] || result.assets.realEstateOwned;
  }
  
  // Liabilities data
  const liabilitiesData = financialData.liabilities || financialData["Liabilities"] || {};
  
  if (Object.keys(liabilitiesData).length > 0) {
    result.liabilities.creditCardDebts = liabilitiesData.creditCardDebts || liabilitiesData["Credit Card Debts"] || result.liabilities.creditCardDebts;
    result.liabilities.autoLoans = liabilitiesData.autoLoans || liabilitiesData["Auto Loans"] || result.liabilities.autoLoans;
    result.liabilities.studentLoans = liabilitiesData.studentLoans || liabilitiesData["Student Loans"] || result.liabilities.studentLoans;
    result.liabilities.mortgageBalances = liabilitiesData.mortgageBalances || liabilitiesData["Mortgage Balances on Other Properties"] || result.liabilities.mortgageBalances;
    result.liabilities.monthlyPayments = liabilitiesData.monthlyPayments || liabilitiesData["Monthly Payment Obligations"] || result.liabilities.monthlyPayments;
    result.liabilities.coSignedLiabilities = liabilitiesData.coSignedLiabilities || liabilitiesData["Co-Signed Liabilities"] || result.liabilities.coSignedLiabilities;
  }
  
  // Real estate information
  const propertyData = extracted.property || extracted["SECTION III"] || extracted["Real Estate"] || {};
  
  if (Object.keys(propertyData).length > 0) {
    // Property fields
    result.property.address = propertyData.address || propertyData["Property Address"] || result.property.address;
    result.property.propertyType = propertyData.propertyType || result.property.propertyType;
    result.property.occupancy = propertyData.occupancy || propertyData["Intended Occupancy"] || result.property.occupancy;
    result.property.value = propertyData.value || propertyData["Purchase Price"] || result.property.value;
    result.property.loanAmount = propertyData.loanAmount || propertyData["Loan Amount"] || result.property.loanAmount;
    
    // Housing fields
    result.housing.monthlyPayment = propertyData.monthlyPayment || propertyData["Monthly Mortgage Payment"] || result.housing.monthlyPayment;
    result.housing.propertyTaxes = propertyData.propertyTaxes || propertyData["Property Taxes"] || result.housing.propertyTaxes;
    result.housing.insurance = propertyData.insurance || propertyData["Insurance"] || result.housing.insurance;
    result.housing.hoaFees = propertyData.hoaFees || propertyData["HOA Fees"] || result.housing.hoaFees;
    result.housing.rentalIncome = propertyData.rentalIncome || propertyData["Rental Income"] || result.housing.rentalIncome;
  }
  
  // Employment data - completely rewritten for simplicity
  const employmentData = extracted.employment || extracted["SECTION IV"] || {};
  
  // Current employment
  const currentEmployment = employmentData.currentEmployment || employmentData["Current Employment"] || {};
  
  if (Object.keys(currentEmployment).length > 0) {
    const employerName = currentEmployment.employerName || currentEmployment["Employer Name"];
    
    if (employerName) {
      // Create employer object
      const newEmployer = {
        name: employerName,
        position: currentEmployment.position || currentEmployment["Position/Title"],
        address: currentEmployment.address || currentEmployment["Street Address"],
        phone: currentEmployment.phone || currentEmployment["Phone Number"],
        isSelfEmployed: currentEmployment.isSelfEmployed || currentEmployment["Self-Employed"],
        startDate: currentEmployment.startDate || currentEmployment["Date of Employment Start"]
      };
      
      // Add location data if available
      if (currentEmployment["City, State, ZIP"]) {
        try {
          const parts = currentEmployment["City, State, ZIP"].split(',');
          if (parts.length > 0) newEmployer.city = parts[0].trim();
          
          if (parts.length > 1) {
            const stateZip = parts[1].trim().split(' ');
            if (stateZip.length > 0) newEmployer.state = stateZip[0];
            if (stateZip.length > 1) newEmployer.zip = stateZip[1];
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Check if employer already exists
      let found = false;
      
      for (let i = 0; i < result.employment.employers.length; i++) {
        if (result.employment.employers[i].name === employerName) {
          // Update existing employer
          result.employment.employers[i] = { ...result.employment.employers[i], ...newEmployer };
          found = true;
          break;
        }
      }
      
      // Add new employer if not found
      if (!found) {
        result.employment.employers.push(newEmployer);
      }
    }
  }
  
  // Previous employment - similar approach
  const previousEmployment = employmentData.previousEmployment || employmentData["Previous Employment"] || {};
  
  if (Object.keys(previousEmployment).length > 0) {
    const employerName = previousEmployment.employerName || previousEmployment["Employer Name"];
    
    if (employerName) {
      // Create employer object
      const newEmployer = {
        name: employerName,
        position: previousEmployment.position || previousEmployment["Position/Title"],
        address: previousEmployment.address || previousEmployment["Street Address"],
        phone: previousEmployment.phone || previousEmployment["Phone Number"],
        isSelfEmployed: previousEmployment.isSelfEmployed || previousEmployment["Self-Employed"],
        startDate: previousEmployment.startDate || previousEmployment["Date of Employment Start"],
        endDate: previousEmployment.endDate
      };
      
      // Add location data if available
      if (previousEmployment["City, State, ZIP"]) {
        try {
          const parts = previousEmployment["City, State, ZIP"].split(',');
          if (parts.length > 0) newEmployer.city = parts[0].trim();
          
          if (parts.length > 1) {
            const stateZip = parts[1].trim().split(' ');
            if (stateZip.length > 0) newEmployer.state = stateZip[0];
            if (stateZip.length > 1) newEmployer.zip = stateZip[1];
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Check if employer already exists
      let found = false;
      
      for (let i = 0; i < result.employment.previousEmployers.length; i++) {
        if (result.employment.previousEmployers[i].name === employerName) {
          // Update existing employer
          result.employment.previousEmployers[i] = { ...result.employment.previousEmployers[i], ...newEmployer };
          found = true;
          break;
        }
      }
      
      // Add new employer if not found
      if (!found) {
        result.employment.previousEmployers.push(newEmployer);
      }
    }
  }
  
  // Income information - direct field assignment
  const incomeData = extracted.income || extracted["SECTION V"] || {};
  
  if (Object.keys(incomeData).length > 0) {
    result.income.monthlyBase = incomeData.monthlyBase || incomeData["Total Monthly Base Income"] || incomeData.base || incomeData["Base"] || result.income.monthlyBase;
    result.income.monthlyOvertime = incomeData.monthlyOvertime || incomeData["Overtime"] || result.income.monthlyOvertime;
    result.income.monthlyBonus = incomeData.monthlyBonus || incomeData["Bonuses"] || result.income.monthlyBonus;
    result.income.monthlyCommission = incomeData.monthlyCommission || incomeData["Commissions"] || result.income.monthlyCommission;
    result.income.monthlyMilitary = incomeData.monthlyMilitary || incomeData["Military"] || result.income.monthlyMilitary;
    result.income.monthlyOther = incomeData.monthlyOther || incomeData["Other Income"] || result.income.monthlyOther;
    result.income.totalMonthlyIncome = incomeData.totalMonthlyIncome || result.income.totalMonthlyIncome;
    result.income.annualIncome = incomeData.annualIncome || result.income.annualIncome;
  }
  
  // Declarations
  const declarationsData = extracted.declarations || extracted["SECTION VIII"] || {};
  
  if (Object.keys(declarationsData).length > 0) {
    result.declarations.alimonyChildSupport = declarationsData.alimonyChildSupport || declarationsData["Are you obligated to pay alimony or child support"] || result.declarations.alimonyChildSupport;
    result.declarations.bankruptcy = declarationsData.bankruptcy || declarationsData["Have you declared bankruptcy in the last 7 years"] || result.declarations.bankruptcy;
    result.declarations.lawsuit = declarationsData.lawsuit || declarationsData["Are you party to a lawsuit"] || result.declarations.lawsuit;
    result.declarations.otherProperties = declarationsData.otherProperties || declarationsData["Do you own any other properties"] || result.declarations.otherProperties;
  }
  
  // Loan information
  const loanData = extracted.loan || extracted["SECTION VI"] || extracted["Details of Transaction"] || {};
  
  if (Object.keys(loanData).length > 0) {
    result.loan.purchasePrice = loanData.purchasePrice || loanData["Purchase Price"] || result.loan.purchasePrice;
    result.loan.loanAmount = loanData.loanAmount || loanData["Loan Amount"] || result.loan.loanAmount;
    result.loan.estimatedClosingCosts = loanData.estimatedClosingCosts || loanData["Estimated Closing Costs"] || result.loan.estimatedClosingCosts;
    result.loan.downPayment = loanData.downPayment || loanData["Down Payment"] || result.loan.downPayment;
    result.loan.sellerCredits = loanData.sellerCredits || loanData["Seller Credits"] || result.loan.sellerCredits;
    result.loan.otherCosts = loanData.otherCosts || loanData["Other Costs"] || result.loan.otherCosts;
  }
  
  // Government monitoring information
  const monitoringData = extracted.governmentMonitoring || extracted["SECTION X"] || extracted["Information for Government Monitoring"] || {};
  
  if (Object.keys(monitoringData).length > 0) {
    result.governmentMonitoring.gender = monitoringData.gender || monitoringData["Gender"] || result.governmentMonitoring.gender;
    result.governmentMonitoring.ethnicity = monitoringData.ethnicity || monitoringData["Ethnicity"] || result.governmentMonitoring.ethnicity;
    result.governmentMonitoring.race = monitoringData.race || monitoringData["Race"] || result.governmentMonitoring.race;
    result.governmentMonitoring.noProvide = monitoringData.noProvide || monitoringData["Chosen Not to Provide"] || result.governmentMonitoring.noProvide;
  }
  
  // Document type
  if (extracted.documentType) {
    result.documentType = extracted.documentType;
  }
  
  // Clean up any undefined values to reduce object size
  function removeUndefined(obj) {
    Object.keys(obj).forEach(key => {
      if (obj[key] === undefined) {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        removeUndefined(obj[key]);
      }
    });
  }
  
  removeUndefined(result);
  
  return result;
}
