
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
    console.log('---------------------------------------------');
    console.log('🔍 STARTED: search-approval-emails function');
    // Parse the request body
    const { clientLastName, loanNumber, userId } = await req.json();
    
    console.log(`📝 Search parameters received:`, {
      clientLastName,
      loanNumber,
      userId
    });
    
    if (!clientLastName && !loanNumber) {
      console.log('❌ ERROR: Missing search parameters');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing search parameters. Please provide clientLastName or loanNumber.',
          code: 'MISSING_PARAMS'
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }
    
    console.log(`🔍 Searching emails for approval documents related to: ${clientLastName || '[no lastname]'}, loan #${loanNumber || '[no loan number]'}`);

    // Get the user's Google email connection
    let connectionQuery = supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('provider', 'google');
      
    if (userId) {
      console.log(`👤 Looking for email connection for user ${userId}`);
      connectionQuery = connectionQuery.eq('user_id', userId);
    } else {
      console.log('⚠️ WARNING: No userId provided, using first available Google connection');
    }
    
    const { data: connection, error: connectionError } = await connectionQuery.limit(1).single();

    if (connectionError) {
      console.error('❌ No Google email connection found:', connectionError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No Google email connection found',
          code: 'NO_EMAIL_CONNECTION',
          details: 'Please connect your Google account in the Settings page',
          supabaseError: connectionError
        }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      );
    }

    if (!connection) {
      console.error('❌ No Google email connection found (connection is null)');
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

    console.log(`✅ Using email connection for: ${connection.email}`);

    // Refresh the token
    if (!connection.refresh_token) {
      console.error("❌ No refresh token available for email connection");
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
    
    console.log("🔄 Refreshing Google access token...");
    
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
      console.error(`❌ Token refresh error (${refreshResponse.status}):`, refreshError);
      
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
      console.log("✅ Access token refreshed successfully");
    }
    
    const accessToken = refreshData.access_token;
    
    // Update the stored token
    console.log("💾 Updating stored token in database...");
    const updateResult = await supabaseAdmin
      .from('user_email_connections')
      .update({ 
        access_token: accessToken,
        expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
      })
      .eq('id', connection.id);
      
    if (updateResult.error) {
      console.warn("⚠️ Failed to update stored token, but continuing with search:", updateResult.error);
    } else {
      console.log("✅ Token updated in database");
    }

    // Build search query for Gmail API
    // Search for emails with PDF attachments that contain approval keywords and client information
    let searchQuery = 'has:attachment filename:pdf';
    
    // Add keywords for approval-related emails
    searchQuery += ' (subject:"approval" OR subject:"conditional approval" OR subject:"loan approval")';
    
    // Add client-specific information if available
    if (clientLastName) {
      searchQuery += ` "${clientLastName}"`;
    }
    
    if (loanNumber) {
      searchQuery += ` "${loanNumber}"`;
    }
    
    console.log(`🔎 Searching Gmail with query: "${searchQuery}"`);
    
    // Search for matching emails
    const emailSearchUrl = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=5`;
    console.log(`🌐 Sending request to: ${emailSearchUrl}`);
    
    const emailSearchResponse = await fetch(emailSearchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!emailSearchResponse.ok) {
      const errorText = await emailSearchResponse.text();
      console.error(`❌ Gmail API search error (${emailSearchResponse.status}):`, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Gmail API search error (${emailSearchResponse.status})`, 
          details: errorText,
          code: 'GMAIL_API_ERROR',
          requestUrl: emailSearchUrl
        }),
        { 
          status: 502, 
          headers: corsHeaders 
        }
      );
    }
    
    const searchResults = await emailSearchResponse.json();
    console.log(`📨 Gmail search results:`, searchResults);
    
    // If no emails found, return empty result
    if (!searchResults.messages || searchResults.messages.length === 0) {
      console.log('ℹ️ No matching approval emails found');
      return new Response(
        JSON.stringify({ 
          success: true,
          emails: [],
          message: 'No matching approval emails found',
          queryUsed: searchQuery
        }),
        { headers: corsHeaders }
      );
    }
    
    console.log(`✅ Found ${searchResults.messages.length} potential emails matching search criteria`);
    
    // Get details for each email
    const emailPromises = searchResults.messages.slice(0, 5).map(async (message: any) => {
      console.log(`📩 Fetching details for email ID: ${message.id}`);
      const emailDetailResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!emailDetailResponse.ok) {
        console.error(`❌ Error fetching email ${message.id}: ${emailDetailResponse.status}`);
        return null;
      }
      
      const emailDetail = await emailDetailResponse.json();
      
      // Extract email metadata (subject, from, date)
      const subject = emailDetail.payload.headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
      const from = emailDetail.payload.headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
      const date = emailDetail.payload.headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
      
      console.log(`📧 Found email - Subject: "${subject}", From: ${from}, Date: ${date}`);
      
      // Find PDF attachments
      const attachments = [];
      
      // Helper function to find attachments in message parts recursively
      const findAttachments = (part: any) => {
        if (part.mimeType === 'application/pdf' && part.body.attachmentId) {
          console.log(`📎 Found PDF attachment: ${part.filename} (${part.body.size} bytes)`);
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size
          });
        } else if (part.parts) {
          part.parts.forEach(findAttachments);
        }
      };
      
      // Process parts if they exist
      if (emailDetail.payload.parts) {
        emailDetail.payload.parts.forEach(findAttachments);
      } else {
        console.log(`⚠️ Email ${message.id} has no parts structure`);
      }
      
      return {
        id: message.id,
        threadId: message.threadId,
        subject,
        from,
        date,
        snippet: emailDetail.snippet,
        attachments
      };
    });
    
    // Wait for all email detail fetches to complete
    const emails = (await Promise.all(emailPromises)).filter(email => email !== null && email.attachments.length > 0);
    
    console.log(`✅ Found ${emails.length} emails with PDF attachments that match criteria`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        emails,
        query: searchQuery,
        totalFound: searchResults.messages.length,
        totalWithPdfAttachments: emails.length
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error in search-approval-emails function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to search emails', 
        details: error.message,
        stack: error.stack,
        code: 'UNEXPECTED_ERROR'
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});
