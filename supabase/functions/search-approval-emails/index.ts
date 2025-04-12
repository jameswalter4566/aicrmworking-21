
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log('---------------------------------------------');
    console.log('🔍 STARTED: search-approval-emails function');
    const { clientLastName, userId } = await req.json();
    
    console.log(`📝 Search parameters received:`, {
      clientLastName,
      userId
    });
    
    if (!clientLastName) {
      console.log('❌ ERROR: Missing search parameters');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing search parameter. Please provide clientLastName.',
          code: 'MISSING_PARAMS'
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }
    
    console.log(`🔍 Searching emails for approval documents related to: ${clientLastName || '[no lastname]'}`);

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

    let searchQuery = 'has:attachment filename:pdf';
    
    searchQuery += ' (subject:"approved with conditions" OR subject:"conditional approval" OR ';
    searchQuery += 'subject:"approval" OR subject:"conditions" OR subject:"commitment letter")';
    
    searchQuery += ' (underwriter OR underwriting OR "loan submission" OR ';
    searchQuery += '"conditional approval" OR "approved with conditions" OR "commitment")';
    
    if (clientLastName) {
      searchQuery += ` ${clientLastName}`;
    }
    
    console.log(`🔎 Searching Gmail with enhanced query: "${searchQuery}"`);
    
    const emailSearchUrl = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=20`;
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
    
    const emailPromises = searchResults.messages.slice(0, 20).map(async (message: any) => {
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
      
      const subject = emailDetail.payload.headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
      const from = emailDetail.payload.headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
      const date = emailDetail.payload.headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
      
      console.log(`📧 Found email - Subject: "${subject}", From: ${from}, Date: ${date}`);
      
      const attachments = [];
      
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
      
      if (emailDetail.payload.parts) {
        emailDetail.payload.parts.forEach(findAttachments);
      } else {
        console.log(`⚠️ Email ${message.id} has no parts structure`);
      }
      
      let relevanceScore = 0;
      const subjectLower = subject.toLowerCase();
      const snippetLower = emailDetail.snippet.toLowerCase();
      
      const lenderDomains = ['uwm.com', 'quickenloans.com', 'rocketmortgage.com', 'loanadministration', 
                            'loanapproval', 'mortgage', 'lending', 'lender', 'bank', 'underwriting'];
      
      if (from) {
        const fromLower = from.toLowerCase();
        lenderDomains.forEach(domain => {
          if (fromLower.includes(domain)) relevanceScore += 10;
        });
      }
      
      const approvalSubjectPatterns = [
        /\d+\s*-\s*\w+\s*-.*approved/i,
        /\d+\s*-\s*\w+\s*-.*conditional/i,
        /conditional.*approval.*\d+/i,
        /mortgage.*commitment.*\d+/i,
        /loan.*approval.*\d+/i
      ];
      
      approvalSubjectPatterns.forEach(pattern => {
        if (pattern.test(subjectLower)) relevanceScore += 20;
      });
      
      const approvalKeywords = [
        'approved', 'approval', 'conditional', 'conditions', 'commitment letter',
        'underwriting', 'clear to close', 'mortgage approval', 'loan approval'
      ];
      
      approvalKeywords.forEach(keyword => {
        if (subjectLower.includes(keyword)) relevanceScore += 5;
        if (snippetLower.includes(keyword)) relevanceScore += 3;
      });
      
      const approvalPhrases = [
        'approved with conditions',
        'conditional approval',
        'commitment letter attached',
        'loan is approved',
        'attached is the approval',
        'your loan submission is approved',
        'please find attached the approval',
        'please review the attached conditions'
      ];
      
      approvalPhrases.forEach(phrase => {
        if (snippetLower.includes(phrase.toLowerCase())) relevanceScore += 15;
      });
      
      const approvalFilePhrases = ['approval', 'conditional', 'commitment', 'conditions'];
      attachments.forEach(attachment => {
        const filenameLower = attachment.filename.toLowerCase();
        approvalFilePhrases.forEach(phrase => {
          if (filenameLower.includes(phrase)) relevanceScore += 10;
        });
      });
      
      if (attachments.length > 0 && relevanceScore >= 15) {
        return {
          id: message.id,
          threadId: message.threadId,
          subject,
          from,
          date,
          snippet: emailDetail.snippet,
          attachments,
          relevanceScore,
          matchDetails: {
            hasApprovalPdf: attachments.some(a => 
              approvalFilePhrases.some(p => a.filename.toLowerCase().includes(p))
            ),
            foundKeywords: approvalKeywords.filter(k => 
              subjectLower.includes(k) || snippetLower.includes(k)
            ),
            foundPhrases: approvalPhrases.filter(p => 
              snippetLower.includes(p.toLowerCase())
            )
          }
        };
      }
      
      return null;
    });
    
    let emails = (await Promise.all(emailPromises)).filter(email => email !== null);
    
    emails = emails.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    console.log(`✅ Found ${emails.length} relevant emails with PDF attachments that match criteria`);
    
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
