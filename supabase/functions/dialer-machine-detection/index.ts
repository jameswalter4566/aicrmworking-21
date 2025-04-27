
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
      .from('dialing_session_leads')
      .select(`
        *,
        contact:contact_id(*),
        agent:agent_id(*),
        dialing_session:session_id(*)
      `)
      .eq('id', callId)
      .single();
      
    if (callError || !call) {
      throw new Error(`Call not found: ${callError?.message}`);
    }
    
    // Generate TwiML response based on the detection
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (answeredBy === 'machine') {
      console.log('Voicemail detected, hanging up call');
      
      // Update call record with machine detection result
      await supabase
        .from('dialing_session_leads')
        .update({
          disposition: 'voicemail',
          last_call_timestamp: new Date().toISOString()
        })
        .eq('id', callId);
        
      // Immediately hangup if it's a machine/voicemail
      twiml.hangup();
      
      // If we have a lead ID, notify the frontend
      if (call.contact_id) {
        await supabase.functions.invoke('lead-connected', {
          body: { 
            leadId: call.contact_id,
            callData: {
              callSid: formData.get('CallSid')?.toString(),
              status: 'completed',
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } else {
      // If it's a human or unknown, proceed with normal call flow
      twiml.redirect({
        method: 'POST'
      }, `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?callId=${callId}`);
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
