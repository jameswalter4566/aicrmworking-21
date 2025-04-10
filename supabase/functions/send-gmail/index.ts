
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Create a supabase admin client with the service role key for bypassing RLS
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log("Received email sending request");
    
    // Parse the request body
    const { to, subject, body, attachments } = await req.json();

    if (!to || !subject || !body) {
      console.error("Missing required email fields");
      return new Response(
        JSON.stringify({ error: 'Missing required email fields' }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }
    
    console.log(`Preparing to send email to: ${to}`);

    // Retrieve a Google email connection from the database
    // We're not requiring specific user - just getting the first available connection
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('provider', 'google')
      .limit(1)
      .single();

    if (connectionError || !connection) {
      console.error('No Google email connection found:', connectionError);
      return new Response(
        JSON.stringify({ error: 'No Google email connection found' }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      );
    }

    console.log(`Using email connection for: ${connection.email}`);

    // Create the email parts for multipart/mixed emails (if attachments present)
    let emailContent;
    let contentType = 'text/plain';
    
    if (attachments && attachments.length > 0) {
      console.log(`Email includes ${attachments.length} attachment(s)`);
      
      // Generate a boundary for multipart content
      const boundary = `boundary_${Math.random().toString(36).substring(2)}`;
      contentType = `multipart/mixed; boundary=${boundary}`;
      
      // Start building multipart email
      let parts = [
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        '',
        body,
      ];
      
      // Add each attachment
      for (const attachment of attachments) {
        console.log(`Adding attachment: ${attachment.filename}`);
        parts = parts.concat([
          `--${boundary}`,
          `Content-Type: ${attachment.mimeType || 'application/octet-stream'}`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          '',
          attachment.content
        ]);
      }
      
      // Close the boundary
      parts.push(`--${boundary}--`);
      
      emailContent = parts.join('\r\n');
    } else {
      // Simple email without attachments
      emailContent = body;
    }

    // Create the email raw content
    const emailRaw = [
      `From: ${connection.email}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: ${contentType}`,
      '',
      emailContent
    ].join('\r\n');

    console.log("Email content prepared, sending via Gmail API...");

    // Check if we need to refresh the token
    let accessToken = connection.access_token;
    const tokenExpiresAt = new Date(connection.expires_at || '').getTime();
    const now = Date.now();
    
    if (tokenExpiresAt <= now) {
      console.log("Access token expired, refreshing...");
      
      if (!connection.refresh_token) {
        console.error("No refresh token available");
        return new Response(
          JSON.stringify({ error: 'Email connection refresh token not available' }),
          { 
            status: 401, 
            headers: corsHeaders 
          }
        );
      }
      
      try {
        // Refresh the token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
            refresh_token: connection.refresh_token,
            grant_type: 'refresh_token'
          })
        });
        
        if (!refreshResponse.ok) {
          const refreshError = await refreshResponse.text();
          console.error('Token refresh error:', refreshResponse.status, refreshError);
          return new Response(
            JSON.stringify({ error: 'Failed to refresh access token', details: refreshError }),
            { 
              status: 401, 
              headers: corsHeaders 
            }
          );
        }
        
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        
        // Update the stored token
        await supabaseAdmin
          .from('user_email_connections')
          .update({ 
            access_token: accessToken,
            expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
          })
          .eq('id', connection.id);
          
        console.log("Access token refreshed successfully");
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        return new Response(
          JSON.stringify({ error: 'Failed to refresh access token', details: refreshError.message }),
          { 
            status: 500, 
            headers: corsHeaders 
          }
        );
      }
    }

    // Send email via Gmail API
    const emailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: btoa(unescape(encodeURIComponent(emailRaw)))
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Gmail API error:', emailResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Gmail API error (${emailResponse.status})`, 
          details: errorText 
        }),
        { 
          status: 502, 
          headers: corsHeaders 
        }
      );
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully, message ID:", result.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id 
      }),
      { 
        headers: corsHeaders 
      }
    );

  } catch (error) {
    console.error('Error in send-gmail function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});
