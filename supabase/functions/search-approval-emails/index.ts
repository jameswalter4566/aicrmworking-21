
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
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Parse request body
    const { clientLastName, loanNumber, emailSender } = await req.json();

    console.log("Search parameters:", { clientLastName, loanNumber, emailSender });

    // Get user's Gmail connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Gmail connection not found",
          details: "Please connect your Gmail account in Settings"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check if token needs refresh
    if (new Date(connection.expires_at) < new Date()) {
      console.log("Token expired, refreshing...");
      
      if (!connection.refresh_token) {
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
    }

    // Build Gmail search query
    let searchQuery = "has:attachment filename:pdf ";
    
    if (clientLastName) {
      searchQuery += clientLastName + " ";
    }
    
    if (loanNumber) {
      searchQuery += loanNumber + " ";
    }
    
    if (emailSender) {
      searchQuery += `from:(${emailSender}) `;
    }
    
    // Add a date filter to limit results to last 30 days
    searchQuery += "newer_than:30d";

    console.log(`Gmail search query: ${searchQuery}`);

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
    
    // Fetch details for first 5 messages
    const emails = [];
    const limit = Math.min(5, messageIds.length);
    
    for (let i = 0; i < limit; i++) {
      const messageId = messageIds[i].id;
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
      
      emails.push({
        id: messageId,
        subject,
        from,
        date,
        snippet,
        attachments
      });
    }

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
