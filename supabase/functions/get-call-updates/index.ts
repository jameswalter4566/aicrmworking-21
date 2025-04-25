
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

// For debugging - add some mock data to the memory store
function addMockData(sessionId: string) {
  if (!memoryCallStatusStore[sessionId]) {
    memoryCallStatusStore[sessionId] = [];
  }
  
  const statuses = ['ringing', 'in-progress', 'completed', 'busy', 'no-answer', 'failed'];
  const mockStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  const mockUpdate = {
    session_id: sessionId,
    timestamp: Date.now(),
    data: {
      callSid: `mock-call-${Date.now()}`,
      status: mockStatus,
      timestamp: Date.now(),
      phoneNumber: '+1234567890',
      leadName: 'Mock Test Lead',
      company: 'Mock Company'
    },
  };
  
  memoryCallStatusStore[sessionId].push(mockUpdate);
  console.log(`Added mock update to memory store for session ${sessionId}:`, mockUpdate);
  
  return mockUpdate;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get request body if it's a POST request
    let sessionId;
    let lastTimestamp = '0';
    let enableMocking = false; // Set to true to enable automatic mock data generation
    
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('Received request body:', body);
      sessionId = body.sessionId;
      lastTimestamp = body.lastTimestamp || '0';
      enableMocking = body.enableMocking === true;
    } else {
      // Parse session ID from URL parameters for GET requests
      const url = new URL(req.url);
      sessionId = url.searchParams.get('sessionId');
      lastTimestamp = url.searchParams.get('lastTimestamp') || '0';
      enableMocking = url.searchParams.get('enableMocking') === 'true';
    }
    
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    console.log(`Fetching updates for session ${sessionId} since timestamp ${lastTimestamp}`);
    
    // For diagnostic purposes, let's check if the session exists by querying a dialing_sessions table
    let sessionInfo = null;
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('dialing_sessions')
        .select('id, name, status')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (sessionData) {
        console.log(`Found session: ${sessionData.name} with status ${sessionData.status}`);
        sessionInfo = sessionData;
      } else if (sessionError) {
        console.log(`Error looking up session: ${sessionError.message}`);
      } else {
        console.log(`No session found with ID ${sessionId}`);
      }
    } catch (e) {
      console.log(`Exception looking up session: ${e.message}`);
    }
    
    let updates = [];
    
    try {
      // Try to get updates from the database first
      console.log('Querying call_status_updates table...');
      const { data: dbUpdates, error } = await supabase
        .from('call_status_updates')
        .select('*')
        .eq('session_id', sessionId)
        .gt('timestamp', new Date(parseInt(lastTimestamp.toString())).toISOString())
        .order('timestamp', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Database query error:', error);
        throw error;
      }
      
      console.log('Database query results:', dbUpdates);
      
      if (dbUpdates && dbUpdates.length > 0) {
        updates = dbUpdates.map(update => ({
          ...update,
          data: {
            ...update.data,
            timestamp: new Date(update.timestamp).getTime()
          }
        }));
        console.log('Processed updates:', updates);
      } else {
        console.log('No database updates found, checking memory store...');
      }
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Fall back to memory store on any database error
      console.log('Falling back to memory store...');
    }
    
    // If no updates from database, check memory store
    if (updates.length === 0) {
      const sessionUpdates = memoryCallStatusStore[sessionId] || [];
      updates = sessionUpdates.filter(update => 
        update.timestamp > parseInt(lastTimestamp.toString())
      ).slice(0, 20);
      console.log(`Memory store has ${sessionUpdates.length} total updates, returning ${updates.length} updates for timestamp > ${lastTimestamp}`);
    }
    
    // Check if we have any updates in memory store for this session
    const memoryStoreUpdates = memoryCallStatusStore[sessionId] || [];
    console.log(`Memory store has ${memoryStoreUpdates.length} updates for this session`);
    
    // Generate a mock update if requested
    if ((updates.length === 0 && enableMocking) || (updates.length === 0 && sessionId === 'mock-session')) {
      console.log('Generating mock update for testing');
      const mockUpdate = addMockData(sessionId);
      updates.push(mockUpdate);
    }
    
    // Return the updates
    return new Response(JSON.stringify({ 
      updates,
      debug: {
        sessionId,
        lastTimestamp,
        updateCount: updates.length,
        memoryStoreCount: memoryStoreUpdates.length,
        sessionInfo,
        timestamp: new Date().toISOString(),
        mockEnabled: enableMocking
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in get-call-updates function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
