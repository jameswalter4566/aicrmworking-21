
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Define CORS headers for browser requests
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
    // Get leadId from URL parameters
    const url = new URL(req.url);
    const leadId = url.searchParams.get('leadId');
    
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const eventType = formData.get('StatusCallbackEvent')?.toString();
    const conferenceSid = formData.get('ConferenceSid')?.toString();
    const callSid = formData.get('CallSid')?.toString();
    
    // Log the event for debugging
    console.log(`Conference event: ${eventType} for lead ${leadId}, conference ${conferenceSid}, call ${callSid}`);
    
    // Here we could process the conference events if needed
    // For example, tracking when participants join/leave, muted status, etc.
    
    // Return an empty TwiML response to acknowledge receipt
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
  } catch (error) {
    console.error(`Error in conference status webhook: ${error.message}`);
    
    // Always return a 200 OK with empty TwiML to prevent Twilio from retrying
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
  }
});
