
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
    // SQL to fix the ambiguous id column in get_next_session_lead function
    const { error } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION public.get_next_session_lead(p_session_id uuid)
        RETURNS TABLE(id uuid, lead_id text, session_id uuid, status text, priority integer, attempt_count integer)
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $function$
        BEGIN
          RETURN QUERY
          UPDATE dialing_session_leads
          SET status = 'in_progress',
              attempt_count = attempt_count + 1
          WHERE dialing_session_leads.id = (
            SELECT dialing_session_leads.id 
            FROM dialing_session_leads
            WHERE session_id = p_session_id 
            AND status = 'queued'
            ORDER BY priority DESC, created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          )
          RETURNING dialing_session_leads.id, dialing_session_leads.lead_id, dialing_session_leads.session_id, 
                   dialing_session_leads.status, dialing_session_leads.priority, dialing_session_leads.attempt_count;
        END;
        $function$;
      `
    });
    
    if (error) {
      console.error('Error updating function:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // Now fix the TypeScript error in AutoDialerController.tsx
    // We need to update the component to use the lead_id properly
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Database function fixed successfully"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'An unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
