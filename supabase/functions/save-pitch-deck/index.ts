
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1'
import autoTable from 'https://esm.sh/jspdf-autotable@3.8.2'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client with service role key to bypass RLS
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Format currency for PDF generation
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Format percentage for PDF generation
const formatPercentage = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(value / 100);
};

// Generate PDF from pitch deck data
async function generatePDF(pitchDeck: any) {
  try {
    console.log("Starting enhanced PDF generation for pitch deck:", pitchDeck.id);
    
    // Create new PDF document
    const doc = new jsPDF();
    const primaryColor = [0, 174, 239]; // Light blue color (#00AEEF)
    const secondaryColor = [255, 242, 0]; // Yellow color (#FFF200)
    
    // Helper function to add a colored header
    const addHeader = (text: string, y: number) => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(20, y, 170, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(text, 105, y + 7, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
    };

    // Add company logo or title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(pitchDeck.title, 105, 20, { align: 'center' });
    
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${currentDate}`, 20, 30);
    
    // PAGE 1: CURRENT SITUATION ANALYSIS
    addHeader("Current Situation Analysis", 40);
    
    // Current situation text
    doc.setFontSize(10);
    doc.text(
      "Often times when a homeowner does a mortgage analysis, they only review the " +
      "mortgage numbers. However, to get a clearer overall financial picture, we provide " +
      "clients with a general overview of the expenses associated with living in their specific " +
      "state. This analysis is designed to give you an idea as to how much cash flow is " +
      "remaining at the end of every month - once all your expenses are accounted for.", 
      20, 60, { maxWidth: 170, align: 'left' }
    );
    
    // Monthly Income Analysis Table
    const incomeData = [
      ['Your Gross Monthly Income', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.income || 0)],
      ['Taxes', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.taxes || 0)],
      ['Current Mortgage*', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.payment || 0)],
      ['Installment Loans*', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.installmentLoans || 0)],
      ['Credit Cards*', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.creditCards || 0)],
      ['Utilities*', '#N/A'],
      ['Auto Insurance**', '#N/A'],
      ['Healthcare & Insurance**', '#N/A'],
      ['Gasoline**', '#N/A'],
      ['Cell Phone**', formatCurrency(-130)],
      ['Food**', formatCurrency(-240)],
      ['Emergency Fund', ''],
      ['Entertainment', ''],
    ];
    
    autoTable(doc, {
      startY: 85,
      head: [],
      body: incomeData,
      theme: 'grid',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 70, halign: 'right' }
      }
    });
    
    // Add discretionary income row with special coloring
    const lastY = (doc as any).lastAutoTable.finalY;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(20, lastY, 100, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("Discretionary Income", 25, lastY + 7);
    doc.setTextColor(0, 0, 0);
    
    doc.setFillColor(255, 200, 200);  // Light red
    doc.rect(120, lastY, 70, 10, 'F');
    doc.text("#N/A", 180, lastY + 7, { align: 'right' });
    
    // Add notes
    doc.setFontSize(8);
    doc.text("*Based on your credit report.", 20, lastY + 20);
    doc.text("**Based on an average household of your size.", 20, lastY + 25);
    
    // Add goal statement
    doc.setFontSize(10);
    doc.text(
      "Our goal is to make sure that we put our borrowers in a better financial position and " +
      "increase their overall enjoyment of life. We accomplish this by finding hidden areas in your " +
      "mortgage and expenses that can be reallocated to your entertainment, family, future, and " +
      "financial freedom.",
      20, lastY + 40, { maxWidth: 170 }
    );
    
    // Add Refinance Goals
    addHeader("Refinance Goals", lastY + 55);
    
    // Add bullet points for goals
    const goals = pitchDeck.mortgage_data?.goals || [];
    const goalStrings = goals.length > 0 ? goals : ["Lower monthly payment", "Reduce interest rate", "Consolidate debt"];
    
    let goalY = lastY + 70;
    goalStrings.forEach(goal => {
      doc.text(`• ${goal}`, 30, goalY);
      goalY += 7;
    });
    
    // Add contact footer
    let footerY = 250;
    doc.setFontSize(9);
    doc.text(
      "Always feel free to contact me directly\nwith any questions. My goal is to assist\nyou with your financing. Let me know\nhow I can help you!",
      20, footerY
    );
    
    const contactInfo = pitchDeck.mortgage_data?.contactInfo || {
      address: "250 Commerce, Suite 220, Irvine, CA 92614",
      office: "",
      fax: "",
      website: "www.example.com"
    };
    
    doc.text(contactInfo.address, 130, footerY);
    doc.text(`Office: ${contactInfo.office}`, 130, footerY + 7);
    doc.text(`Fax: ${contactInfo.fax || ""}`, 130, footerY + 14);
    doc.setTextColor(0, 0, 255);
    doc.text(contactInfo.website || "", 130, footerY + 21);
    doc.setTextColor(0, 0, 0);
    
    // PAGE 2: LOAN SOLUTIONS
    doc.addPage();
    
    // Add header
    const loanConsultant = pitchDeck.mortgage_data?.loanConsultant || "Mortgage Advisor";
    doc.text(`DATE: ${currentDate}`, 150, 15, { align: 'right' });
    doc.text(`Loan Consultant: ${loanConsultant}`, 150, 22, { align: 'right' });
    
    // Add title
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(20, 30, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("LOAN SOLUTIONS", 105, 37, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Add introduction text
    doc.text(
      "Thank you for taking the time to and for choosing us for the refinancing of your mortgage. " +
      "This decision is a very important one, and I want to make sure you have all the available information necessary to make an educated decision, " +
      "one that you will be happy with years after we close your loan.",
      20, 50, { maxWidth: 170 }
    );
    
    // Add instruction text in blue
    doc.setTextColor(0, 0, 255);
    doc.text(
      "Please review the pre-approved options below, select which option looks best to you, and send back with the rest of the required loan disclosures per our request.",
      20, 70, { maxWidth: 170 }
    );
    doc.setTextColor(0, 0, 0);
    
    // Option 1: Lowest Rate
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(20, 85, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Lowest Rate", 105, 92, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    // Option 1 details
    const option1Data = [
      ['Interest Rate:', (pitchDeck.mortgage_data?.proposedLoan?.rate || 0).toFixed(3) + '%'],
      ['Prepaid Interest:', formatCurrency(pitchDeck.mortgage_data?.proposedLoan?.prepaidInterest || 0)],
      ['New Loan Balance:', formatCurrency(pitchDeck.mortgage_data?.proposedLoan?.amount || 0)],
      ['Term:', `${pitchDeck.mortgage_data?.proposedLoan?.term || 30} years`],
      ['Principal and Interest:', formatCurrency(pitchDeck.mortgage_data?.proposedLoan?.payment || 0)]
    ];
    
    autoTable(doc, {
      startY: 95,
      head: [],
      body: option1Data,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'right' }
      }
    });
    
    // Add yellow box with total
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(120, 130, 70, 25, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("SOLUTION 1", 125, 140);
    doc.text("TOTAL PAYMENTS", 125, 148);
    doc.setFontSize(18);
    doc.text(formatCurrency(pitchDeck.mortgage_data?.proposedLoan?.payment || 0), 155, 148, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    
    // Add benefits text
    doc.setFontSize(10);
    doc.text(
      `By refinancing your loan you will receive ${formatCurrency(pitchDeck.mortgage_data?.savings?.cashOut || 0)} Cash back. ` +
      "The interest on your mortgage may be tax deductible, so please consult an accountant.",
      200, 110, { maxWidth: 70, align: 'left' }
    );
    
    // Option 2: Low Cost
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(20, 165, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Low Cost", 105, 172, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    // Option 2 details - slightly different rate
    const option2Rate = ((pitchDeck.mortgage_data?.proposedLoan?.rate || 0) + 0.125);
    const option2Data = [
      ['Interest Rate:', option2Rate.toFixed(3) + '%'],
      ['Prepaid Interest:', formatCurrency((pitchDeck.mortgage_data?.proposedLoan?.prepaidInterest || 0) * 0.5)],
      ['New Loan Balance:', formatCurrency(pitchDeck.mortgage_data?.proposedLoan?.amount || 0)],
      ['Term:', `${pitchDeck.mortgage_data?.proposedLoan?.term || 30} years`],
      ['Principal and Interest:', formatCurrency((pitchDeck.mortgage_data?.proposedLoan?.payment || 0) * 1.05)]
    ];
    
    autoTable(doc, {
      startY: 175,
      head: [],
      body: option2Data,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'right' }
      }
    });
    
    // Add yellow box with total
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(120, 210, 70, 25, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("SOLUTION 2", 125, 220);
    doc.text("TOTAL PAYMENTS", 125, 228);
    doc.setFontSize(18);
    doc.text(formatCurrency((pitchDeck.mortgage_data?.proposedLoan?.payment || 0) * 1.05), 155, 228, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    
    // Add benefits text
    doc.setFontSize(10);
    doc.text(
      `Option 1 has ${formatCurrency(pitchDeck.mortgage_data?.proposedLoan?.prepaidInterest || 0)} of prepaid interest for a lower rate. ` +
      `Option 2 has less prepaid interest. The hard cost for both loans in your state of ${pitchDeck.mortgage_data?.state || "CA"} is ${formatCurrency(2690)}.`,
      200, 190, { maxWidth: 70, align: 'left' }
    );
    
    // Current Situation (Option 3)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(20, 245, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Current Situation", 105, 252, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    // Current situation details
    const option3Data = [
      ['Interest Rate:', (pitchDeck.mortgage_data?.currentLoan?.rate || 0).toFixed(3) + '%'],
      ['Lender Credit:', formatCurrency(0)],
      ['Current Loan Balance:', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.balance || 0)],
      ['Term:', `${pitchDeck.mortgage_data?.currentLoan?.term || 30} years`],
      ['Principal and Interest (Plus mortgage insurance):', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.payment || 0)]
    ];
    
    autoTable(doc, {
      startY: 255,
      head: [],
      body: option3Data,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'right' }
      }
    });
    
    // Add red box with total
    doc.setFillColor(255, 0, 0);
    doc.rect(120, 290, 70, 25, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("SOLUTION 3", 125, 300);
    doc.text("TOTAL PAYMENTS", 125, 308);
    doc.setFontSize(18);
    doc.text("#VALUE!", 155, 308, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Add footer with contact info again
    footerY = 330;
    doc.setFontSize(9);
    doc.text(
      "Always feel free to contact me directly\nwith any questions. My goal is to assist\nyou with your financing. Let me know\nhow I can help you!",
      20, footerY
    );
    
    doc.text(contactInfo.address, 130, footerY);
    doc.text(`Office: ${contactInfo.office}`, 130, footerY + 7);
    doc.text(`Fax: ${contactInfo.fax || ""}`, 130, footerY + 14);
    doc.setTextColor(0, 0, 255);
    doc.text(contactInfo.website || "", 130, footerY + 21);
    doc.setTextColor(0, 0, 0);
    
    // PAGE 3: DETAILED LOAN COMPARISON
    doc.addPage();
    
    // Create three column comparison table
    const colWidth = 170 / 3;
    
    // Create headers for the three sections
    // Loan Payoffs section
    doc.setFillColor(0, 0, 0);
    doc.rect(20, 20, colWidth, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("💰Loan Payoffs", 25, 27);
    
    // Current Loan Information section
    doc.setFillColor(150, 150, 150);
    doc.rect(20 + colWidth, 20, colWidth, 10, 'F');
    doc.text("🏠Current Loan Information", 25 + colWidth, 27);
    
    // New Loan Information section
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(20 + 2 * colWidth, 20, colWidth, 10, 'F');
    doc.text("🏠New Loan Information", 25 + 2 * colWidth, 27);
    doc.setTextColor(0, 0, 0);
    
    // Loan Payoffs content
    doc.setFontSize(10);
    const payoffData = [
      ['Current Loan Balance', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.balance || 0)],
      ['Remaining Monthly Payments', pitchDeck.mortgage_data?.currentLoan?.remainingPayments || 0],
      ['Payment (P.I.M.I)', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.payment || 0)],
      ['Revolving Debt', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.revolvingDebt || 0)],
      ['Minimum Payment', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.minPayment || 0)],
      ['Installment Debt', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.installmentDebt || 0)],
      ['Payment', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.installmentPayment || 0)],
    ];
    
    autoTable(doc, {
      startY: 35,
      head: [],
      body: payoffData,
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: colWidth - 85, halign: 'right' }
      },
      margin: { left: 20 }
    });
    
    // Loan Benefits
    const lastY1 = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Loan Benefits", 25, lastY1 + 10);
    doc.setFont('helvetica', 'normal');
    
    const benefitsData = [
      ['Cash to You!', formatCurrency(pitchDeck.mortgage_data?.savings?.cashOut || 0)],
      ['#VALUE!', '#VALUE!'],
      ['#VALUE!', '#VALUE!'],
    ];
    
    autoTable(doc, {
      startY: lastY1 + 15,
      head: [],
      body: benefitsData,
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: colWidth - 85, halign: 'right' }
      },
      margin: { left: 20 }
    });
    
    const benefitsY = (doc as any).lastAutoTable.finalY;
    doc.text("#VALUE!", 25, benefitsY + 10);
    
    // Current Loan Information content
    doc.setFontSize(10);
    doc.text(`Interest Rate: ${(pitchDeck.mortgage_data?.currentLoan?.rate || 0).toFixed(3)}%`, 25 + colWidth, 40);
    
    // Current Loan Details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Current Loan Details", 25 + colWidth, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const currentLoanData = [
      ['Aggregate Payments', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.aggregatePayments || 0)],
      ['Current Mortgage Balance', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.balance || 0)],
      ['Remaining Term', `${Math.floor((pitchDeck.mortgage_data?.currentLoan?.remainingPayments || 0) / 12)} Years, ${(pitchDeck.mortgage_data?.currentLoan?.remainingPayments || 0) % 12} Months`],
      ['Total Interest', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.totalInterest || 0)],
      ['Total Payments', formatCurrency(pitchDeck.mortgage_data?.currentLoan?.totalPayments || 0)],
    ];
    
    autoTable(doc, {
      startY: 65,
      head: [],
      body: currentLoanData,
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: colWidth - 85, halign: 'right' }
      },
      margin: { left: 20 + colWidth }
    });
    
    // Total Cost of Loan
    const currentLoanY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Total Cost of Loan", 25 + colWidth, currentLoanY + 10);
    doc.setFont('helvetica', 'normal');
    
    doc.setFontSize(18);
    doc.text(formatCurrency(pitchDeck.mortgage_data?.currentLoan?.totalCost || 0), 25 + colWidth + colWidth/2, currentLoanY + 30, { align: 'center' });
    
    // New Loan Information content
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("New Loan Details", 25 + 2 * colWidth, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const newLoanData = [
      ['Monthly Payment (+ MIP if applicable)', '#VALUE!'],
      ['Monthly Payment + Escrows', 'No Escrow'],
      ['New Loan Amount', formatCurrency(pitchDeck.mortgage_data?.proposedLoan?.amount || 0)],
      ['Term in Years', pitchDeck.mortgage_data?.proposedLoan?.term || 30],
      ['Total Loan Interest', formatCurrency(pitchDeck.mortgage_data?.proposedLoan?.totalInterest || 0)],
      ['Total Payments', formatCurrency(pitchDeck.mortgage_data?.proposedLoan?.totalPayments || 0)],
      ['Interest Rate', (pitchDeck.mortgage_data?.proposedLoan?.rate || 0).toFixed(3) + '%'],
      ['Titan Lender Fees', formatCurrency(2690)],
      ['3rd party fees', formatCurrency(0)],
      ['Prepaid Interest to Secure Below Market Interest Rate', formatCurrency(pitchDeck.mortgage_data?.proposedLoan?.prepaidInterest || 0)],
      ['Upfront Mortgage Insurance/Funding Fee', '#DIV/0!'],
      ['Monthly MIP', formatCurrency(0)],
      ['Escrow Impounds/Prepaids', formatCurrency(0)],
      ['Monthly Escrow Contribution', formatCurrency(0)],
      ['APR', '#VALUE!'],
    ];
    
    autoTable(doc, {
      startY: 45,
      head: [],
      body: newLoanData,
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: colWidth - 85, halign: 'right' }
      },
      margin: { left: 20 + 2 * colWidth }
    });
    
    // Value highlights
    const newLoanY = (doc as any).lastAutoTable.finalY;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("#VALUE!", 25 + 2 * colWidth + colWidth/2, newLoanY + 10, { align: 'center' });
    
    doc.setFontSize(18);
    doc.text("#VALUE!", 25 + 2 * colWidth + colWidth/2, newLoanY + 25, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Disclaimer text
    doc.setFontSize(7);
    doc.text(
      "**This is not a commitment to lend or an approval of a loan, your application will be subject to underwriting approval and possibly an acceptable property appraisal. " + 
      "This is only an estimate based on the preliminary terms discussed. These terms may not be accurate and the actual terms of a new loan may be different based on your individual circumstances " +
      "including the interest rate, loan amount and term of the loan. All terms are subject to change based on your individual circumstances at approval. Please review your loan disclosures upon receipt, including the Loan Estimate for actual terms, fees and conditions.",
      20, 280, { maxWidth: 170 }
    );
    
    doc.text(
      "**\"Total Savings\" is the difference between your current loan and the estimates of a new loan including interest, over the life of the loan. " +
      "\"Payoff Accelerator Option\" is applicable only if the difference between your current loan payment and the estimated new loan payment is applied to the outstanding principal balance of the estimated new loan on a monthly basis.**",
      20, 295, { maxWidth: 170 }
    );

    console.log("Enhanced PDF generation completed successfully");
    
    // Return the PDF as a base64 string
    return doc.output('datauristring');
  } catch (err) {
    console.error("Error generating enhanced PDF:", err);
    throw new Error(`PDF generation failed: ${err.message}`);
  }
}

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestBody = await req.json();
    console.log("Received request with action:", requestBody.action);
    
    const { action, pitchDeckData, pitchDeckId, generatePdf, token } = requestBody;
    
    // Check for token - either from headers or from the request body (for function-to-function calls)
    let authToken = req.headers.get('Authorization');
    if (authToken) {
      authToken = authToken.replace('Bearer ', '');
    } else if (token) {
      authToken = token;
      console.log("Using token from request body");
    }
    
    let userId = null;
    
    // Get user from token if provided
    if (authToken) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
        
        if (!userError && user) {
          userId = user.id;
          console.log(`Authenticated as user: ${userId}`);
        } else {
          console.log('Token provided but user not found or error occurred');
          // Continue without user ID for public access endpoints
        }
      } catch (error) {
        console.log('Error verifying token:', error.message);
        // Continue without user ID for public access endpoints
      }
    }
    
    let responseData;
    let pdfData = null;
    
    console.log(`Action: ${action}, User ID: ${userId || 'Not authenticated'}`);
    
    switch (action) {
      case 'save':
        // Check if this is an update or create
        if (pitchDeckId) {
          // Update existing pitch deck
          console.log(`Updating pitch deck ${pitchDeckId}`);
          
          // If userId is available, check ownership
          const query = supabase
            .from('pitch_decks')
            .update({ 
              ...pitchDeckData, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', pitchDeckId);
          
          // Add user check if userId is available
          if (userId) {
            query.eq('created_by', userId);
          }
            
          const { data: updatedDeck, error: updateError } = await query.select('*').single();
            
          if (updateError) {
            console.error('Update error details:', updateError);
            throw new Error(`Failed to update pitch deck: ${updateError.message}`);
          }
          
          console.log('Successfully updated pitch deck');
          responseData = { success: true, data: updatedDeck };
          
          // Generate PDF if requested
          if (generatePdf && updatedDeck) {
            try {
              pdfData = await generatePDF(updatedDeck);
            } catch (pdfError) {
              console.error('PDF generation error:', pdfError);
              // Continue without throwing to return the updated deck data
            }
          }
        } else if (userId) {
          // Create new pitch deck - requires authentication
          console.log('Creating new pitch deck');
          
          const { data: newDeck, error: createError } = await supabase
            .from('pitch_decks')
            .insert({
              ...pitchDeckData,
              created_by: userId,
            })
            .select('*')
            .single();
            
          if (createError) {
            console.error('Create error details:', createError);
            throw new Error(`Failed to create pitch deck: ${createError.message}`);
          }
          
          console.log('Successfully created pitch deck:', newDeck);
          responseData = { success: true, data: newDeck };
          
          // Generate PDF if requested
          if (generatePdf && newDeck) {
            try {
              pdfData = await generatePDF(newDeck);
            } catch (pdfError) {
              console.error('PDF generation error:', pdfError);
              // Continue without throwing to return the created deck data
            }
          }
        } else {
          throw new Error('Authentication required to create a pitch deck');
        }
        break;
        
      case 'get-pdf':
        // Get pitch deck and generate PDF
        console.log(`Generating PDF for pitch deck ${pitchDeckId}`);
        
        if (!pitchDeckId) {
          throw new Error('Missing required parameter: pitchDeckId');
        }
        
        const deckQuery = supabase
          .from('pitch_decks')
          .select('*')
          .eq('id', pitchDeckId);
        
        // Add user check if userId is available  
        if (userId) {
          deckQuery.eq('created_by', userId);
        }
        
        const { data: deckData, error: getError } = await deckQuery.single();
          
        if (getError) {
          console.error('Error fetching pitch deck:', getError);
          throw new Error(`Failed to get pitch deck: ${getError.message}`);
        }
        
        if (!deckData) {
          throw new Error(`Pitch deck not found with ID: ${pitchDeckId}`);
        }
        
        console.log("Pitch deck found, generating PDF...");
        
        try {
          pdfData = await generatePDF(deckData);
          console.log("PDF generated successfully, length:", pdfData.length);
          responseData = { success: true, data: { id: pitchDeckId } };
        } catch (pdfError) {
          console.error('PDF generation error:', pdfError);
          throw new Error(`Failed to generate PDF: ${pdfError.message}`);
        }
        break;
        
      default:
        throw new Error(`Invalid action: ${action}`);
    }
    
    // Add PDF data to response if generated
    if (pdfData) {
      responseData.pdfData = pdfData;
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in save-pitch-deck function: ${error.message}`);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
