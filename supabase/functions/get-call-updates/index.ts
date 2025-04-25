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

// Temporary memory store for call statuses when database table is not available
const memoryCallStatusStore: Record<string, any[]> = {};

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
    
    let updates = [];
    
    try {
      // Try to get updates from the database first
      const { data: dbUpdates, error } = await supabase
        .from('call_status_updates')
        .select('*')
        .eq('session_id', sessionId)
        .gt('timestamp', new Date(parseInt(lastTimestamp.toString())).toISOString())
        .order('timestamp', { ascending: false })
        .limit(20);
      
      if (error && error.code === '42P01') {
        // Table doesn't exist, fall back to memory store
        console.log('call_status_updates table does not exist, using memory store');
        const sessionUpdates = memoryCallStatusStore[sessionId] || [];
        updates = sessionUpdates.filter(update => 
          update.timestamp > parseInt(lastTimestamp.toString())
        ).slice(0, 20);
      } else if (error) {
        throw error;
      } else {
        updates = dbUpdates;
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Fall back to memory store on any database error
      const sessionUpdates = memoryCallStatusStore[sessionId] || [];
      updates = sessionUpdates.filter(update => 
        update.timestamp > parseInt(lastTimestamp.toString())
      ).slice(0, 20);
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

// This function can be called from other edge functions to store a status update in memory
export function storeCallStatusUpdate(sessionId: string, statusData: any) {
  if (!memoryCallStatusStore[sessionId]) {
    memoryCallStatusStore[sessionId] = [];
  }
  
  const update = {
    session_id: sessionId,
    timestamp: Date.now(),
    data: statusData,
  };
  
  memoryCallStatusStore[sessionId].push(update);
  
  // Keep only the latest 100 updates per session to avoid memory issues
  if (memoryCallStatusStore[sessionId].length > 100) {
    memoryCallStatusStore[sessionId] = memoryCallStatusStore[sessionId].slice(-100);
  }
  
  return update;
}
