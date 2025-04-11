
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

// Generate PDF from pitch deck data
async function generatePDF(pitchDeck: any) {
  try {
    console.log("Starting PDF generation for pitch deck:", pitchDeck.id);
    
    // Create new PDF document
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(pitchDeck.title, 105, 20, { align: 'center' });
    
    // Add client information if available
    let yPos = 35;
    
    if (pitchDeck.mortgage_data?.clientName) {
      doc.setFontSize(14);
      doc.text(`Prepared for: ${pitchDeck.mortgage_data.clientName}`, 20, yPos);
      yPos += 10;
      
      if (pitchDeck.mortgage_data?.clientAddress) {
        doc.setFontSize(12);
        doc.text(`Property Address: ${pitchDeck.mortgage_data.clientAddress}`, 20, yPos);
        yPos += 10;
      }
    }
    
    // Add loan officer information if available
    if (pitchDeck.mortgage_data?.loanOfficer?.name) {
      doc.setFontSize(12);
      doc.text(`Prepared by: ${pitchDeck.mortgage_data.loanOfficer.name}`, 20, yPos);
      yPos += 7;
      
      if (pitchDeck.mortgage_data?.loanOfficer?.nmlsId) {
        doc.setFontSize(10);
        doc.text(`NMLS ID: ${pitchDeck.mortgage_data.loanOfficer.nmlsId}`, 20, yPos);
        yPos += 7;
      }
      
      if (pitchDeck.mortgage_data?.loanOfficer?.companyName) {
        doc.setFontSize(10);
        doc.text(`${pitchDeck.mortgage_data.loanOfficer.companyName}`, 20, yPos);
        yPos += 7;
      }
    }
    
    // Add description if available
    if (pitchDeck.description) {
      doc.setFontSize(12);
      doc.text(`Description: ${pitchDeck.description}`, 20, yPos);
      yPos += 10;
    }
    
    // Add a divider
    doc.setDrawColor(200);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    // Add property value if available
    if (pitchDeck.mortgage_data?.propertyValue) {
      doc.setFontSize(14);
      doc.text(`Property Value: ${formatCurrency(pitchDeck.mortgage_data.propertyValue)}`, 20, yPos);
      yPos += 15;
    }
    
    // Current loan data
    doc.setFontSize(16);
    doc.text("Loan Details", 20, yPos);
    yPos += 10;
    
    if (pitchDeck.mortgage_data?.currentLoan) {
      doc.setFontSize(14);
      doc.text("Current Loan", 20, yPos);
      yPos += 10;
      
      const currentLoan = pitchDeck.mortgage_data.currentLoan;
      doc.setFontSize(10);
      doc.text(`Loan Balance: ${formatCurrency(currentLoan.balance || 0)}`, 25, yPos); yPos += 7;
      doc.text(`Interest Rate: ${(currentLoan.rate || 0).toFixed(3)}%`, 25, yPos); yPos += 7;
      doc.text(`Monthly Payment: ${formatCurrency(currentLoan.payment || 0)}`, 25, yPos); yPos += 7;
      doc.text(`Term: ${currentLoan.term || 30} years`, 25, yPos); yPos += 7;
      doc.text(`Type: ${currentLoan.type || 'Conventional'}`, 25, yPos); yPos += 7;
    }
    
    // Proposed loan data
    if (pitchDeck.mortgage_data?.proposedLoan) {
      doc.setFontSize(14);
      doc.text("Proposed Loan", 20, yPos);
      yPos += 10;
      
      const proposedLoan = pitchDeck.mortgage_data.proposedLoan;
      doc.setFontSize(10);
      doc.text(`Loan Amount: ${formatCurrency(proposedLoan.amount || 0)}`, 25, yPos); yPos += 7;
      doc.text(`Interest Rate: ${(proposedLoan.rate || 0).toFixed(3)}%`, 25, yPos); yPos += 7;
      doc.text(`Monthly Payment: ${formatCurrency(proposedLoan.payment || 0)}`, 25, yPos); yPos += 7;
      doc.text(`Term: ${proposedLoan.term || 30} years`, 25, yPos); yPos += 7;
      doc.text(`Type: ${proposedLoan.type || 'Conventional'}`, 25, yPos); yPos += 7;
    }
    
    // Savings information
    if (pitchDeck.mortgage_data?.savings) {
      doc.setFontSize(16);
      doc.text("Savings", 20, yPos);
      yPos += 10;
      
      const savings = pitchDeck.mortgage_data.savings;
      doc.setFontSize(10);
      doc.text(`Monthly Savings: ${formatCurrency(savings.monthly || 0)}`, 25, yPos); yPos += 7;
      doc.text(`Lifetime Savings: ${formatCurrency(savings.lifetime || 0)}`, 25, yPos); yPos += 12;
    }
    
    // Create comparison table
    if (pitchDeck.mortgage_data?.currentLoan && pitchDeck.mortgage_data?.proposedLoan) {
      doc.setFontSize(16);
      doc.text("Loan Comparison", 20, yPos);
      
      const currentLoan = pitchDeck.mortgage_data.currentLoan;
      const proposedLoan = pitchDeck.mortgage_data.proposedLoan;
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Feature', 'Current Loan', 'Proposed Loan', 'Difference']],
        body: [
          [
            'Principal', 
            formatCurrency(currentLoan.balance || 0),
            formatCurrency(proposedLoan.amount || 0),
            formatCurrency((proposedLoan.amount || 0) - (currentLoan.balance || 0))
          ],
          [
            'Interest Rate', 
            (currentLoan.rate || 0).toFixed(3) + '%',
            (proposedLoan.rate || 0).toFixed(3) + '%',
            ((proposedLoan.rate || 0) - (currentLoan.rate || 0)).toFixed(3) + '%'
          ],
          [
            'Monthly Payment', 
            formatCurrency(currentLoan.payment || 0),
            formatCurrency(proposedLoan.payment || 0),
            formatCurrency((proposedLoan.payment || 0) - (currentLoan.payment || 0))
          ],
          [
            'Term', 
            (currentLoan.term || 30) + ' years',
            (proposedLoan.term || 30) + ' years',
            ((proposedLoan.term || 0) - (currentLoan.term || 0)) + ' years'
          ]
        ],
      });
    }
    
    // Add date and loan officer details at the bottom
    const dateStr = new Date().toLocaleDateString();
    doc.setFontSize(8);
    doc.text(`Generated on: ${dateStr}`, 20, 285);
    
    // Add loan officer contact at the bottom if available
    if (pitchDeck.mortgage_data?.loanOfficer?.name) {
      let contactInfo = `Contact: ${pitchDeck.mortgage_data.loanOfficer.name}`;
      if (pitchDeck.mortgage_data?.loanOfficer?.nmlsId) {
        contactInfo += ` (NMLS ID: ${pitchDeck.mortgage_data.loanOfficer.nmlsId})`;
      }
      doc.text(contactInfo, 105, 285, { align: 'center' });
    }
    
    console.log("PDF generation completed successfully");
    
    // Return the PDF as a base64 string
    return doc.output('datauristring');
  } catch (err) {
    console.error("Error generating PDF:", err);
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
