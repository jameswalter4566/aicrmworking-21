
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
    const { to, subject, body, attachments, userId } = await req.json();

    if (!to || !subject || !body) {
      console.error("Missing required email fields");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required email fields',
          code: 'MISSING_FIELDS'
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }
    
    console.log(`Preparing to send email to: ${to}`);

    // Retrieve a Google email connection from the database
    // If userId is provided, get the specific user's connection
    let connectionQuery = supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('provider', 'google');
      
    if (userId) {
      console.log(`Looking for email connection for user ${userId}`);
      connectionQuery = connectionQuery.eq('user_id', userId);
    }
    
    const { data: connection, error: connectionError } = await connectionQuery.limit(1).single();

    if (connectionError || !connection) {
      console.error('No Google email connection found:', connectionError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No Google email connection found',
          code: 'NO_EMAIL_CONNECTION',
          details: 'Please connect your Google account in the Settings page'
        }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      );
    }

    console.log(`Using email connection for: ${connection.email} (User: ${connection.user_id})`);

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

    // Always refresh the token to ensure we have the right scopes
    console.log("Refreshing access token to ensure proper scopes...");
      
    if (!connection.refresh_token) {
      console.error("No refresh token available");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Email connection refresh token not available',
          code: 'REFRESH_TOKEN_MISSING',
          message: 'Please reconnect your Gmail account in the Settings page with the proper scopes'
        }),
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
      
      let refreshData;
      let refreshError;
      
      if (!refreshResponse.ok) {
        refreshError = await refreshResponse.text();
        console.error('Token refresh error:', refreshResponse.status, refreshError);
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to refresh access token', 
            details: refreshError,
            code: 'TOKEN_REFRESH_FAILED',
            message: 'Please reconnect your Gmail account in the Settings page'
          }),
          { 
            status: 401, 
            headers: corsHeaders 
          }
        );
      } else {
        refreshData = await refreshResponse.json();
        console.log("Access token refreshed successfully");
      }
      
      const accessToken = refreshData.access_token;
      
      // Update the stored token
      await supabaseAdmin
        .from('user_email_connections')
        .update({ 
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        })
        .eq('id', connection.id);
    
      console.log("Sending email via Gmail API...");
      
      // Create the email raw content
      const emailRaw = [
        `From: ${connection.email}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: ${contentType}`,
        '',
        emailContent
      ].join('\r\n');

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
        
        // Check if it's a permissions error
        if (errorText.includes("insufficient") || errorText.includes("permission")) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Gmail API permission error',
              details: errorText,
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Gmail requires additional permissions. Please reconnect your Gmail account with full access in the Settings page.'
            }),
            { 
              status: 403, 
              headers: corsHeaders 
            }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Gmail API error (${emailResponse.status})`, 
            details: errorText,
            code: 'GMAIL_API_ERROR'
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
    } catch (refreshError) {
      console.error('Error during token refresh or email sending:', refreshError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed during token refresh or email sending', 
          details: refreshError.message,
          code: 'EMAIL_SEND_ERROR',
          message: 'Please reconnect your Gmail account in the Settings page with the proper scopes'
        }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }
  } catch (error) {
    console.error('Error in send-gmail function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to send email', 
        details: error.message,
        code: 'UNEXPECTED_ERROR'
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});
