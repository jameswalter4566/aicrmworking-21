
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('LOE Generator function called');
    
    // Parse request body
    const { leadId, conditions } = await req.json();
    
    if (!leadId || !conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid request parameters" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing LOE for lead ID: ${leadId}`);
    console.log(`Conditions to process: ${conditions.length}`);
    
    // Get lead information from database
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();
    
    if (leadError) {
      console.error('Error fetching lead data:', leadError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to fetch lead data" 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Process each LOE condition
    const results = await Promise.all(conditions.map(async (condition) => {
      // Determine LOE type from condition text
      const loeType = determineLOEType(condition.text || condition.description);
      
      // Mock PDF generation and DocuSign sending
      const docuSignResult = await mockDocuSignProcess(lead, condition, loeType);
      
      return {
        conditionId: condition.id,
        loeType,
        generatedDocumentUrl: docuSignResult.documentUrl,
        envelopeId: docuSignResult.envelopeId,
        success: true
      };
    }));
    
    console.log('LOE processing completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCount: results.length,
        results
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

/**
 * Determines the type of LOE from the condition text
 */
function determineLOEType(conditionText) {
  const text = (conditionText || '').toLowerCase();
  
  if (text.includes('credit inquiry') || text.includes('credit inquiries')) {
    return 'credit_inquiry';
  }
  
  if (text.includes('large deposit') || text.includes('deposits')) {
    return 'large_deposit';
  }
  
  if (text.includes('employment gap') || text.includes('job gap')) {
    return 'employment_gap';
  }
  
  if (text.includes('late payment') || text.includes('delinquency')) {
    return 'late_payment';
  }
  
  if (text.includes('address') || text.includes('residence')) {
    return 'address_discrepancy';
  }
  
  if (text.includes('name') || text.includes('alias')) {
    return 'name_variation';
  }
  
  return 'general';
}

/**
 * Mock function to simulate PDF generation and DocuSign envelope creation
 */
async function mockDocuSignProcess(lead, condition, loeType) {
  // Add a delay to simulate processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const mockDocumentId = `LOE-${loeType}-${Date.now()}`;
  const mockEnvelopeId = `env-${Date.now()}`;
  
  // In a real implementation, this would:
  // 1. Generate a PDF using templates based on loeType
  // 2. Upload to DocuSign
  // 3. Create envelope and add signer (borrower)
  // 4. Send for signature
  
  return {
    documentUrl: `https://example.com/documents/${mockDocumentId}.pdf`,
    envelopeId: mockEnvelopeId,
    recipientEmail: lead.email || 'borrower@example.com',
    sentTimestamp: new Date().toISOString()
  };
}
