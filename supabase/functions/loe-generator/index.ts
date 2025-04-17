
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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
    console.log('LOE Generator function called');
    
    // Parse request body
    const { leadId, conditions } = await req.json();
    
    if (!leadId || !conditions) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required parameters" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing LOE generation for lead ID: ${leadId}`);
    console.log(`Received ${conditions.length} conditions for LOE generation`);
    
    // This is a mock function that simulates LOE generation
    // Add a delay to simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock response - in a real implementation, this would generate LOE documents
    return new Response(
      JSON.stringify({ 
        success: true, 
        details: {
          processedConditions: conditions.length,
          loeType: conditions[0]?.text?.includes('credit') ? 'credit_inquiry' : 'general',
          mockDocumentId: `doc-${Date.now()}`,
          mockEnvelopeId: `env-${Date.now()}`
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in LOE generator function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "An unknown error occurred" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
