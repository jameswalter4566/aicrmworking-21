
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
    const { lastName, loanNumber, userId } = await req.json();
    
    if (!lastName || !loanNumber || !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required search parameters',
          code: 'MISSING_PARAMS'
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }
    
    console.log(`Searching for approval emails for loan: ${loanNumber}, borrower: ${lastName}`);

    // Retrieve the Google email connection for this user
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('provider', 'google')
      .eq('user_id', userId)
      .limit(1)
      .single();

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

    // Refresh the token to ensure we have access
    if (!connection.refresh_token) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Email connection refresh token not available',
          code: 'REFRESH_TOKEN_MISSING'
        }),
        { 
          status: 401, 
          headers: corsHeaders 
        }
      );
    }
    
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
        JSON.stringify({ 
          success: false,
          error: 'Failed to refresh access token', 
          details: refreshError,
          code: 'TOKEN_REFRESH_FAILED'
        }),
        { 
          status: 401, 
          headers: corsHeaders 
        }
      );
    }
    
    const refreshData = await refreshResponse.json();
    const accessToken = refreshData.access_token;
    
    // Update the stored token
    await supabaseAdmin
      .from('user_email_connections')
      .update({ 
        access_token: accessToken,
        expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
      })
      .eq('id', connection.id);
    
    // Build search query for Gmail
    // Search for emails containing last name, loan number, and keywords for approval emails with attachments
    const searchQuery = `${lastName} ${loanNumber} (approval OR conditional) has:attachment`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    console.log(`Executing Gmail search query: ${searchQuery}`);
    
    // Search for matching emails using Gmail API
    const searchResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Gmail API search error:', searchResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Gmail API search error', 
          details: errorText,
          code: 'GMAIL_API_ERROR'
        }),
        { 
          status: 502, 
          headers: corsHeaders 
        }
      );
    }

    const searchResult = await searchResponse.json();
    const messages = searchResult.messages || [];
    
    console.log(`Found ${messages.length} potential approval emails`);
    
    // If no emails found, return empty result
    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          emails: [] 
        }),
        { 
          headers: corsHeaders 
        }
      );
    }

    // Process up to 5 most recent emails to find ones with PDF attachments
    const emailsWithAttachments = [];
    const maxEmailsToProcess = Math.min(messages.length, 5);
    
    for (let i = 0; i < maxEmailsToProcess; i++) {
      const messageId = messages[i].id;
      
      // Get full email details
      const messageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!messageResponse.ok) {
        console.warn(`Failed to fetch email details for message ${messageId}`, await messageResponse.text());
        continue;
      }
      
      const messageDetails = await messageResponse.json();
      
      // Extract relevant email information
      const headers = messageDetails.payload.headers;
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
      const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
      const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';
      
      // Check for PDF attachments
      const attachments = [];
      
      // Helper function to find attachments recursively
      const findAttachments = (part) => {
        if (part.mimeType === 'application/pdf' && part.body.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size
          });
        }
        
        if (part.parts) {
          part.parts.forEach(findAttachments);
        }
      };
      
      if (messageDetails.payload.parts) {
        messageDetails.payload.parts.forEach(findAttachments);
      }
      
      // If email has PDF attachments, add to our results
      if (attachments.length > 0) {
        emailsWithAttachments.push({
          id: messageDetails.id,
          threadId: messageDetails.threadId,
          subject,
          from,
          date,
          snippet: messageDetails.snippet,
          attachments
        });
      }
    }

    console.log(`Found ${emailsWithAttachments.length} emails with PDF attachments`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        emails: emailsWithAttachments 
      }),
      { 
        headers: corsHeaders 
      }
    );
  } catch (error) {
    console.error('Error in search-approval-emails function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to search emails', 
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
