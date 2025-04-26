import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const { data: nextLead, error } = await supabase.rpc('get_next_session_lead', {
      p_session_id: sessionId
    });

    if (error) {
      throw error;
    }

    // Log the lead data including both IDs
    if (nextLead && nextLead.length > 0) {
      console.log('Retrieved next lead:', {
        uuid: nextLead[0].lead_id,
        originalLeadId: nextLead[0].original_lead_id,
        status: nextLead[0].status
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead: nextLead?.[0] || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-next-lead-function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
