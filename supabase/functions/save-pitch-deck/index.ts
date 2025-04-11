
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'https://cdn.skypack.dev/pdf-lib@1.17.1';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client with service role key to bypass RLS
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to generate a URL slug
function generateSlug(title: string, lastName: string = '') {
  // Create base from last name if available
  let slug = lastName ? `${lastName.toLowerCase()}-` : '';
  
  // Add title to slug, sanitized
  slug += title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')  // Remove special chars
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Remove consecutive hyphens
    + '-home-solution';
    
  return slug;
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
    const { action, pitchDeckData, pitchDeckId, generatePdf = true } = await req.json();
    
    console.log(`Action: ${action}, User ID: ${user.id}`);
    
    let responseData;
    
    switch (action) {
      case 'save':
        // Process pitch deck data before saving
        let dataToSave = { ...pitchDeckData };
        
        // Generate a unique slug for the pitch deck if not already present
        if (!dataToSave.slug) {
          // Try to get lead details if lead_id is available
          let lastName = '';
          if (dataToSave.lead_id) {
            const { data: leadData } = await supabase
              .from('leads')
              .select('last_name')
              .eq('id', dataToSave.lead_id)
              .single();
              
            if (leadData && leadData.last_name) {
              lastName = leadData.last_name;
            }
          }
          
          dataToSave.slug = generateSlug(dataToSave.title, lastName);
        }
        
        console.log('Saving pitch deck with data:', dataToSave);
        
        // If we have an existing pitch deck, update it
        if (pitchDeckId) {
          const { data: updateData, error: updateError } = await supabase
            .from('pitch_decks')
            .update({
              ...dataToSave,
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
          
          console.log('Successfully updated pitch deck:', updateData);
          responseData = { success: true, data: updateData };
        } else {
          // Create new pitch deck
          const { data: newDeckData, error: createError } = await supabase
            .from('pitch_decks')
            .insert({
              ...dataToSave,
              created_by: user.id,
            })
            .select('*')
            .single();
            
          if (createError) {
            console.error('Create error details:', createError);
            throw new Error(`Failed to create pitch deck: ${createError.message}`);
          }
          
          console.log('Successfully created pitch deck:', newDeckData);
          responseData = { success: true, data: newDeckData };
        }
        break;
        
      case 'get-pdf':
        if (!pitchDeckId) {
          throw new Error('Pitch deck ID is required');
        }
        
        // Get the pitch deck data
        const { data: deckData, error: getDeckError } = await supabase
          .from('pitch_decks')
          .select('*')
          .eq('id', pitchDeckId)
          .eq('created_by', user.id)
          .single();
          
        if (getDeckError || !deckData) {
          console.error('Get deck error:', getDeckError);
          throw new Error(`Failed to get pitch deck: ${getDeckError?.message || 'Not found'}`);
        }
        
        // Generate PDF
        console.log('Generating PDF for pitch deck:', deckData.title);
        
        const pdfDoc = await PDFDocument.create();
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // Create first page - Current Situation Analysis
        const page1 = pdfDoc.addPage(PageSizes.LETTER);
        const { width, height } = page1.getSize();
        const margin = 50;
        
        // Title
        page1.drawText(`${deckData.title}`, {
          x: margin,
          y: height - margin,
          size: 24,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.4)
        });
        
        // Current situation heading
        page1.drawText(`Current Situation Analysis`, {
          x: margin,
          y: height - margin - 50,
          size: 18,
          font: helveticaBold,
          color: rgb(0.2, 0.2, 0.5)
        });
        
        // Current loan details
        const currentLoan = deckData.mortgage_data?.currentLoan || {};
        page1.drawText(`Current Mortgage Overview`, {
          x: margin,
          y: height - margin - 100,
          size: 14,
          font: helveticaBold,
        });
        
        page1.drawText(`Loan Balance: $${Number(currentLoan.balance || 0).toLocaleString()}`, {
          x: margin,
          y: height - margin - 130,
          size: 12,
          font: helveticaFont,
        });
        
        page1.drawText(`Interest Rate: ${Number(currentLoan.rate || 0).toFixed(3)}%`, {
          x: margin,
          y: height - margin - 150,
          size: 12,
          font: helveticaFont,
        });
        
        page1.drawText(`Monthly Payment: $${Number(currentLoan.payment || 0).toLocaleString()}`, {
          x: margin,
          y: height - margin - 170,
          size: 12,
          font: helveticaFont,
        });
        
        page1.drawText(`Loan Term: ${Number(currentLoan.term || 0)} years`, {
          x: margin,
          y: height - margin - 190,
          size: 12,
          font: helveticaFont,
        });
        
        page1.drawText(`Loan Type: ${currentLoan.type || 'N/A'}`, {
          x: margin,
          y: height - margin - 210,
          size: 12,
          font: helveticaFont,
        });
        
        // Financial impact section
        page1.drawText(`Financial Impact Assessment`, {
          x: margin,
          y: height - margin - 250,
          size: 14,
          font: helveticaBold,
        });
        
        const totalInterest = currentLoan.balance * (currentLoan.rate / 100) * currentLoan.term;
        page1.drawText(`Estimated Total Interest Over Life of Loan: $${Math.round(totalInterest).toLocaleString()}`, {
          x: margin,
          y: height - margin - 280,
          size: 12,
          font: helveticaFont,
        });
        
        // Create second page - Loan Solutions
        const page2 = pdfDoc.addPage(PageSizes.LETTER);
        
        // Title
        page2.drawText(`Loan Solutions & Recommendations`, {
          x: margin,
          y: height - margin,
          size: 20,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.4)
        });
        
        // Proposed loan details
        const proposedLoan = deckData.mortgage_data?.proposedLoan || {};
        page2.drawText(`Proposed Mortgage Solution`, {
          x: margin,
          y: height - margin - 50,
          size: 16,
          font: helveticaBold,
          color: rgb(0.2, 0.5, 0.2)
        });
        
        page2.drawText(`Loan Amount: $${Number(proposedLoan.amount || 0).toLocaleString()}`, {
          x: margin,
          y: height - margin - 80,
          size: 12,
          font: helveticaFont,
        });
        
        page2.drawText(`Interest Rate: ${Number(proposedLoan.rate || 0).toFixed(3)}%`, {
          x: margin,
          y: height - margin - 100,
          size: 12,
          font: helveticaFont,
        });
        
        page2.drawText(`Monthly Payment: $${Number(proposedLoan.payment || 0).toLocaleString()}`, {
          x: margin,
          y: height - margin - 120,
          size: 12,
          font: helveticaFont,
        });
        
        page2.drawText(`Loan Term: ${Number(proposedLoan.term || 0)} years`, {
          x: margin,
          y: height - margin - 140,
          size: 12,
          font: helveticaFont,
        });
        
        page2.drawText(`Loan Type: ${proposedLoan.type || 'N/A'}`, {
          x: margin,
          y: height - margin - 160,
          size: 12,
          font: helveticaFont,
        });
        
        // Benefits section
        page2.drawText(`Benefits of This Solution`, {
          x: margin,
          y: height - margin - 200,
          size: 16,
          font: helveticaBold,
        });
        
        const savings = deckData.mortgage_data?.savings || {};
        page2.drawText(`Monthly Savings: $${Number(savings.monthly || 0).toLocaleString()}`, {
          x: margin,
          y: height - margin - 230,
          size: 14,
          font: helveticaBold,
          color: rgb(0.2, 0.6, 0.2)
        });
        
        page2.drawText(`Lifetime Savings: $${Number(savings.lifetime || 0).toLocaleString()}`, {
          x: margin,
          y: height - margin - 250,
          size: 14,
          font: helveticaBold,
          color: rgb(0.2, 0.6, 0.2)
        });
        
        // Create third page - Detailed Comparison
        const page3 = pdfDoc.addPage(PageSizes.LETTER);
        
        // Title
        page3.drawText(`Detailed Loan Comparison`, {
          x: margin,
          y: height - margin,
          size: 20,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.4)
        });
        
        // Column headers
        const col1 = margin;
        const col2 = margin + 150;
        const col3 = margin + 300;
        const col4 = margin + 450;
        
        page3.drawText(`Feature`, {
          x: col1,
          y: height - margin - 50,
          size: 12,
          font: helveticaBold,
        });
        
        page3.drawText(`Current Loan`, {
          x: col2,
          y: height - margin - 50,
          size: 12,
          font: helveticaBold,
        });
        
        page3.drawText(`Proposed Loan`, {
          x: col3,
          y: height - margin - 50,
          size: 12,
          font: helveticaBold,
        });
        
        page3.drawText(`Difference`, {
          x: col4,
          y: height - margin - 50,
          size: 12,
          font: helveticaBold,
        });
        
        // Draw line under headers
        page3.drawLine({
          start: { x: col1, y: height - margin - 60 },
          end: { x: col4 + 80, y: height - margin - 60 },
          thickness: 1,
          color: rgb(0.7, 0.7, 0.7),
        });
        
        // Row 1 - Principal
        const row1Y = height - margin - 80;
        page3.drawText(`Principal`, {
          x: col1,
          y: row1Y,
          size: 12,
          font: helveticaFont,
        });
        
        page3.drawText(`$${Number(currentLoan.balance || 0).toLocaleString()}`, {
          x: col2,
          y: row1Y,
          size: 12,
          font: helveticaFont,
        });
        
        page3.drawText(`$${Number(proposedLoan.amount || 0).toLocaleString()}`, {
          x: col3,
          y: row1Y,
          size: 12,
          font: helveticaFont,
        });
        
        const principalDiff = (proposedLoan.amount || 0) - (currentLoan.balance || 0);
        page3.drawText(`$${Number(principalDiff).toLocaleString()}`, {
          x: col4,
          y: row1Y,
          size: 12,
          font: helveticaFont,
          color: principalDiff < 0 ? rgb(0.2, 0.6, 0.2) : rgb(0.8, 0.2, 0.2)
        });
        
        // Row 2 - Interest Rate
        const row2Y = height - margin - 100;
        page3.drawText(`Interest Rate`, {
          x: col1,
          y: row2Y,
          size: 12,
          font: helveticaFont,
        });
        
        page3.drawText(`${Number(currentLoan.rate || 0).toFixed(3)}%`, {
          x: col2,
          y: row2Y,
          size: 12,
          font: helveticaFont,
        });
        
        page3.drawText(`${Number(proposedLoan.rate || 0).toFixed(3)}%`, {
          x: col3,
          y: row2Y,
          size: 12,
          font: helveticaFont,
        });
        
        const rateDiff = (proposedLoan.rate || 0) - (currentLoan.rate || 0);
        page3.drawText(`${rateDiff.toFixed(3)}%`, {
          x: col4,
          y: row2Y,
          size: 12,
          font: helveticaFont,
          color: rateDiff < 0 ? rgb(0.2, 0.6, 0.2) : rgb(0.8, 0.2, 0.2)
        });
        
        // Row 3 - Monthly Payment
        const row3Y = height - margin - 120;
        page3.drawText(`Monthly Payment`, {
          x: col1,
          y: row3Y,
          size: 12,
          font: helveticaFont,
        });
        
        page3.drawText(`$${Number(currentLoan.payment || 0).toLocaleString()}`, {
          x: col2,
          y: row3Y,
          size: 12,
          font: helveticaFont,
        });
        
        page3.drawText(`$${Number(proposedLoan.payment || 0).toLocaleString()}`, {
          x: col3,
          y: row3Y,
          size: 12,
          font: helveticaFont,
        });
        
        const paymentDiff = (proposedLoan.payment || 0) - (currentLoan.payment || 0);
        page3.drawText(`$${Number(paymentDiff).toLocaleString()}`, {
          x: col4,
          y: row3Y,
          size: 12,
          font: helveticaFont,
          color: paymentDiff < 0 ? rgb(0.2, 0.6, 0.2) : rgb(0.8, 0.2, 0.2)
        });
        
        // Row 4 - Term
        const row4Y = height - margin - 140;
        page3.drawText(`Term (years)`, {
          x: col1,
          y: row4Y,
          size: 12,
          font: helveticaFont,
        });
        
        page3.drawText(`${Number(currentLoan.term || 0)}`, {
          x: col2,
          y: row4Y,
          size: 12,
          font: helveticaFont,
        });
        
        page3.drawText(`${Number(proposedLoan.term || 0)}`, {
          x: col3,
          y: row4Y,
          size: 12,
          font: helveticaFont,
        });
        
        const termDiff = (proposedLoan.term || 0) - (currentLoan.term || 0);
        page3.drawText(`${termDiff}`, {
          x: col4,
          y: row4Y,
          size: 12,
          font: helveticaFont,
        });
        
        // Footer with disclaimer
        const footerY = 50;
        page3.drawText('Disclaimer: This proposal is for informational purposes only. The actual loan terms and conditions', {
          x: margin,
          y: footerY,
          size: 8,
          font: helveticaFont,
          color: rgb(0.5, 0.5, 0.5),
        });
        
        page3.drawText('may vary based on final underwriting approval. Interest rates subject to change without notice.', {
          x: margin,
          y: footerY - 12,
          size: 8,
          font: helveticaFont,
          color: rgb(0.5, 0.5, 0.5),
        });
        
        // Serialize the PDF to a base64 data URI
        const pdfBytes = await pdfDoc.save();
        const pdfBase64 = `data:application/pdf;base64,${btoa(String.fromCharCode(...pdfBytes))}`;
        
        responseData = { success: true, pdfData: pdfBase64, landingPageUrl: `${supabaseUrl.replace('supabase', 'app')}/pitch/${deckData.slug}` };
        break;
        
      default:
        throw new Error(`Invalid action: ${action}`);
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
