
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get request body if it's a POST request
    let sessionId;
    let lastTimestamp = '0';
    
    if (req.method === 'POST') {
      const body = await req.json();
      sessionId = body.sessionId;
      lastTimestamp = body.lastTimestamp || '0';
    } else {
      // Parse session ID from URL parameters for GET requests
      const url = new URL(req.url);
      sessionId = url.searchParams.get('sessionId');
      lastTimestamp = url.searchParams.get('lastTimestamp') || '0';
    }
    
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    // Get recent call status updates for this session
    const { data: updates, error } = await supabase
      .from('call_status_updates')
      .select('*')
      .eq('session_id', sessionId)
      .gt('timestamp', new Date(parseInt(lastTimestamp.toString())).toISOString())
      .order('timestamp', { ascending: false })
      .limit(20);
    
    if (error) {
      throw error;
    }
    
    // Return the updates
    return new Response(JSON.stringify({ updates }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in get-call-updates function:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
