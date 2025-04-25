
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Memory store for when DB isn't available/failing
const memoryUpdateStore: Record<string, any[]> = {};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { sessionId, lastTimestamp = 0 } = await req.json();
    
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    console.log(`Fetching updates for session ${sessionId} since timestamp ${lastTimestamp}`);

    // Verify session exists
    const { data: sessionData, error: sessionError } = await supabase
      .from('dialing_sessions')
      .select('id, name, status')
      .eq('id', sessionId)
      .single();
      
    if (sessionError) {
      console.error('Session not found:', sessionError);
      return new Response(
        JSON.stringify({ 
          error: 'Session not found',
          updates: [] 
        }),
        { headers: corsHeaders }
      );
    }

    console.log(`Found session: ${sessionData.name} with status ${sessionData.status}`);

    // Query the call_status_updates table
    console.log('Querying call_status_updates table...');
    
    const { data, error } = await supabase
      .from('call_status_updates')
      .select('*')
      .eq('session_id', sessionId)
      .gt('timestamp', new Date(lastTimestamp).toISOString())
      .order('timestamp', { ascending: true });
      
    console.log('Database query results:', data);

    // If database query failed or returned no results, check memory store
    if (error || !data || data.length === 0) {
      if (error) {
        console.error('Error querying call_status_updates table:', error);
      }
      
      console.log('No database updates found, checking memory store...');
      
      // Filter memory updates by timestamp
      const memoryUpdates = memoryUpdateStore[sessionId] || [];
      console.log(`Memory store has ${memoryUpdates.length} total updates, returning ${memoryUpdates.filter(u => u.timestamp > lastTimestamp).length} updates for timestamp > ${lastTimestamp}`);
      
      const filteredMemoryUpdates = memoryUpdates.filter(update => 
        update.timestamp > lastTimestamp
      );
      
      console.log(`Memory store has ${filteredMemoryUpdates.length} updates for this session`);
      
      // Also query for any active calls
      try {
        const { data: callsData } = await supabase
          .from('predictive_dialer_calls')
          .select('*, contact:contact_id(*)')
          .eq('session_id', sessionId)
          .in('status', ['in_progress', 'queued', 'connecting', 'ringing']);
          
        console.log('Active calls found:', callsData?.length || 0);
        
        // If there are active calls but no updates, create synthetic updates
        if (callsData && callsData.length > 0 && filteredMemoryUpdates.length === 0) {
          const syntheticUpdates = callsData.map(call => ({
            timestamp: Date.now(),
            session_id: sessionId,
            call_sid: call.twilio_call_sid,
            status: call.status,
            data: {
              callSid: call.twilio_call_sid,
              status: call.status,
              timestamp: Date.now(),
              agentId: call.agent_id,
              leadId: call.contact_id,
              phoneNumber: call.contact?.phone_number,
              leadName: call.contact?.name,
              company: call.contact?.company
            }
          }));
          
          console.log('Created synthetic updates from active calls:', syntheticUpdates);
          
          return new Response(
            JSON.stringify({ 
              updates: syntheticUpdates,
              debug: {
                sessionId,
                lastTimestamp,
                updateCount: syntheticUpdates.length,
                memoryStoreCount: memoryUpdates.length,
                sessionInfo: sessionData,
                syntheticUpdatesCreated: true,
                timestamp: new Date().toISOString()
              }
            }),
            { headers: corsHeaders }
          );
        }
        
      } catch (callQueryError) {
        console.error('Error querying active calls:', callQueryError);
      }
      
      return new Response(
        JSON.stringify({ 
          updates: filteredMemoryUpdates,
          debug: {
            sessionId,
            lastTimestamp,
            updateCount: filteredMemoryUpdates.length,
            memoryStoreCount: memoryUpdates.length,
            sessionInfo: sessionData,
            timestamp: new Date().toISOString()
          }
        }),
        { headers: corsHeaders }
      );
    }

    // Format and return updates from database
    const formattedUpdates = data.map(update => ({
      timestamp: new Date(update.timestamp).getTime(),
      session_id: update.session_id,
      call_sid: update.call_sid,
      status: update.status,
      data: update.data || {}
    }));

    return new Response(
      JSON.stringify({ 
        updates: formattedUpdates,
        debug: {
          sessionId,
          lastTimestamp,
          updateCount: formattedUpdates.length,
          databaseSourced: true,
          sessionInfo: sessionData,
          timestamp: new Date().toISOString()
        }
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in get-call-updates function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        updates: [] 
      }),
      { 
        status: 400,
        headers: corsHeaders 
      }
    );
  }
});
