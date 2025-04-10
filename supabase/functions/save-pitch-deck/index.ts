
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
  // Create new PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text(pitchDeck.title, 105, 20, { align: 'center' });
  
  // Add description if available
  if (pitchDeck.description) {
    doc.setFontSize(12);
    doc.text(`Description: ${pitchDeck.description}`, 20, 35);
  }
  
  // Add a divider
  doc.setDrawColor(200);
  doc.line(20, 40, 190, 40);
  
  // Client information if available
  doc.setFontSize(16);
  doc.text("Loan Details", 20, 50);
  
  // Current loan data
  if (pitchDeck.mortgage_data?.currentLoan) {
    doc.setFontSize(14);
    doc.text("Current Loan", 20, 60);
    
    const currentLoan = pitchDeck.mortgage_data.currentLoan;
    doc.setFontSize(10);
    doc.text(`Loan Balance: ${formatCurrency(currentLoan.balance || 0)}`, 25, 70);
    doc.text(`Interest Rate: ${(currentLoan.rate || 0).toFixed(3)}%`, 25, 77);
    doc.text(`Monthly Payment: ${formatCurrency(currentLoan.payment || 0)}`, 25, 84);
    doc.text(`Term: ${currentLoan.term || 30} years`, 25, 91);
    doc.text(`Type: ${currentLoan.type || 'Conventional'}`, 25, 98);
  }
  
  // Proposed loan data
  if (pitchDeck.mortgage_data?.proposedLoan) {
    doc.setFontSize(14);
    doc.text("Proposed Loan", 110, 60);
    
    const proposedLoan = pitchDeck.mortgage_data.proposedLoan;
    doc.setFontSize(10);
    doc.text(`Loan Amount: ${formatCurrency(proposedLoan.amount || 0)}`, 115, 70);
    doc.text(`Interest Rate: ${(proposedLoan.rate || 0).toFixed(3)}%`, 115, 77);
    doc.text(`Monthly Payment: ${formatCurrency(proposedLoan.payment || 0)}`, 115, 84);
    doc.text(`Term: ${proposedLoan.term || 30} years`, 115, 91);
    doc.text(`Type: ${proposedLoan.type || 'Conventional'}`, 115, 98);
  }
  
  // Savings information
  if (pitchDeck.mortgage_data?.savings) {
    doc.setFontSize(16);
    doc.text("Savings", 20, 115);
    
    const savings = pitchDeck.mortgage_data.savings;
    doc.setFontSize(10);
    doc.text(`Monthly Savings: ${formatCurrency(savings.monthly || 0)}`, 25, 125);
    doc.text(`Lifetime Savings: ${formatCurrency(savings.lifetime || 0)}`, 25, 132);
  }
  
  // Create comparison table
  if (pitchDeck.mortgage_data?.currentLoan && pitchDeck.mortgage_data?.proposedLoan) {
    doc.setFontSize(16);
    doc.text("Loan Comparison", 20, 150);
    
    const currentLoan = pitchDeck.mortgage_data.currentLoan;
    const proposedLoan = pitchDeck.mortgage_data.proposedLoan;
    
    autoTable(doc, {
      startY: 155,
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
  
  // Add date at the bottom
  const dateStr = new Date().toLocaleDateString();
  doc.setFontSize(8);
  doc.text(`Generated on: ${dateStr}`, 20, 285);
  
  // Return the PDF as a base64 string
  return doc.output('datauristring');
}

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request headers
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized: Invalid user token');
    }
    
    // Parse request body
    const { action, pitchDeckData, pitchDeckId, generatePdf } = await req.json();
    
    let responseData;
    let pdfData = null;
    
    console.log(`Action: ${action}, User ID: ${user.id}, Generate PDF: ${generatePdf}`);
    
    switch (action) {
      case 'save':
        // Check if this is an update or create
        if (pitchDeckId) {
          // Update existing pitch deck
          console.log(`Updating pitch deck ${pitchDeckId}`);
          
          const { data: updatedDeck, error: updateError } = await supabase
            .from('pitch_decks')
            .update({ 
              ...pitchDeckData, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', pitchDeckId)
            .eq('created_by', user.id)
            .select('*')
            .single();
            
          if (updateError) {
            console.error('Update error details:', updateError);
            throw new Error(`Failed to update pitch deck: ${updateError.message}`);
          }
          
          console.log('Successfully updated pitch deck');
          responseData = { success: true, data: updatedDeck };
          
          // Generate PDF if requested
          if (generatePdf && updatedDeck) {
            pdfData = await generatePDF(updatedDeck);
          }
        } else {
          // Create new pitch deck
          console.log('Creating new pitch deck');
          
          const { data: newDeck, error: createError } = await supabase
            .from('pitch_decks')
            .insert({
              ...pitchDeckData,
              created_by: user.id,
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
            pdfData = await generatePDF(newDeck);
          }
        }
        break;
        
      case 'get-pdf':
        // Get pitch deck and generate PDF
        console.log(`Generating PDF for pitch deck ${pitchDeckId}`);
        
        const { data: deckData, error: getError } = await supabase
          .from('pitch_decks')
          .select('*')
          .eq('id', pitchDeckId)
          .eq('created_by', user.id)
          .single();
          
        if (getError) {
          throw new Error(`Failed to get pitch deck: ${getError.message}`);
        }
        
        if (deckData) {
          pdfData = await generatePDF(deckData);
          responseData = { success: true, data: { id: pitchDeckId } };
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
        status: 400,
      }
    );
  }
});
