
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Search-approval-emails function called");
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No auth header found");
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log("User authenticated:", user.id);
    
    const requestBody = await req.json();
    
    // Handle attachment download action
    if (requestBody.action === 'download' && requestBody.emailId && requestBody.attachmentId) {
      console.log(`Processing attachment download for email ${requestBody.emailId}, attachment ${requestBody.attachmentId}`);
      return await handleAttachmentDownload(requestBody.emailId, requestBody.attachmentId, user.id, corsHeaders);
    }

    // Get user's Gmail connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single();

    if (connError || !connection) {
      console.error("Gmail connection error:", connError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Gmail connection not found",
          details: "Please connect your Gmail account in Settings"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log("Found Gmail connection for user");

    // Check if token needs refresh
    if (new Date(connection.expires_at) < new Date()) {
      console.log("Token expired, refreshing...");
      
      if (!connection.refresh_token) {
        console.error("No refresh token available");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Gmail refresh token missing",
            details: "Please reconnect your Gmail account"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token refresh error:", errorText);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to refresh Gmail access token",
            details: errorText
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      const tokenData = await tokenResponse.json();
      connection.access_token = tokenData.access_token;
      
      await supabaseAdmin
        .from('user_email_connections')
        .update({
          access_token: tokenData.access_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        })
        .eq('id', connection.id);
      
      console.log("Token refreshed successfully");
    }

    // Simplified search query - just search for any emails with attachments
    const searchQuery = "has:attachment";
    console.log(`Gmail search query: "${searchQuery}"`);

    // Call Gmail API
    const searchResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=1`,
      {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`
        }
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Gmail API error:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Gmail API error",
          details: errorText
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    const searchData = await searchResponse.json();
    const messageIds = searchData.messages || [];
    
    console.log(`Found ${messageIds.length} matching emails`);
    
    if (messageIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          emails: [],
          query: searchQuery
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Just get the single most recent email
    const messageId = messageIds[0].id;
    console.log(`Fetching details for message (ID: ${messageId})`);
    
    const messageResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`
        }
      }
    );

    if (!messageResponse.ok) {
      console.warn(`Failed to fetch message ${messageId}`);
      return new Response(
        JSON.stringify({
          success: true,
          emails: [],
          query: searchQuery
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageData = await messageResponse.json();
    
    // Process email
    const headers = messageData.payload.headers;
    const subject = headers.find(h => h.name === "Subject")?.value || "No Subject";
    const from = headers.find(h => h.name === "From")?.value || "Unknown";
    const date = headers.find(h => h.name === "Date")?.value || "";
    
    // Find attachments
    const attachments = [];
    
    const findAttachments = (part) => {
      if (part.mimeType === "application/pdf" && part.body && part.body.attachmentId) {
        attachments.push({
          filename: part.filename,
          attachmentId: part.body.attachmentId,
          mimeType: part.mimeType,
          size: part.body.size
        });
      } 
      
      if (part.parts) {
        part.parts.forEach(subpart => findAttachments(subpart));
      }
    };
    
    if (messageData.payload.parts) {
      messageData.payload.parts.forEach(part => findAttachments(part));
    }
    
    console.log(`Email: ${subject}, From: ${from}, Has ${attachments.length} PDF attachments`);
    
    const email = {
      id: messageId,
      subject,
      from,
      date,
      snippet: messageData.snippet || "",
      attachments
    };

    console.log(`Returning email details`);

    return new Response(
      JSON.stringify({
        success: true,
        emails: [email],
        query: searchQuery
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in search-approval-emails:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Server error",
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

/**
 * Handle the download of an email attachment
 */
async function handleAttachmentDownload(emailId, attachmentId, userId, corsHeaders) {
  try {
    console.log(`Handling attachment download: email=${emailId}, attachment=${attachmentId}`);
    
    // Get user's Gmail connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single();

    if (connError || !connection) {
      console.error("Gmail connection error for attachment download:", connError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Gmail connection not found for attachment download"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Refresh token if needed
    if (new Date(connection.expires_at) < new Date()) {
      console.log("Token expired, refreshing for attachment download...");
      
      if (!connection.refresh_token) {
        console.error("No refresh token available for attachment download");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Gmail refresh token missing for attachment download"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token refresh error for attachment download:", errorText);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to refresh Gmail access token for attachment download"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      const tokenData = await tokenResponse.json();
      connection.access_token = tokenData.access_token;
      
      await supabaseAdmin
        .from('user_email_connections')
        .update({
          access_token: tokenData.access_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        })
        .eq('id', connection.id);
      
      console.log("Token refreshed successfully for attachment download");
    }
    
    console.log("Getting attachment data from Gmail API");
    
    // Call Gmail API to get attachment data
    const attachmentResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/attachments/${attachmentId}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`
        }
      }
    );

    if (!attachmentResponse.ok) {
      const errorText = await attachmentResponse.text();
      console.error("Gmail API attachment error:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch attachment from Gmail",
          details: errorText
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    const attachmentData = await attachmentResponse.json();
    
    if (!attachmentData.data) {
      console.error("No attachment data returned from Gmail API");
      return new Response(
        JSON.stringify({
          success: false,
          error: "No attachment data returned from Gmail"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Convert data to temporary URL
    // For security, we'll sign a URL that's valid for a short time
    // In a real application, you might want to store this file in Supabase storage
    
    // Convert the base64 data to a usable format
    const attachmentBase64 = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/');
    
    // For PDF files, we can create a data URL directly
    const downloadUrl = `data:application/pdf;base64,${attachmentBase64}`;
    
    console.log("Successfully created download URL for attachment");
    
    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl,
        mimeType: "application/pdf"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error handling attachment download:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to download attachment",
        details: error.message
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}
