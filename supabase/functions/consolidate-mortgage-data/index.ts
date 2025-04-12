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
    // Get lead ID from request
    const { leadId } = await req.json();
    
    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'Lead ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Consolidating mortgage data for lead: ${leadId}`);
    
    // Get lead data with all document information
    const { data: leadData, error: fetchError } = await supabase
      .from('leads')
      .select('mortgage_data')
      .eq('id', leadId)
      .single();
      
    if (fetchError) {
      console.error("Error fetching lead data:", fetchError);
      throw new Error(`Error fetching lead data: ${fetchError.message}`);
    }
    
    const mortgageData = leadData?.mortgage_data || {};
    
    // Check if we have documents to process
    if (!mortgageData.documents || !Array.isArray(mortgageData.documents) || mortgageData.documents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No documents found for this lead' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a fresh consolidated data structure
    const consolidatedData = {
      borrower: {},
      property: {},
      employment: { employers: [], previousEmployers: [] },
      income: {},
      assets: {},
      liabilities: {},
      declarations: {},
      housing: {},
      loan: {},
      governmentMonitoring: {},
      // Keep track of document types we've processed
      processedDocuments: []
    };
    
    // Sort documents by timestamp to process in chronological order
    const sortedDocuments = [...mortgageData.documents].sort((a, b) => {
      const dateA = new Date(a.timestamp || 0);
      const dateB = new Date(b.timestamp || 0);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Process each document one by one, in order
    for (const document of sortedDocuments) {
      if (!document.extractedData) continue;
      
      const extractedData = document.extractedData;
      
      // Add to processed documents list
      consolidatedData.processedDocuments.push({
        id: document.id,
        timestamp: document.timestamp,
        documentType: document.documentType || "Unknown"
      });
      
      // Process borrower data
      const borrowerData = extractedData.borrower || extractedData["SECTION I"] || {};
      if (Object.keys(borrowerData).length > 0) {
        // First name
        if (!consolidatedData.borrower.firstName && borrowerData.firstName) {
          consolidatedData.borrower.firstName = borrowerData.firstName;
        } else if (!consolidatedData.borrower.firstName && borrowerData["Borrower First Name"]) {
          consolidatedData.borrower.firstName = borrowerData["Borrower First Name"];
        }
        
        // Middle name
        if (!consolidatedData.borrower.middleName && borrowerData.middleName) {
          consolidatedData.borrower.middleName = borrowerData.middleName;
        } else if (!consolidatedData.borrower.middleName && borrowerData["Borrower Middle Name"]) {
          consolidatedData.borrower.middleName = borrowerData["Borrower Middle Name"];
        }
        
        // Last name
        if (!consolidatedData.borrower.lastName && borrowerData.lastName) {
          consolidatedData.borrower.lastName = borrowerData.lastName;
        } else if (!consolidatedData.borrower.lastName && borrowerData["Borrower Last Name"]) {
          consolidatedData.borrower.lastName = borrowerData["Borrower Last Name"];
        }
        
        // SSN
        if (!consolidatedData.borrower.ssn && borrowerData.ssn) {
          consolidatedData.borrower.ssn = borrowerData.ssn;
        } else if (!consolidatedData.borrower.ssn && borrowerData["Social Security Number"]) {
          consolidatedData.borrower.ssn = borrowerData["Social Security Number"];
        }
        
        // Date of Birth
        if (!consolidatedData.borrower.dateOfBirth && borrowerData.dateOfBirth) {
          consolidatedData.borrower.dateOfBirth = borrowerData.dateOfBirth;
        } else if (!consolidatedData.borrower.dateOfBirth && borrowerData["Date of Birth"]) {
          consolidatedData.borrower.dateOfBirth = borrowerData["Date of Birth"];
        }
        
        // Marital Status
        if (!consolidatedData.borrower.maritalStatus && borrowerData.maritalStatus) {
          consolidatedData.borrower.maritalStatus = borrowerData.maritalStatus;
        } else if (!consolidatedData.borrower.maritalStatus && borrowerData["Marital Status"]) {
          consolidatedData.borrower.maritalStatus = borrowerData["Marital Status"];
        }
        
        // Other fields follow the same pattern...
        if (!consolidatedData.borrower.citizenship && (borrowerData.citizenship || borrowerData["Citizenship Status"])) {
          consolidatedData.borrower.citizenship = borrowerData.citizenship || borrowerData["Citizenship Status"];
        }
        
        if (!consolidatedData.borrower.dependents && (borrowerData.dependents || borrowerData["Number of Dependents"])) {
          consolidatedData.borrower.dependents = borrowerData.dependents || borrowerData["Number of Dependents"];
        }
        
        if (!consolidatedData.borrower.email && (borrowerData.email || borrowerData["Email Address"])) {
          consolidatedData.borrower.email = borrowerData.email || borrowerData["Email Address"];
        }
        
        if (!consolidatedData.borrower.homePhone && (borrowerData.homePhone || borrowerData["Home Phone"])) {
          consolidatedData.borrower.homePhone = borrowerData.homePhone || borrowerData["Home Phone"];
        }
        
        if (!consolidatedData.borrower.mobilePhone && (borrowerData.mobilePhone || borrowerData["Mobile Phone"])) {
          consolidatedData.borrower.mobilePhone = borrowerData.mobilePhone || borrowerData["Mobile Phone"];
        }
        
        if (!consolidatedData.borrower.currentAddress && (borrowerData.currentAddress || borrowerData["Current Address"])) {
          consolidatedData.borrower.currentAddress = borrowerData.currentAddress || borrowerData["Current Address"];
        }
      }
      
      // Process assets data
      const financialData = extractedData.assets || extractedData["SECTION II"] || extractedData["Financial Information"] || {};
      const assetsData = financialData.assets || financialData["Assets"] || {};
      
      if (Object.keys(assetsData).length > 0) {
        if (!consolidatedData.assets.checkingAccounts && (assetsData.checkingAccounts || assetsData["Checking Account Balances"])) {
          consolidatedData.assets.checkingAccounts = assetsData.checkingAccounts || assetsData["Checking Account Balances"];
        }
        
        if (!consolidatedData.assets.savingsAccounts && (assetsData.savingsAccounts || assetsData["Savings Account Balances"])) {
          consolidatedData.assets.savingsAccounts = assetsData.savingsAccounts || assetsData["Savings Account Balances"];
        }
        
        if (!consolidatedData.assets.retirementAccounts && (assetsData.retirementAccounts || assetsData["Retirement Accounts"])) {
          consolidatedData.assets.retirementAccounts = assetsData.retirementAccounts || assetsData["Retirement Accounts"];
        }
        
        if (!consolidatedData.assets.stocksAndBonds && (assetsData.stocksAndBonds || assetsData["Stocks and Bonds"])) {
          consolidatedData.assets.stocksAndBonds = assetsData.stocksAndBonds || assetsData["Stocks and Bonds"];
        }
        
        if (!consolidatedData.assets.cashOnHand && (assetsData.cashOnHand || assetsData["Cash on Hand"])) {
          consolidatedData.assets.cashOnHand = assetsData.cashOnHand || assetsData["Cash on Hand"];
        }
      }
      
      // Process liabilities data
      const liabilitiesData = financialData.liabilities || financialData["Liabilities"] || {};
      
      if (Object.keys(liabilitiesData).length > 0) {
        if (!consolidatedData.liabilities.creditCardDebts && (liabilitiesData.creditCardDebts || liabilitiesData["Credit Card Debts"])) {
          consolidatedData.liabilities.creditCardDebts = liabilitiesData.creditCardDebts || liabilitiesData["Credit Card Debts"];
        }
        
        if (!consolidatedData.liabilities.autoLoans && (liabilitiesData.autoLoans || liabilitiesData["Auto Loans"])) {
          consolidatedData.liabilities.autoLoans = liabilitiesData.autoLoans || liabilitiesData["Auto Loans"];
        }
        
        if (!consolidatedData.liabilities.studentLoans && (liabilitiesData.studentLoans || liabilitiesData["Student Loans"])) {
          consolidatedData.liabilities.studentLoans = liabilitiesData.studentLoans || liabilitiesData["Student Loans"];
        }
        
        if (!consolidatedData.liabilities.mortgageBalances && (liabilitiesData.mortgageBalances || liabilitiesData["Mortgage Balances on Other Properties"])) {
          consolidatedData.liabilities.mortgageBalances = liabilitiesData.mortgageBalances || liabilitiesData["Mortgage Balances on Other Properties"];
        }
      }
      
      // Process property/real estate data
      const propertyData = extractedData.property || extractedData["SECTION III"] || extractedData["Real Estate"] || {};
      
      if (Object.keys(propertyData).length > 0) {
        if (!consolidatedData.property.address && (propertyData.address || propertyData["Property Address"])) {
          consolidatedData.property.address = propertyData.address || propertyData["Property Address"];
        }
        
        if (!consolidatedData.property.propertyType && propertyData.propertyType) {
          consolidatedData.property.propertyType = propertyData.propertyType;
        }
        
        if (!consolidatedData.property.occupancy && (propertyData.occupancy || propertyData["Intended Occupancy"])) {
          consolidatedData.property.occupancy = propertyData.occupancy || propertyData["Intended Occupancy"];
        }
        
        if (!consolidatedData.property.value && (propertyData.value || propertyData["Purchase Price"])) {
          consolidatedData.property.value = propertyData.value || propertyData["Purchase Price"];
        }
        
        if (!consolidatedData.property.loanAmount && (propertyData.loanAmount || propertyData["Loan Amount"])) {
          consolidatedData.property.loanAmount = propertyData.loanAmount || propertyData["Loan Amount"];
        }
      }
      
      // Process housing information
      if (Object.keys(propertyData).length > 0) {
        if (!consolidatedData.housing.monthlyPayment && (propertyData.monthlyPayment || propertyData["Monthly Mortgage Payment"])) {
          consolidatedData.housing.monthlyPayment = propertyData.monthlyPayment || propertyData["Monthly Mortgage Payment"];
        }
        
        if (!consolidatedData.housing.propertyTaxes && (propertyData.propertyTaxes || propertyData["Property Taxes"])) {
          consolidatedData.housing.propertyTaxes = propertyData.propertyTaxes || propertyData["Property Taxes"];
        }
        
        if (!consolidatedData.housing.insurance && propertyData.insurance) {
          consolidatedData.housing.insurance = propertyData.insurance;
        }
        
        if (!consolidatedData.housing.hoaFees && (propertyData.hoaFees || propertyData["HOA Fees"])) {
          consolidatedData.housing.hoaFees = propertyData.hoaFees || propertyData["HOA Fees"];
        }
      }
      
      // Process employment data
      const employmentData = extractedData.employment || extractedData["SECTION IV"] || {};
      const currentEmployment = employmentData.currentEmployment || employmentData["Current Employment"] || {};
      
      if (Object.keys(currentEmployment).length > 0) {
        const employerName = currentEmployment.employerName || currentEmployment["Employer Name"];
        
        if (employerName) {
          // Create employer object
          const employer = {
            name: employerName,
            position: currentEmployment.position || currentEmployment["Position/Title"],
            address: currentEmployment.address || currentEmployment["Street Address"],
            phone: currentEmployment.phone || currentEmployment["Phone Number"],
            isSelfEmployed: currentEmployment.isSelfEmployed || currentEmployment["Self-Employed"],
            startDate: currentEmployment.startDate || currentEmployment["Date of Employment Start"]
          };
          
          // Try to parse city/state/zip if provided as combined string
          if (currentEmployment["City, State, ZIP"]) {
            try {
              const parts = currentEmployment["City, State, ZIP"].split(',');
              if (parts.length > 0) employer.city = parts[0].trim();
              
              if (parts.length > 1) {
                const stateZip = parts[1].trim().split(' ');
                if (stateZip.length > 0) employer.state = stateZip[0].trim();
                if (stateZip.length > 1) employer.zip = stateZip[1].trim();
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
          
          // Check if this employer already exists
          let found = false;
          for (let i = 0; i < consolidatedData.employment.employers.length; i++) {
            if (consolidatedData.employment.employers[i].name === employerName) {
              found = true;
              break;
            }
          }
          
          // Only add if not already present
          if (!found) {
            consolidatedData.employment.employers.push(employer);
          }
        }
      }
      
      // Process income data
      const incomeData = extractedData.income || extractedData["SECTION V"] || {};
      
      if (Object.keys(incomeData).length > 0) {
        if (!consolidatedData.income.monthlyBase && (incomeData.monthlyBase || incomeData["Total Monthly Base Income"] || incomeData.base || incomeData["Base"])) {
          consolidatedData.income.monthlyBase = incomeData.monthlyBase || incomeData["Total Monthly Base Income"] || incomeData.base || incomeData["Base"];
        }
        
        if (!consolidatedData.income.monthlyOvertime && (incomeData.monthlyOvertime || incomeData["Overtime"])) {
          consolidatedData.income.monthlyOvertime = incomeData.monthlyOvertime || incomeData["Overtime"];
        }
        
        if (!consolidatedData.income.monthlyBonus && (incomeData.monthlyBonus || incomeData["Bonuses"])) {
          consolidatedData.income.monthlyBonus = incomeData.monthlyBonus || incomeData["Bonuses"];
        }
        
        if (!consolidatedData.income.monthlyCommission && (incomeData.monthlyCommission || incomeData["Commissions"])) {
          consolidatedData.income.monthlyCommission = incomeData.monthlyCommission || incomeData["Commissions"];
        }
      }
    }
    
    // Update the lead with the consolidated data
    const updatedMortgageData = {
      ...mortgageData,
      consolidated: consolidatedData
    };
    
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        mortgage_data: updatedMortgageData
      })
      .eq('id', leadId);
      
    if (updateError) {
      console.error("Error updating lead data:", updateError);
      throw new Error(`Error updating lead data: ${updateError.message}`);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Successfully consolidated mortgage data",
        processedDocuments: consolidatedData.processedDocuments,
        consolidatedData: consolidatedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error processing data:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process data"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
