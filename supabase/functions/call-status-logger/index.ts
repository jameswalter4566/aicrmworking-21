
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
    const callSid = formData.get('CallSid')?.toString();
    const callStatus = formData.get('CallStatus')?.toString();
    const from = formData.get('From')?.toString();
    const to = formData.get('To')?.toString();
    const duration = formData.get('CallDuration')?.toString();
    const timestamp = new Date().toISOString();

    console.log(`Call Status Update - SID: ${callSid}, Status: ${callStatus}`);

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
      .from('call_logs')  // We'll create this table in the next step
      .insert([callLog]);

    if (error) throw error;

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
