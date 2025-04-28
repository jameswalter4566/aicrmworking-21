
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
  // Generate a unique request ID for logging
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[call-disposition] [${requestId}] Processing request`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Determine request type based on content-type
    const contentType = req.headers.get('content-type') || '';
    console.log(`[call-disposition] [${requestId}] Content-Type: ${contentType}`);

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Handle Twilio webhook data (form data)
      console.log(`[call-disposition] [${requestId}] Processing Twilio webhook (form data)`);
      return await handleTwilioWebhook(req, requestId);
    } else {
      // Handle API requests (JSON)
      console.log(`[call-disposition] [${requestId}] Processing API request (JSON)`);
      return await handleApiRequest(req, requestId);
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
        error: error.message || 'An error occurred',
        requestId
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Handle Twilio webhook form data
 */
async function handleTwilioWebhook(req: Request, requestId: string): Promise<Response> {
  const formData = await req.formData();
  const twilioData: Record<string, string> = {};
  
  for (const [key, value] of formData.entries()) {
    twilioData[key] = value.toString();
  }
  
  console.log(`[call-disposition] [${requestId}] Received webhook data:`, JSON.stringify(twilioData, null, 2));
  
  // Store call status update
  if (twilioData.CallSid && twilioData.CallStatus) {
    try {
      console.log(`[call-disposition] [${requestId}] Storing call status update: SID=${twilioData.CallSid}, Status=${twilioData.CallStatus}`);
      
      await supabase.from('call_status_updates').insert({
        call_sid: twilioData.CallSid,
        status: twilioData.CallStatus,
        data: twilioData,
      });
      
      console.log(`[call-disposition] [${requestId}] Successfully stored call status update`);
    } catch (dbError) {
      console.error(`[call-disposition] [${requestId}] Error storing call status update:`, dbError);
      // Continue processing even if DB insert fails
    }
  } else {
    console.log(`[call-disposition] [${requestId}] No CallSid or CallStatus found in webhook data`);
  }
  
  // Return TwiML for Twilio
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
  );
}

/**
 * Handle API requests (JSON)
 */
async function handleApiRequest(req: Request, requestId: string): Promise<Response> {
  const { action, callSid, leadId, disposition } = await req.json();
  
  if (!action) {
    console.error(`[call-disposition] [${requestId}] Missing required parameter: action`);
    throw new Error('Action is required');
  }
  
  console.log(`[call-disposition] [${requestId}] Received API action: ${action} for call ${callSid}`);
  
  switch (action) {
    case 'end': {
      if (!callSid) {
        console.error(`[call-disposition] [${requestId}] Missing required parameter: callSid`);
        throw new Error('Call SID is required for ending a call');
      }
      
      try {
        console.log(`[call-disposition] [${requestId}] Ending call with SID: ${callSid}`);
        
        // End the call via Twilio API
        await twilioClient.calls(callSid).update({ status: 'completed' });
        
        console.log(`[call-disposition] [${requestId}] Successfully ended call: ${callSid}`);
        
        // Log the action to database
        try {
          await supabase.from('call_actions').insert({
            call_sid: callSid,
            action: 'end',
            status: 'success',
            timestamp: new Date().toISOString()
          });
        } catch (dbError) {
          console.error(`[call-disposition] [${requestId}] Error logging call end action:`, dbError);
          // Continue even if DB insert fails
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Call ended successfully',
            requestId
          }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (twilioError) {
        console.error(`[call-disposition] [${requestId}] Twilio error ending call:`, twilioError);
        
        // Log the failed action
        try {
          await supabase.from('call_actions').insert({
            call_sid: callSid,
            action: 'end',
            status: 'failed',
            error: twilioError.message || 'Unknown error',
            timestamp: new Date().toISOString()
          });
        } catch (dbError) {
          console.error(`[call-disposition] [${requestId}] Error logging failed call end action:`, dbError);
        }
        
        throw new Error(`Failed to end call: ${twilioError.message}`);
      }
    }
    
    case 'disposition': {
      if (!leadId || !disposition) {
        console.error(`[call-disposition] [${requestId}] Missing required parameters for disposition update`);
        throw new Error('Lead ID and disposition are required');
      }
      
      console.log(`[call-disposition] [${requestId}] Setting disposition to ${disposition} for lead ${leadId}`);
      
      // Update lead disposition
      try {
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
        
        console.log(`[call-disposition] [${requestId}] Successfully updated lead disposition`);
      } catch (dbError) {
        console.error(`[call-disposition] [${requestId}] Database error updating disposition:`, dbError);
        throw new Error(`Failed to update disposition: ${dbError.message}`);
      }
      
      // If call SID provided, end the call as well
      if (callSid) {
        try {
          console.log(`[call-disposition] [${requestId}] Ending call ${callSid} after updating disposition`);
          await twilioClient.calls(callSid).update({ status: 'completed' });
          console.log(`[call-disposition] [${requestId}] Successfully ended call ${callSid}`);
        } catch (twilioError) {
          console.error(`[call-disposition] [${requestId}] Twilio error ending call after disposition update:`, twilioError);
          // Continue even if Twilio call fails - we've already updated the disposition
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Lead disposition set to ${disposition}`,
          requestId
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    default:
      console.error(`[call-disposition] [${requestId}] Unknown action: ${action}`);
      throw new Error(`Unknown action: ${action}`);
  }
}
