import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { pitchDeckId, recipientEmail, subject, message, token } = await req.json();
    
    // Get auth token from request headers or body
    let authToken = req.headers.get('Authorization');
    
    if (authToken) {
      authToken = authToken.replace('Bearer ', '');
      console.log("Using Authorization header token");
    } else if (token) {
      authToken = token;
      console.log("Using token from request body");
    }
    
    if (!authToken) {
      throw new Error('Missing authorization header or token');
    }
    
    console.log(`Processing request to send pitch deck ${pitchDeckId} to ${recipientEmail}`);

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized: Invalid user token');
    }
    
    if (!pitchDeckId || !recipientEmail) {
      throw new Error('Missing required parameters: pitchDeckId and recipientEmail are required');
    }
    
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

    // Make sure we have a slug
    if (!pitchDeck.slug) {
      console.log("Pitch deck has no slug, generating one...");
      
      // Generate a slug based on the title
      let slug = pitchDeck.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        + '-home-solution';
      
      // Update the pitch deck with the slug
      const { error: updateError } = await supabase
        .from('pitch_decks')
        .update({ slug })
        .eq('id', pitchDeckId);
        
      if (updateError) {
        console.error('Error updating pitch deck slug:', updateError);
        throw new Error(`Failed to generate landing page URL: ${updateError.message}`);
      }
      
      pitchDeck.slug = slug;
    }
    
    // Generate the landing page URL
    const landingPageUrl = `${supabaseUrl.replace('supabase', 'app')}/pitch/${pitchDeck.slug}`;
    
    console.log("Landing page URL:", landingPageUrl);
    
    // Check if email connection exists
    const { data: connections, error: connectionsError } = await supabase
      .from("user_email_connections")
      .select("*")
      .eq("provider", "google")
      .eq("user_id", user.id) // Make sure we get the specific user's connection
      .limit(1);

    if (connectionsError || !connections || connections.length === 0) {
      throw new Error("No email connection found for your account. Please connect your Gmail account in the Settings page.");
    }
    
    // Set email subject and body
    const emailSubject = subject || `Mortgage Proposal: ${pitchDeck.title}`;
    const emailBody = message || 
      `Dear Client,\n\nI'm excited to share this mortgage proposal with you.\n\n${pitchDeck.description || ''}\n\nPlease review your personalized mortgage proposal at the link below:\n\n${landingPageUrl}\n\nBest regards,\n${user.email}`;
    
    // Send email using our Gmail connector with improved error handling
    console.log("Calling send-gmail function...");
    let emailResponse;
    try {
      emailResponse = await supabase.functions.invoke('send-gmail', {
        body: {
          to: recipientEmail,
          subject: emailSubject,
          body: emailBody,
          userId: user.id, // Pass the user ID to ensure we use the correct connection
          // No attachments now, we're sending a link to the landing page instead
        }
      });
      
      console.log("Raw email response:", JSON.stringify(emailResponse));
      
      // Enhanced error handling for email sending
      if (emailResponse.error) {
        console.error('Email sending error:', emailResponse.error);
        throw new Error(`Failed to send email: ${JSON.stringify(emailResponse.error)}`);
      }
      
      // Check for specific error codes in the response
      if (emailResponse.data && !emailResponse.data.success) {
        console.error('Email API error details:', JSON.stringify(emailResponse.data));
        
        // Check for permissions issue
        if (emailResponse.data.code === 'INSUFFICIENT_PERMISSIONS') {
          throw new Error("Gmail needs additional permissions. Please go to Settings and reconnect your Gmail account with full access.");
        }
        
        // Check for refresh token issue
        if (emailResponse.data.code === 'REFRESH_TOKEN_MISSING' || emailResponse.data.code === 'TOKEN_REFRESH_FAILED') {
          throw new Error("Gmail account needs to be reconnected. Please go to Settings and reconnect your Gmail account.");
        }
        
        throw new Error(emailResponse.data.message || `Failed to send email: ${JSON.stringify(emailResponse.data)}`);
      }
    } catch (err) {
      console.error('Exception during email send:', err);
      throw new Error(`Failed to send email. Error: ${err.message}`);
    }
    
    console.log("Email sent successfully to:", recipientEmail);
    
    // Update the pitch deck with sent info
    await supabase
      .from('pitch_decks')
      .update({
        last_sent_to: recipientEmail,
        last_sent_at: new Date().toISOString(),
      })
      .eq('id', pitchDeckId);
    
    return new Response(
      JSON.stringify({ success: true, message: `Pitch deck sent to ${recipientEmail}`, landingPageUrl }),
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
