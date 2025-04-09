
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import twilio from 'npm:twilio@4.23.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
};

console.log("Power Dialer Agent Connect function loaded");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get URL parameters
    const url = new URL(req.url);
    const callId = url.searchParams.get('callId');
    const conferenceName = url.searchParams.get('conferenceName');
    
    if (!callId || !conferenceName) {
      console.error("Missing required parameters");
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, there was an error connecting this call. Goodbye.');
      twiml.hangup();
      
      return new Response(twiml.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
    
    console.log(`Agent connecting to call ${callId}, conference ${conferenceName}`);
    
    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Initialize Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch the call record
    const { data: callRecord, error: callFetchError } = await supabase
      .from('power_dialer_calls')
      .select('*, contact:contact_id(*)')
      .eq('id', callId)
      .single();
    
    if (callFetchError) {
      console.error("Error fetching call record:", callFetchError);
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, there was an error connecting this call. Goodbye.');
      twiml.hangup();
      
      return new Response(twiml.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
    
    // Create TwiML to connect agent to the conference
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Add whisper to agent before joining conference
    const contactName = callRecord.contact?.name || 'Unknown contact';
    twiml.say(`You are being connected to ${contactName}. Press star to end the call.`);
    
    // Join the conference
    const dial = twiml.dial();
    dial.conference({
      startConferenceOnEnter: true,
      endConferenceOnExit: true,
    }, conferenceName);
    
    return new Response(twiml.toString(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });
    
  } catch (error) {
    console.error("Error in power-dialer-agent-connect function:", error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, there was an error connecting this call. Goodbye.');
    twiml.hangup();
    
    return new Response(twiml.toString(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });
  }
});
