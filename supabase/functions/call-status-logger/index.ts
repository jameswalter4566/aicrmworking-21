
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Call Status Logger received a webhook');
    
    // Try to parse the data from either form data or JSON
    let callData;
    
    if (req.headers.get('Content-Type')?.includes('application/json')) {
      callData = await req.json();
      console.log('Received JSON data:', JSON.stringify(callData));
    } else {
      const formData = await req.formData();
      callData = {};
      for (const [key, value] of formData.entries()) {
        callData[key] = value;
      }
      console.log('Received form data:', JSON.stringify(callData));
    }
    
    const callSid = callData.CallSid?.toString();
    const callStatus = callData.CallStatus?.toString();
    const from = callData.From?.toString();
    const to = callData.To?.toString();
    const duration = callData.CallDuration?.toString();
    const timestamp = new Date().toISOString();

    console.log(`Call Status Update - SID: ${callSid}, Status: ${callStatus}, From: ${from}, To: ${to}, Duration: ${duration}`);

    // Skip logging if essential data is missing
    if (!callSid || !callStatus) {
      console.warn('Missing required data for call logging');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required call data' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create call log object
    const callLog = {
      sid: callSid,
      status: callStatus,
      from_number: from,
      to_number: to,
      duration: duration ? parseInt(duration) : 0,
      timestamp,
      line_number: 1 // Hardcoded to Line 1 for now
    };

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store call log in Supabase
    const { error } = await supabase
      .from('call_logs')
      .insert([callLog]);

    if (error) {
      console.error('Error logging call status:', error);
      throw error;
    }
    
    console.log('Successfully logged call data to database:', callLog);

    // Return empty TwiML response to acknowledge receipt for Twilio
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'text/xml'
        }
      }
    );

  } catch (error) {
    console.error('Error in call-status-logger:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
