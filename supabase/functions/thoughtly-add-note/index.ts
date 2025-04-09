
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
    const { contactId, note } = await req.json();
    
    if (!contactId || !note) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Contact ID and note content are required"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }
    
    // In a real implementation, this would save to a database
    // For now, we'll just return a success message
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: Math.floor(Math.random() * 1000),
          contactId: contactId,
          content: note,
          createdAt: new Date().toISOString()
        }
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
        error: error.message || "Failed to add note"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
