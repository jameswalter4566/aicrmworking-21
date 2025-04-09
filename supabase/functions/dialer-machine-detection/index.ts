
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import twilio from 'https://esm.sh/twilio@4.18.1';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get callId from URL parameters
    const url = new URL(req.url);
    const callId = url.searchParams.get('callId');
    
    if (!callId) {
      throw new Error('Call ID is required');
    }
    
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const answeredBy = formData.get('AnsweredBy')?.toString() || 'unknown';
    
    console.log(`Machine detection result for call ${callId}: ${answeredBy}`);
    
    // Get the call record
    const { data: call, error: callError } = await supabase
      .from('predictive_dialer_calls')
      .select('*, contact:contact_id(*)')
      .eq('id', callId)
      .single();
      
    if (callError || !call) {
      throw new Error(`Call not found: ${callError?.message}`);
    }
    
    // Update the call record with the machine detection result
    await supabase
      .from('predictive_dialer_calls')
      .update({
        machine_detection_result: answeredBy
      })
      .eq('id', callId);
    
    // Generate TwiML response based on the detection
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (answeredBy === 'human') {
      // Check for available agents
      const { data: availableAgents, error: agentsError } = await supabase
        .from('predictive_dialer_agents')
        .select('*')
        .eq('status', 'available');
        
      if (agentsError) {
        throw new Error('Failed to get available agents: ' + agentsError.message);
      }
      
      if (!availableAgents || availableAgents.length === 0) {
        // No agents available, add to queue and play hold message
        await supabase
          .from('predictive_dialer_call_queue')
          .insert({
            call_id: callId,
            priority: 1,
            created_timestamp: new Date().toISOString()
          });
          
        twiml.say('Thank you for answering. Please hold for the next available agent.');
        twiml.play({ loop: 0 }, 'https://api.twilio.com/cowbell.mp3'); // Use a hold music URL
      } else {
        // Assign to first available agent
        const agent = availableAgents[0];
        
        // Update agent status to busy
        await supabase
          .from('predictive_dialer_agents')
          .update({ 
            status: 'busy',
            current_call_id: callId
          })
          .eq('id', agent.id);
          
        // Update call record with agent
        await supabase
          .from('predictive_dialer_calls')
          .update({
            agent_id: agent.id
          })
          .eq('id', callId);
          
        // In a real implementation, we'd connect this call to the agent's browser/device
        // For now, we'll just say a message
        twiml.say(`Thank you for answering. Connecting you with ${agent.name}`);
        twiml.play({ loop: 0 }, 'https://api.twilio.com/cowbell.mp3'); // Use a hold music URL
      }
    } else if (answeredBy === 'machine') {
      // It's a voicemail, update contact status
      if (call.contact_id) {
        await supabase
          .from('predictive_dialer_contacts')
          .update({
            status: 'voicemail',
            last_call_timestamp: new Date().toISOString()
          })
          .eq('id', call.contact_id);
      }
      
      // Leave a message
      twiml.say('Hello! This is an automated message. We tried to reach you but you were unavailable. We will try to call you back at a later time. Thank you.');
      twiml.hangup();
    } else {
      // Unknown result
      twiml.say('Hello! This is an automated message. We will try to call you back at a later time. Thank you.');
      twiml.hangup();
    }
    
    return new Response(twiml.toString(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in dialer-machine-detection function:', error);
    
    // Even on error, return a valid TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We apologize, but there was an error processing your call. Please try again later.');
    twiml.hangup();
    
    return new Response(twiml.toString(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200, // Return 200 even for errors to avoid Twilio retries
    });
  }
});
