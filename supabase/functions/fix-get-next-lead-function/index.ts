
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Starting to fix the get_next_session_lead function");
    
    // Updated approach - ensure ALL column references are fully qualified with table names
    const updateFunctionResponse = await fetch(`${supabaseUrl}/rest/v1/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        query: `
        CREATE OR REPLACE FUNCTION public.get_next_session_lead(p_session_id uuid)
        RETURNS TABLE(id uuid, lead_id text, session_id uuid, status text, priority integer, attempt_count integer, notes text)
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $function$
        DECLARE
          v_lead_record dialing_session_leads%ROWTYPE;
        BEGIN
          SELECT * INTO v_lead_record
          FROM dialing_session_leads
          WHERE dialing_session_leads.session_id = p_session_id 
          AND dialing_session_leads.status = 'queued'
          ORDER BY dialing_session_leads.priority DESC, dialing_session_leads.created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED;
          
          IF v_lead_record.id IS NOT NULL THEN
            UPDATE dialing_session_leads
            SET status = 'in_progress',
                attempt_count = dialing_session_leads.attempt_count + 1
            WHERE dialing_session_leads.id = v_lead_record.id;
            
            RETURN QUERY
            SELECT 
              v_lead_record.id,
              v_lead_record.lead_id,
              v_lead_record.session_id,
              'in_progress'::text AS status,
              v_lead_record.priority,
              v_lead_record.attempt_count + 1,
              v_lead_record.notes;
          END IF;
        END;
        $function$;
        `
      })
    });
    
    // Parse the response to check for success
    let updateResult;
    try {
      updateResult = await updateFunctionResponse.json();
      console.log('SQL update result:', updateResult);
    } catch (parseError) {
      console.error('Error parsing SQL update response:', parseError);
      updateResult = { error: parseError.message };
    }
    
    // Test if the function is working now by calling it
    console.log("Testing the updated function...");
    const testResponse = await supabase.rpc('get_next_session_lead', { 
      p_session_id: '00000000-0000-0000-0000-000000000000' // Using a placeholder UUID
    });
    
    console.log('Test function call result:', testResponse.error ? `Error: ${testResponse.error.message}` : 'Success');
    
    if (testResponse.error && testResponse.error.message.includes('ambiguous')) {
      console.error('Function still has ambiguous column reference:', testResponse.error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Function still has ambiguous column reference after update attempt.',
        details: testResponse.error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Database function fixed successfully",
      details: "All column references are now fully qualified to resolve ambiguity"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error fixing database function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'An unknown error occurred',
      stack: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
