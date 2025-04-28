
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import twilio from 'npm:twilio@4.10.0';

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Twilio client
const twilioClient = twilio(
  Deno.env.get('TWILIO_ACCOUNT_SID'),
  Deno.env.get('TWILIO_AUTH_TOKEN')
);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[call-disposition] [${requestId}] Processing request`);

  try {
    // Handle Twilio webhook data (form data)
    if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      const twilioData: Record<string, string> = {};
      
      for (const [key, value] of formData.entries()) {
        twilioData[key] = value.toString();
      }
      
      // Store call status update
      if (twilioData.CallSid && twilioData.CallStatus) {
        await supabase.from('call_status_updates').insert({
          call_sid: twilioData.CallSid,
          status: twilioData.CallStatus,
          data: twilioData,
        });
      }
      
      // Return TwiML for Twilio
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }
    
    // Handle API requests (JSON)
    const { action, callSid, leadId, disposition } = await req.json();
    
    if (!action) {
      throw new Error('Action is required');
    }
    
    switch (action) {
      case 'end': {
        if (!callSid) {
          throw new Error('Call SID is required for ending a call');
        }
        
        // End the call via Twilio API
        await twilioClient.calls(callSid).update({ status: 'completed' });
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Call ended successfully' 
          }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'disposition': {
        if (!leadId || !disposition) {
          throw new Error('Lead ID and disposition are required');
        }
        
        // Update lead disposition
        await supabase.from('leads').update({ 
          disposition,
          last_contacted: new Date().toISOString()
        }).eq('id', Number(leadId));
        
        // Log the activity
        await supabase.from('lead_activities').insert({
          lead_id: Number(leadId),
          type: 'disposition',
          description: disposition
        });
        
        // If call SID provided, end the call as well
        if (callSid) {
          await twilioClient.calls(callSid).update({ status: 'completed' });
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Lead disposition set to ${disposition}`
          }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`[call-disposition] [${requestId}] Error:`, error);
    
    // Return appropriate error response based on content type
    if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
