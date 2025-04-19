
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Create a supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Search-approval-emails function called");
    
    // Get authenticated user
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

    // Parse request body
    const { clientLastName } = await req.json();

    console.log("Search parameters:", { clientLastName });

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
      
      // Refresh the access token
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
      
      // Update stored token
      await supabaseAdmin
        .from('user_email_connections')
        .update({
          access_token: tokenData.access_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        })
        .eq('id', connection.id);
      
      console.log("Token refreshed successfully");
    }

    // Build Gmail search query - SIMPLIFIED
    let searchQuery = "has:attachment filename:pdf ";
    
    if (clientLastName) {
      searchQuery += clientLastName + " ";
    }
    
    // Limit to recent emails
    searchQuery += "newer_than:90d";

    console.log(`Gmail search query: "${searchQuery}"`);

    // Call Gmail API
    const searchResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}`,
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
    
    // Just get the most recent 3 emails
    const limit = Math.min(3, messageIds.length);
    const emails = [];
    
    for (let i = 0; i < limit; i++) {
      const messageId = messageIds[i].id;
      console.log(`Fetching details for message ${i+1}/${limit} (ID: ${messageId})`);
      
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
        continue;
      }

      const messageData = await messageResponse.json();
      
      // Process email
      const headers = messageData.payload.headers;
      const subject = headers.find(h => h.name === "Subject")?.value || "No Subject";
      const from = headers.find(h => h.name === "From")?.value || "Unknown";
      const date = headers.find(h => h.name === "Date")?.value || "";
      
      // Find PDF attachments
      const attachments = [];
      
      // Function to recursively search for attachments in parts
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
      
      // Check all parts for attachments
      if (messageData.payload.parts) {
        messageData.payload.parts.forEach(part => findAttachments(part));
      }
      
      // Extract snippet (preview of email content)
      const snippet = messageData.snippet || "";
      
      console.log(`Email: ${subject}, From: ${from}, Has ${attachments.length} PDF attachments`);
      
      emails.push({
        id: messageId,
        subject,
        from,
        date,
        snippet,
        attachments
      });
    }

    console.log(`Returning ${emails.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        emails,
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
