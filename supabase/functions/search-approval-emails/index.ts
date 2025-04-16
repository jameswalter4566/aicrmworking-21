
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Parse request body
    const { clientLastName, loanNumber, emailSender } = await req.json();

    // Build Gmail search query - using broader 'contains' matching instead of exact matching
    let searchQuery = "";
    
    if (clientLastName) {
      // Use clientLastName as a general search term without any qualifiers
      searchQuery += `${clientLastName} `;
    }
    
    if (loanNumber) {
      // Instead of exact match, use as a general search term
      searchQuery += `${loanNumber} `;
    }
    
    if (emailSender) {
      // Use partial email match rather than exact sender
      // Gmail's 'from:' operator allows partial matching by default
      searchQuery += `from:(${emailSender}) `;
    }
    
    // Add attachment filter to ensure we're getting emails with PDF attachments
    searchQuery += "has:attachment filename:pdf";

    console.log(`Gmail search query: ${searchQuery}`);

    // This is where you would implement the actual Gmail API call
    // As we don't have access to the original implementation, we're just
    // showing the change needed to support broader search terms
    
    // Mock response for demonstration purposes
    return new Response(
      JSON.stringify({
        success: true,
        emails: [],
        query: searchQuery
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in search-approval-emails:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
