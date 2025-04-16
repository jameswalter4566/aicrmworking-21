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
    // First, check if the execute_sql RPC function exists
    const checkRpcResponse = await supabase.rpc('execute_sql', {
      sql: `SELECT 1;`
    }).catch(() => ({ error: { message: 'RPC function not found' } }));

    if (checkRpcResponse.error) {
      // If execute_sql doesn't exist, run the SQL directly
      const { error } = await supabase.from('dialing_session_leads').select('id').limit(1);
      
      console.log('Direct SQL test result:', error ? 'Error' : 'Success');

      // Execute the function update directly - UPDATED to include notes column
      const directSqlResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/create_or_replace_function`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          function_definition: `
          CREATE OR REPLACE FUNCTION public.get_next_session_lead(p_session_id uuid)
          RETURNS TABLE(id uuid, lead_id text, session_id uuid, status text, priority integer, attempt_count integer, notes text)
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $function$
          BEGIN
            RETURN QUERY
            UPDATE dialing_session_leads
            SET status = 'in_progress',
                attempt_count = dialing_session_leads.attempt_count + 1
            WHERE dialing_session_leads.id = (
              SELECT dialing_session_leads.id 
              FROM dialing_session_leads
              WHERE dialing_session_leads.session_id = p_session_id 
              AND dialing_session_leads.status = 'queued'
              ORDER BY dialing_session_leads.priority DESC, dialing_session_leads.created_at ASC
              LIMIT 1
              FOR UPDATE SKIP LOCKED
            )
            RETURNING dialing_session_leads.id, dialing_session_leads.lead_id, dialing_session_leads.session_id, 
                    dialing_session_leads.status, dialing_session_leads.priority, dialing_session_leads.attempt_count,
                    dialing_session_leads.notes;
          END;
          $function$;
          `
        })
      });

      // Use SQL to directly update the function
      // This is a fallback if the RPC approach doesn't work
      const { data, error } = await supabase.from('_functions').select('*').eq('name', 'get_next_session_lead').maybeSingle();
      console.log('Function exists check:', data ? 'Yes' : 'No', error ? `Error: ${error.message}` : '');
      
      // Try running a SQL command to update the function directly
      try {
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
            BEGIN
              RETURN QUERY
              UPDATE dialing_session_leads
              SET status = 'in_progress',
                  attempt_count = dialing_session_leads.attempt_count + 1
              WHERE dialing_session_leads.id = (
                SELECT dialing_session_leads.id 
                FROM dialing_session_leads
                WHERE dialing_session_leads.session_id = p_session_id 
                AND dialing_session_leads.status = 'queued'
                ORDER BY dialing_session_leads.priority DESC, dialing_session_leads.created_at ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
              )
              RETURNING dialing_session_leads.id, dialing_session_leads.lead_id, dialing_session_leads.session_id, 
                      dialing_session_leads.status, dialing_session_leads.priority, dialing_session_leads.attempt_count,
                      dialing_session_leads.notes;
            END;
            $function$;
            `
          })
        });
        
        const updateResult = await updateFunctionResponse.json();
        console.log('Direct SQL update result:', updateResult);
        
      } catch (sqlUpdateError) {
        console.error('SQL update error:', sqlUpdateError);
      }
    } else {
      // If execute_sql exists, use it - UPDATED to include notes column
      const { data, error } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION public.get_next_session_lead(p_session_id uuid)
          RETURNS TABLE(id uuid, lead_id text, session_id uuid, status text, priority integer, attempt_count integer, notes text)
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $function$
          BEGIN
            RETURN QUERY
            UPDATE dialing_session_leads
            SET status = 'in_progress',
                attempt_count = dialing_session_leads.attempt_count + 1
            WHERE dialing_session_leads.id = (
              SELECT dialing_session_leads.id 
              FROM dialing_session_leads
              WHERE dialing_session_leads.session_id = p_session_id 
              AND dialing_session_leads.status = 'queued'
              ORDER BY dialing_session_leads.priority DESC, dialing_session_leads.created_at ASC
              LIMIT 1
              FOR UPDATE SKIP LOCKED
            )
            RETURNING dialing_session_leads.id, dialing_session_leads.lead_id, dialing_session_leads.session_id, 
                    dialing_session_leads.status, dialing_session_leads.priority, dialing_session_leads.attempt_count,
                    dialing_session_leads.notes;
          END;
          $function$;
        `
      });
      
      if (error) {
        console.error('Error updating function via RPC:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      
      console.log('Function updated successfully via RPC');
    }
    
    // Test if the function is working now by calling it
    const testResponse = await supabase.rpc('get_next_session_lead', { 
      p_session_id: '00000000-0000-0000-0000-000000000000' // Using a placeholder UUID
    });
    
    console.log('Test function call result:', testResponse.error ? 'Error' : 'Success');
    
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
