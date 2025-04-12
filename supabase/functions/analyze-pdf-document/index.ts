
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
function mergeDocumentData(existingData, extractedData) {
  // Create a deep copy to avoid modifying the original object
  const result = JSON.parse(JSON.stringify(existingData));
  
  // Initialize sections if they don't exist
  if (!result.borrower) result.borrower = {};
  if (!result.property) result.property = {};
  if (!result.employment) result.employment = {};
  if (!result.income) result.income = {};
  if (!result.assets) result.assets = {};
  if (!result.liabilities) result.liabilities = {};
  if (!result.declarations) result.declarations = {};
  if (!result.housing) result.housing = {};
  
  // Merge borrower section data
  if (extractedData.borrower || extractedData["SECTION I"]) {
    const borrowerData = extractedData.borrower || extractedData["SECTION I"] || {};
    result.borrower = {
      ...result.borrower,
      firstName: borrowerData.firstName || borrowerData["Borrower First Name"] || result.borrower.firstName,
      middleName: borrowerData.middleName || borrowerData["Borrower Middle Name"] || result.borrower.middleName,
      lastName: borrowerData.lastName || borrowerData["Borrower Last Name"] || result.borrower.lastName,
      suffix: borrowerData.suffix || borrowerData["Suffix"] || result.borrower.suffix,
      ssn: borrowerData.ssn || borrowerData["Social Security Number"] || result.borrower.ssn,
      dateOfBirth: borrowerData.dateOfBirth || borrowerData["Date of Birth"] || result.borrower.dateOfBirth,
      maritalStatus: borrowerData.maritalStatus || borrowerData["Marital Status"] || result.borrower.maritalStatus,
      citizenship: borrowerData.citizenship || borrowerData["Citizenship Status"] || result.borrower.citizenship,
      dependents: borrowerData.dependents || borrowerData["Number of Dependents"] || result.borrower.dependents,
      dependentAges: borrowerData.dependentAges || borrowerData["Dependent Ages"] || result.borrower.dependentAges,
      email: borrowerData.email || borrowerData["Email Address"] || result.borrower.email,
      homePhone: borrowerData.homePhone || borrowerData["Home Phone"] || result.borrower.homePhone,
      mobilePhone: borrowerData.mobilePhone || borrowerData["Mobile Phone"] || result.borrower.mobilePhone,
      currentAddress: borrowerData.currentAddress || borrowerData["Current Address"] || result.borrower.currentAddress,
      timeAtCurrentAddress: borrowerData.timeAtCurrentAddress || borrowerData["Time at Current Address"] || result.borrower.timeAtCurrentAddress,
      isPrimaryResidence: borrowerData.isPrimaryResidence || borrowerData["Is this your Primary Residence"] || result.borrower.isPrimaryResidence
    };
  }

  // Merge assets and liabilities
  if (extractedData.assets || extractedData["SECTION II"] || extractedData["Financial Information"]) {
    const financialData = extractedData.assets || extractedData["SECTION II"] || extractedData["Financial Information"] || {};
    const assetsData = financialData.assets || financialData["Assets"] || {};
    
    if (assetsData) {
      result.assets = {
        ...result.assets,
        checkingAccounts: assetsData.checkingAccounts || assetsData["Checking Account Balances"] || result.assets.checkingAccounts,
        savingsAccounts: assetsData.savingsAccounts || assetsData["Savings Account Balances"] || result.assets.savingsAccounts,
        retirementAccounts: assetsData.retirementAccounts || assetsData["Retirement Accounts"] || result.assets.retirementAccounts,
        stocksAndBonds: assetsData.stocksAndBonds || assetsData["Stocks and Bonds"] || result.assets.stocksAndBonds,
        cashOnHand: assetsData.cashOnHand || assetsData["Cash on Hand"] || result.assets.cashOnHand,
        realEstateOwned: assetsData.realEstateOwned || assetsData["Real Estate Owned"] || result.assets.realEstateOwned
      };
    }

    const liabilitiesData = financialData.liabilities || financialData["Liabilities"] || {};
    
    if (liabilitiesData) {
      result.liabilities = {
        ...result.liabilities,
        creditCardDebts: liabilitiesData.creditCardDebts || liabilitiesData["Credit Card Debts"] || result.liabilities.creditCardDebts,
        autoLoans: liabilitiesData.autoLoans || liabilitiesData["Auto Loans"] || result.liabilities.autoLoans,
        studentLoans: liabilitiesData.studentLoans || liabilitiesData["Student Loans"] || result.liabilities.studentLoans,
        mortgageBalances: liabilitiesData.mortgageBalances || liabilitiesData["Mortgage Balances on Other Properties"] || result.liabilities.mortgageBalances,
        monthlyPayments: liabilitiesData.monthlyPayments || liabilitiesData["Monthly Payment Obligations"] || result.liabilities.monthlyPayments,
        coSignedLiabilities: liabilitiesData.coSignedLiabilities || liabilitiesData["Co-Signed Liabilities"] || result.liabilities.coSignedLiabilities
      };
    }
  }

  // Merge real estate information
  if (extractedData.property || extractedData["SECTION III"] || extractedData["Real Estate"]) {
    const propertyData = extractedData.property || extractedData["SECTION III"] || extractedData["Real Estate"] || {};
    
    result.property = {
      ...result.property,
      address: propertyData.address || propertyData["Property Address"] || result.property.address,
      propertyType: propertyData.propertyType || result.property.propertyType,
      occupancy: propertyData.occupancy || propertyData["Intended Occupancy"] || result.property.occupancy,
      value: propertyData.value || propertyData["Purchase Price"] || result.property.value,
      loanAmount: propertyData.loanAmount || propertyData["Loan Amount"] || result.property.loanAmount
    };
    
    result.housing = {
      ...result.housing,
      monthlyPayment: propertyData.monthlyPayment || propertyData["Monthly Mortgage Payment"] || result.housing.monthlyPayment,
      propertyTaxes: propertyData.propertyTaxes || propertyData["Property Taxes"] || result.housing.propertyTaxes,
      insurance: propertyData.insurance || propertyData["Insurance"] || result.housing.insurance,
      hoaFees: propertyData.hoaFees || propertyData["HOA Fees"] || result.housing.hoaFees,
      rentalIncome: propertyData.rentalIncome || propertyData["Rental Income"] || result.housing.rentalIncome
    };
  }

  // Merge employment and income information
  if (extractedData.employment || extractedData["SECTION IV"]) {
    const employmentData = extractedData.employment || extractedData["SECTION IV"] || {};
    const currentEmployment = employmentData.currentEmployment || employmentData["Current Employment"] || {};
    
    if (currentEmployment && Object.keys(currentEmployment).length > 0) {
      if (!result.employment.employers) result.employment.employers = [];
      
      // See if we have an employer with the same name
      const employerName = currentEmployment.employerName || currentEmployment["Employer Name"];
      const existingEmployerIndex = employerName ? result.employment.employers.findIndex(
        (e) => e.name === employerName
      ) : -1;
      
      if (existingEmployerIndex >= 0) {
        // Update existing employer
        result.employment.employers[existingEmployerIndex] = {
          ...result.employment.employers[existingEmployerIndex],
          name: employerName || result.employment.employers[existingEmployerIndex].name,
          position: currentEmployment.position || currentEmployment["Position/Title"] || result.employment.employers[existingEmployerIndex].position,
          address: currentEmployment.address || currentEmployment["Street Address"] || result.employment.employers[existingEmployerIndex].address,
          city: currentEmployment.city || (currentEmployment["City, State, ZIP"] ? currentEmployment["City, State, ZIP"].split(',')[0] : null) || result.employment.employers[existingEmployerIndex].city,
          state: currentEmployment.state || (currentEmployment["City, State, ZIP"] ? currentEmployment["City, State, ZIP"].split(',')[1]?.trim()?.split(' ')[0] : null) || result.employment.employers[existingEmployerIndex].state,
          zip: currentEmployment.zip || (currentEmployment["City, State, ZIP"] ? currentEmployment["City, State, ZIP"].split(',')[1]?.trim()?.split(' ')[1] : null) || result.employment.employers[existingEmployerIndex].zip,
          phone: currentEmployment.phone || currentEmployment["Phone Number"] || result.employment.employers[existingEmployerIndex].phone,
          isSelfEmployed: currentEmployment.isSelfEmployed || currentEmployment["Self-Employed"] || result.employment.employers[existingEmployerIndex].isSelfEmployed,
          startDate: currentEmployment.startDate || currentEmployment["Date of Employment Start"] || result.employment.employers[existingEmployerIndex].startDate
        };
      } else if (employerName) {
        // Add new employer
        result.employment.employers.push({
          name: employerName,
          position: currentEmployment.position || currentEmployment["Position/Title"],
          address: currentEmployment.address || currentEmployment["Street Address"],
          city: currentEmployment.city || (currentEmployment["City, State, ZIP"] ? currentEmployment["City, State, ZIP"].split(',')[0] : null),
          state: currentEmployment.state || (currentEmployment["City, State, ZIP"] ? currentEmployment["City, State, ZIP"].split(',')[1]?.trim()?.split(' ')[0] : null),
          zip: currentEmployment.zip || (currentEmployment["City, State, ZIP"] ? currentEmployment["City, State, ZIP"].split(',')[1]?.trim()?.split(' ')[1] : null),
          phone: currentEmployment.phone || currentEmployment["Phone Number"],
          isSelfEmployed: currentEmployment.isSelfEmployed || currentEmployment["Self-Employed"],
          startDate: currentEmployment.startDate || currentEmployment["Date of Employment Start"]
        });
      }
    }
    
    // Handle previous employment if present
    const previousEmployment = employmentData.previousEmployment || employmentData["Previous Employment"] || {};
    if (previousEmployment && Object.keys(previousEmployment).length > 0) {
      if (!result.employment.previousEmployers) result.employment.previousEmployers = [];
      
      const employerName = previousEmployment.employerName || previousEmployment["Employer Name"];
      const existingEmployerIndex = employerName ? result.employment.previousEmployers.findIndex(
        (e) => e.name === employerName
      ) : -1;
      
      if (existingEmployerIndex >= 0) {
        // Update existing previous employer
        result.employment.previousEmployers[existingEmployerIndex] = {
          ...result.employment.previousEmployers[existingEmployerIndex],
          name: employerName || result.employment.previousEmployers[existingEmployerIndex].name,
          position: previousEmployment.position || previousEmployment["Position/Title"] || result.employment.previousEmployers[existingEmployerIndex].position,
          address: previousEmployment.address || previousEmployment["Street Address"] || result.employment.previousEmployers[existingEmployerIndex].address,
          city: previousEmployment.city || (previousEmployment["City, State, ZIP"] ? previousEmployment["City, State, ZIP"].split(',')[0] : null) || result.employment.previousEmployers[existingEmployerIndex].city,
          state: previousEmployment.state || (previousEmployment["City, State, ZIP"] ? previousEmployment["City, State, ZIP"].split(',')[1]?.trim()?.split(' ')[0] : null) || result.employment.previousEmployers[existingEmployerIndex].state,
          zip: previousEmployment.zip || (previousEmployment["City, State, ZIP"] ? previousEmployment["City, State, ZIP"].split(',')[1]?.trim()?.split(' ')[1] : null) || result.employment.previousEmployers[existingEmployerIndex].zip,
          phone: previousEmployment.phone || previousEmployment["Phone Number"] || result.employment.previousEmployers[existingEmployerIndex].phone,
          isSelfEmployed: previousEmployment.isSelfEmployed || previousEmployment["Self-Employed"] || result.employment.previousEmployers[existingEmployerIndex].isSelfEmployed,
          startDate: previousEmployment.startDate || previousEmployment["Date of Employment Start"] || result.employment.previousEmployers[existingEmployerIndex].startDate,
          endDate: previousEmployment.endDate || result.employment.previousEmployers[existingEmployerIndex].endDate
        };
      } else if (employerName) {
        // Add new previous employer
        result.employment.previousEmployers.push({
          name: employerName,
          position: previousEmployment.position || previousEmployment["Position/Title"],
          address: previousEmployment.address || previousEmployment["Street Address"],
          city: previousEmployment.city || (previousEmployment["City, State, ZIP"] ? previousEmployment["City, State, ZIP"].split(',')[0] : null),
          state: previousEmployment.state || (previousEmployment["City, State, ZIP"] ? previousEmployment["City, State, ZIP"].split(',')[1]?.trim()?.split(' ')[0] : null),
          zip: previousEmployment.zip || (previousEmployment["City, State, ZIP"] ? previousEmployment["City, State, ZIP"].split(',')[1]?.trim()?.split(' ')[1] : null),
          phone: previousEmployment.phone || previousEmployment["Phone Number"],
          isSelfEmployed: previousEmployment.isSelfEmployed || previousEmployment["Self-Employed"],
          startDate: previousEmployment.startDate || previousEmployment["Date of Employment Start"],
          endDate: previousEmployment.endDate
        });
      }
    }
  }

  // Merge income information
  if (extractedData.income || extractedData["SECTION V"]) {
    const incomeData = extractedData.income || extractedData["SECTION V"] || {};
    
    result.income = {
      ...result.income,
      monthlyBase: incomeData.monthlyBase || incomeData["Total Monthly Base Income"] || incomeData.base || incomeData["Base"] || result.income.monthlyBase,
      monthlyOvertime: incomeData.monthlyOvertime || incomeData["Overtime"] || result.income.monthlyOvertime,
      monthlyBonus: incomeData.monthlyBonus || incomeData["Bonuses"] || result.income.monthlyBonus,
      monthlyCommission: incomeData.monthlyCommission || incomeData["Commissions"] || result.income.monthlyCommission,
      monthlyMilitary: incomeData.monthlyMilitary || incomeData["Military"] || result.income.monthlyMilitary,
      monthlyOther: incomeData.monthlyOther || incomeData["Other Income"] || result.income.monthlyOther,
      totalMonthlyIncome: incomeData.totalMonthlyIncome || result.income.totalMonthlyIncome,
      annualIncome: incomeData.annualIncome || result.income.annualIncome
    };
  }

  // Merge declarations
  if (extractedData.declarations || extractedData["SECTION VIII"]) {
    const declarationsData = extractedData.declarations || extractedData["SECTION VIII"] || {};
    
    result.declarations = {
      ...result.declarations,
      alimonyChildSupport: declarationsData.alimonyChildSupport || declarationsData["Are you obligated to pay alimony or child support"] || result.declarations.alimonyChildSupport,
      bankruptcy: declarationsData.bankruptcy || declarationsData["Have you declared bankruptcy in the last 7 years"] || result.declarations.bankruptcy,
      lawsuit: declarationsData.lawsuit || declarationsData["Are you party to a lawsuit"] || result.declarations.lawsuit,
      otherProperties: declarationsData.otherProperties || declarationsData["Do you own any other properties"] || result.declarations.otherProperties
    };
  }

  // Merge loan information (from section VI)
  if (extractedData.loan || extractedData["SECTION VI"] || extractedData["Details of Transaction"]) {
    const loanData = extractedData.loan || extractedData["SECTION VI"] || extractedData["Details of Transaction"] || {};
    
    if (!result.loan) result.loan = {};
    result.loan = {
      ...result.loan,
      purchasePrice: loanData.purchasePrice || loanData["Purchase Price"] || result.loan.purchasePrice,
      loanAmount: loanData.loanAmount || loanData["Loan Amount"] || result.loan.loanAmount,
      estimatedClosingCosts: loanData.estimatedClosingCosts || loanData["Estimated Closing Costs"] || result.loan.estimatedClosingCosts,
      downPayment: loanData.downPayment || loanData["Down Payment"] || result.loan.downPayment,
      sellerCredits: loanData.sellerCredits || loanData["Seller Credits"] || result.loan.sellerCredits,
      otherCosts: loanData.otherCosts || loanData["Other Costs"] || result.loan.otherCosts
    };
  }

  // Merge government monitoring information
  if (extractedData.governmentMonitoring || extractedData["SECTION X"] || extractedData["Information for Government Monitoring"]) {
    const monitoringData = extractedData.governmentMonitoring || extractedData["SECTION X"] || extractedData["Information for Government Monitoring"] || {};
    
    if (!result.governmentMonitoring) result.governmentMonitoring = {};
    result.governmentMonitoring = {
      ...result.governmentMonitoring,
      gender: monitoringData.gender || monitoringData["Gender"] || result.governmentMonitoring.gender,
      ethnicity: monitoringData.ethnicity || monitoringData["Ethnicity"] || result.governmentMonitoring.ethnicity,
      race: monitoringData.race || monitoringData["Race"] || result.governmentMonitoring.race,
      noProvide: monitoringData.noProvide || monitoringData["Chosen Not to Provide"] || result.governmentMonitoring.noProvide
    };
  }

  // Document type
  if (extractedData.documentType) {
    result.documentType = extractedData.documentType;
  }
  
  return result;
}
