
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
    console.log('Income Verification function called');
    
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

    console.log(`Processing income verification for lead ID: ${leadId}`);
    
    // This is a mock function that simulates income verification processing
    // Add a delay to simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        details: {
          processedConditions: conditions.length,
          verificationId: `income-verify-${Date.now()}`,
          mockRequestSent: true,
          status: "verification_requested"
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in income verification function:', error);
    
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
