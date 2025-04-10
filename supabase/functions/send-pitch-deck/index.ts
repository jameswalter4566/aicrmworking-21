
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client with service role key to bypass RLS
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { pitchDeckId, recipientEmail, subject, message } = await req.json();
    
    if (!pitchDeckId || !recipientEmail) {
      throw new Error('Missing required parameters: pitchDeckId and recipientEmail are required');
    }
    
    console.log(`Sending pitch deck ${pitchDeckId} to ${recipientEmail}`);
    
    // Get the pitch deck
    const { data: pitchDeck, error: pitchDeckError } = await supabase
      .from('pitch_decks')
      .select('*')
      .eq('id', pitchDeckId)
      .eq('created_by', user.id)
      .single();
    
    if (pitchDeckError || !pitchDeck) {
      console.error('Pitch deck fetch error:', pitchDeckError);
      throw new Error(`Failed to fetch pitch deck: ${pitchDeckError?.message || 'Not found'}`);
    }
    
    // Generate PDF for the pitch deck
    const { data: pdfResponse, error: pdfError } = await supabase.functions.invoke('save-pitch-deck', {
      body: {
        action: 'get-pdf',
        pitchDeckId,
      }
    });
    
    if (pdfError || !pdfResponse || !pdfResponse.pdfData) {
      console.error('PDF generation error:', pdfError);
      throw new Error(`Failed to generate PDF: ${pdfError?.message || 'Unknown error'}`);
    }
    
    // Extract the base64 PDF data
    const pdfBase64 = pdfResponse.pdfData.split(',')[1]; // Remove data:application/pdf;base64, prefix
    
    // Set email subject and body
    const emailSubject = subject || `Mortgage Proposal: ${pitchDeck.title}`;
    const emailBody = message || 
      `Dear Client,\n\nI'm excited to share this mortgage proposal with you.\n\n${pitchDeck.description || ''}\n\nPlease review the attached document and let me know if you have any questions.\n\nBest regards,\n${user.email}`;
    
    // Send email using our Gmail connector
    const emailResponse = await supabase.functions.invoke('send-gmail', {
      body: {
        to: recipientEmail,
        subject: emailSubject,
        body: emailBody,
        attachments: [
          {
            filename: `${pitchDeck.title.replace(/\s+/g, '_')}_Proposal.pdf`,
            content: pdfBase64,
            encoding: 'base64',
            mimeType: 'application/pdf'
          }
        ]
      }
    });
    
    if (emailResponse.error) {
      console.error('Email sending error:', emailResponse.error);
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }
    
    // Update the pitch deck with sent info
    await supabase
      .from('pitch_decks')
      .update({
        last_sent_to: recipientEmail,
        last_sent_at: new Date().toISOString(),
      })
      .eq('id', pitchDeckId);
    
    return new Response(
      JSON.stringify({ success: true, message: `Pitch deck sent to ${recipientEmail}` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in send-pitch-deck function: ${error.message}`);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
