
// Follow Deno syntax
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { contactId } = await req.json();
    
    if (!contactId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Contact ID is required"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }
    
    // In a real implementation, this would fetch from a database
    // For now, generate some mock notes based on the contact ID
    
    const mockNotes = [
      {
        id: 1,
        contactId: contactId,
        content: "Initial consultation completed. Client is interested in properties in the $500k-600k range.",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: "Michelle Agent"
      },
      {
        id: 2,
        contactId: contactId,
        content: "Follow-up call. Client has been pre-approved for a mortgage. Looking for 3BR minimum.",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: "Michelle Agent"
      },
      {
        id: 3,
        contactId: contactId,
        content: "Scheduled viewing for 123 Main St and 456 Oak Ave on Saturday.",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: "System"
      }
    ];
    
    return new Response(
      JSON.stringify({
        success: true,
        notes: mockNotes
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to get notes"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
