
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Twilio } from 'https://esm.sh/twilio@4.11.0';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create Twilio client
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const twilioClient = new Twilio(twilioAccountSid, twilioAuthToken);

// Broadcast call state to realtime channel
async function broadcastCallState(leadId: string, callState: any) {
  try {
    const channelName = `lead-data-${leadId}`;
    console.log(`📢 Broadcasting call state to channel: ${channelName}`);
    
    const { error } = await supabase
      .from('call_events')
      .insert({
        lead_id: leadId,
        call_sid: callState.callSid,
        status: callState.status,
        timestamp: new Date().toISOString(),
        event_data: callState
      });
      
    if (error) throw error;
    
    await supabase.channel(channelName)
      .send({
        type: 'broadcast',
        event: 'call_update',
        payload: callState
      });
    
    console.log('✅ Broadcast successful!');
  } catch (err) {
    console.error('❌ Error broadcasting call state:', err);
  }
}

// Log call activity
async function logCallActivity(leadId: string, activityType: string, description: string, userId?: string | null) {
  try {
    console.log(`📝 Logging ${activityType} for lead ${leadId}: ${description}`);
    const { error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        type: activityType,
        description: description,
        user_id: userId
      });
      
    if (error) throw error;
    console.log(`📝 Logged lead activity: ${JSON.stringify({
      leadId,
      type: activityType,
      description,
      userId
    })}`);
  } catch (err) {
    console.error('❌ Error logging call activity:', err);
  }
}

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { action, callSid, leadId, userId } = await req.json();
    console.log(`📌 Disposition panel request: ${action}, callSid: ${callSid}, leadId: ${leadId}`);
    
    let result = { success: false };
    
    switch (action) {
      case 'hangup':
        if (callSid) {
          // Hang up specific call
          console.log(`☎️ Hanging up specific call: ${callSid}`);
          await twilioClient.calls(callSid).update({ status: 'completed' });
          
          result = { 
            success: true, 
            message: `Call ${callSid} has been disconnected`,
            callSid
          };
          
          // Broadcast updated call state
          await broadcastCallState(leadId, {
            callSid,
            status: 'completed',
            timestamp: new Date().toISOString(),
            callState: 'disconnected'
          });
          
          // Log activity
          await logCallActivity(leadId, 'call_ended', 'Call ended via disposition panel', userId);
        } else {
          // Hang up all calls
          console.log('☎️ Hanging up all active calls');
          const calls = await twilioClient.calls.list({ status: 'in-progress', limit: 20 });
          
          const hungUpCalls = [];
          for (const call of calls) {
            await twilioClient.calls(call.sid).update({ status: 'completed' });
            hungUpCalls.push(call.sid);
          }
          
          result = {
            success: true,
            message: `${hungUpCalls.length} calls have been disconnected`,
            hungUpCalls
          };
          
          if (leadId) {
            // Broadcast updated call state
            await broadcastCallState(leadId, {
              callSid: hungUpCalls[0] || null,
              status: 'completed',
              timestamp: new Date().toISOString(),
              callState: 'disconnected'
            });
            
            // Log activity
            await logCallActivity(leadId, 'call_ended', 'All calls ended via disposition panel', userId);
          }
        }
        break;
        
      case 'getCallStatus':
        if (callSid) {
          console.log(`🔍 Getting status for call: ${callSid}`);
          const call = await twilioClient.calls(callSid).fetch();
          
          result = {
            success: true,
            callStatus: call.status,
            callSid: call.sid,
            direction: call.direction,
            duration: call.duration,
            startTime: call.startTime,
            endTime: call.endTime
          };
          
          // Broadcast retrieved call state
          await broadcastCallState(leadId, {
            callSid,
            status: call.status,
            timestamp: new Date().toISOString(),
            callState: call.status === 'in-progress' ? 'connected' : 
                      call.status === 'completed' || call.status === 'busy' || 
                      call.status === 'failed' || call.status === 'no-answer' ? 'disconnected' :
                      call.status === 'ringing' ? 'dialing' : 'unknown'
          });
        } else {
          // Get all active calls
          console.log('🔍 Getting all active calls');
          const calls = await twilioClient.calls.list({ status: 'in-progress', limit: 20 });
          
          result = {
            success: true,
            activeCalls: calls.map(call => ({
              callSid: call.sid,
              status: call.status,
              direction: call.direction,
              duration: call.duration,
              startTime: call.startTime,
              endTime: call.endTime
            }))
          };
        }
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Error in disposition panel function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
