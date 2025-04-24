
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import twilio from 'npm:twilio@4.10.0';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("Twilio voice function loaded");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get Twilio credentials from environment variables
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const twilioApiKey = Deno.env.get('TWILIO_API_KEY') || '';
    const twilioApiSecret = Deno.env.get('TWILIO_API_SECRET') || '';
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
    
    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Missing required Twilio credentials in environment variables');
    }
    
    // Initialize Twilio client
    const client = twilio(twilioAccountSid, twilioAuthToken);
    
    // Parse request body
    const { action, phoneNumber, leadId, browserClientName } = await req.json();
    
    console.log(`Received ${action} request for phone ${phoneNumber} and lead ${leadId}`);

    if (action === 'makeCall') {
      // Format the phone number if needed
      let formattedPhoneNumber = phoneNumber;
      if (!phoneNumber.startsWith('+') && !phoneNumber.includes('client:')) {
        formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');
      }
      
      console.log(`Making call to ${formattedPhoneNumber}`);
      
      const call = await client.calls.create({
        to: formattedPhoneNumber,
        from: twilioPhoneNumber,
        url: `https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-voice?action=connectToClient&clientName=${browserClientName}`,
      });
      
      console.log(`Call initiated with SID: ${call.sid}`);
      
      return new Response(JSON.stringify({ 
        success: true,
        callSid: call.sid,
        message: "Call initiated successfully"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else if (action === 'hangupAll') {
      console.log("Handling hangup all request");
      
      const calls = await client.calls.list({
        status: 'in-progress',
        limit: 20
      });
      
      console.log(`Found ${calls.length} active calls`);
      
      for (const call of calls) {
        await client.calls(call.sid).update({ status: 'completed' });
        console.log(`Hung up call: ${call.sid}`);
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: `Hung up ${calls.length} active calls`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else if (action === 'connectToClient') {
      // This handles returning TwiML for incoming calls to connect to browser client
      const clientName = req.url.includes('clientName=') 
        ? new URL(req.url).searchParams.get('clientName') 
        : '';
        
      console.log(`Connecting to client: ${clientName}`);
      
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Connect to the browser client
      if (clientName) {
        twiml.dial().client(clientName);
      } else {
        twiml.say('No client name provided. Call cannot be completed.');
      }
      
      return new Response(twiml.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200,
      });
    }
    
    // Default response if action not recognized
    return new Response(JSON.stringify({
      success: false,
      error: "Invalid action specified"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
    
  } catch (error) {
    console.error('Error in twilio-voice function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'An unknown error occurred' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
