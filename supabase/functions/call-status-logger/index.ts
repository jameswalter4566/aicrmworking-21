
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const callSid = formData.get('sid')?.toString();
    const callStatus = formData.get('status')?.toString();
    const from = formData.get('from_number')?.toString();
    const to = formData.get('to_number')?.toString();
    const duration = formData.get('duration')?.toString();
    const timestamp = formData.get('timestamp')?.toString() || new Date().toISOString();
    const lineNumber = formData.get('line_number') ? parseInt(formData.get('line_number')?.toString() || '1') : 1;

    console.log(`Call Status Update - SID: ${callSid}, Status: ${callStatus}, From: ${from}, To: ${to}`);

    // Create call log object
    const callLog = {
      sid: callSid,
      status: callStatus,
      from_number: from,
      to_number: to,
      duration: duration ? parseInt(duration) : 0,
      timestamp,
      line_number: lineNumber
    };

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store call log in Supabase
    const { error } = await supabase
      .from('call_logs')
      .insert([callLog]);

    if (error) {
      console.error("Error inserting call log:", error);
      throw error;
    }

    console.log(`Successfully logged call: ${callSid} with status ${callStatus}`);

    // Return empty TwiML response to acknowledge receipt
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
