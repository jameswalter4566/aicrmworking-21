
// If this file exists, we need to modify it to pass the originalLeadId parameter
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.20.0';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Twilio VoiceResponse for TwiML generation
const generateVoiceResponse = () => {
  return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    
    // Get parameters from the Twilio request
    const to = formData.get('To')?.toString() || '';
    const from = formData.get('From')?.toString() || '';
    const leadId = formData.get('leadId')?.toString() || '';
    const originalLeadId = formData.get('originalLeadId')?.toString() || leadId;  // Use originalLeadId if provided
    const callSid = formData.get('CallSid')?.toString() || '';
    
    console.log(`Twilio voice webhook received: To=${to}, From=${from}, LeadId=${leadId}, OriginalLeadId=${originalLeadId}`);

    // Create a call mapping entry with the original lead ID
    if (leadId) {
      const { data: mapping, error: mappingError } = await supabase
        .from('call_mappings')
        .insert({
          call_sid: callSid,
          lead_id: leadId,
          original_lead_id: originalLeadId,  // Store the original lead ID
          status: 'initiated',
          lead_details: { phone: to }
        })
        .select()
        .single();
        
      if (mappingError) {
        console.error('Error creating call mapping:', mappingError);
      } else {
        console.log('Call mapping created:', mapping);
      }
    }

    // Log call status for debugging
    const { data: logEntry, error: logError } = await supabase
      .from('call_logs')
      .insert({
        status: 'initiated',
        from_number: from,
        to_number: to,
        sid: callSid,
      })
      .select()
      .single();
      
    if (logError) {
      console.error('Error creating call log:', logError);
    }

    // Generate TwiML response
    const twimlResponse = generateVoiceResponse();

    // Return the TwiML response
    return new Response(twimlResponse, {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  } catch (error) {
    console.error('Error in twilio-voice function:', error);
    
    // Return a simple TwiML response even on error
    return new Response(generateVoiceResponse(), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/xml'
      },
      status: 200
    });
  }
});
