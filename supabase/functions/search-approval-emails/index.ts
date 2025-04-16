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

    // Build Gmail search query
    let searchQuery = "";
    
    if (clientLastName) {
      searchQuery += `${clientLastName} `;
    }
    
    if (loanNumber) {
      searchQuery += `${loanNumber} `;
    }
    
    if (emailSender) {
      searchQuery += `from:(${emailSender}) `;
    }
    
    searchQuery += "has:attachment filename:pdf";

    console.log(`Gmail search query: ${searchQuery}`);

    // This is where you would implement the actual Gmail API call
    // As we don't have access to the original implementation, we're just
    // showing the change needed to support the emailSender parameter
    
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
