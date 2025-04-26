
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

// Initialize Twilio client
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { callId, contactId, agentId, phoneNumber } = await req.json();
    
    if (!callId || !contactId || !agentId || !phoneNumber) {
      throw new Error('Call ID, Contact ID, Agent ID, and Phone Number are required');
    }
    
    // Define webhook URLs for Twilio
    const statusCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/predictive-dialer-webhook?callId=${callId}`;
    const machineDetectionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/predictive-dialer-machine-detection?callId=${callId}`;
    
    // Place the call using Twilio
    const twilioCall = await twilioClient.calls.create({
      to: phoneNumber,
      from: twilioPhoneNumber,
      machineDetection: 'DetectMessageEnd',
      machineDetectionTimeout: 30,
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: [
        'initiated', 
        'ringing', 
        'answered', 
        'completed',
        'busy',
        'no-answer',
        'failed', 
        'canceled'
      ],
      statusCallbackMethod: 'POST',
      url: machineDetectionUrl,
    });
    
    // Update call record with Twilio SID
    await supabase
      .from('predictive_dialer_calls')
      .update({
        twilio_call_sid: twilioCall.sid,
        status: 'in_progress'
      })
      .eq('id', callId);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Call initiated successfully',
      twilioCallSid: twilioCall.sid
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in initiate-manual-call function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'An error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || 500,
    });
  }
});
