
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
const CALLBACK_BASE_URL = Deno.env.get('CALLBACK_BASE_URL') || '';

// Track active call sessions
const sessions = new Map();

function createSession(id = 'default-session') {
  if (!sessions.has(id)) {
    console.log(`[req-${crypto.randomUUID()}] Created new session tracking for session ${id}`);
    sessions.set(id, { timestamp: new Date() });
  }
  return sessions.get(id);
}

async function notifyLeadConnected(leadId, callSid, status, phoneNumber) {
  try {
    const callState = status === 'in-progress' ? 'connected' : 
                      status === 'completed' || status === 'busy' || 
                      status === 'no-answer' || status === 'failed' || 
                      status === 'canceled' ? 'disconnected' :
                      status === 'ringing' || status === 'queued' ? 'dialing' : 'unknown';
    
    console.log(`Notifying lead-connected for lead: ${leadId}, status: ${status}, state: ${callState}`);
    
    await supabase.functions.invoke('lead-connected', {
      body: { 
        leadId,
        callData: {
          callSid,
          status,
          phoneNumber,
          timestamp: new Date().toISOString(),
          callState
        }
      }
    });
  } catch (err) {
    console.error('Error notifying lead-connected:', err);
  }
}

Deno.serve(async (req) => {
  const reqId = `req-${crypto.randomUUID().slice(0, 13)}`;
  console.log(`[${reqId}] Processing request`);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to Twilio Voice function');
    
    const url = new URL(req.url);
    // Check if this is a dial action response
    const isDialAction = url.searchParams.get('dialAction') === 'true';
    const phoneNumber = url.searchParams.get('phoneNumber');
    
    const formData = await req.formData();
    const formDataObj = {};
    for (const [key, value] of formData.entries()) {
      formDataObj[key] = value;
    }
    
    console.log(`[${reqId}] Received form data request:`, JSON.stringify(formDataObj));
    
    // Create or retrieve session tracking
    const session = createSession();
    
    if (isDialAction) {
      // Process dial action response
      const status = formDataObj.DialCallStatus || formDataObj.CallStatus;
      const callSid = formDataObj.CallSid;
      const callDuration = formDataObj.CallDuration || formDataObj.DialCallDuration;
      
      console.log(`[${reqId}] Processing dial action response: Status=${status}, Error=${formDataObj.DialCallError || ''}`);
      console.log(`[${reqId}] Call ${callSid} has been active for ${Date.now()}ms`);
      
      // Check for call completion
      if (status === 'completed' || status === 'busy' || status === 'failed' || status === 'no-answer' || status === 'canceled') {
        console.log(`[${reqId}] Call ${callSid} was answered and completed normally`);
        
        // Notify lead connected with completion status if we have a phone number
        if (phoneNumber && phoneNumber !== '1') {
          await notifyLeadConnected(phoneNumber, callSid, status, phoneNumber);
        }
      }
      
      // Return empty TwiML response
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200
        }
      );
    }

    // Check if this is a callback from Twilio (status update)
    const callbackSource = formDataObj.CallbackSource;
    if (callbackSource === 'call-progress-events') {
      const callStatus = formDataObj.CallStatus;
      const callSid = formDataObj.CallSid;
      const from = formDataObj.From;
      
      console.log(`[${reqId}] Processing incoming call from Twilio: CallSid=${callSid}, Caller=${formDataObj.Caller}`);
      
      // Extract phone number from client identity if possible
      let callerPhone = null;
      if (from && from.startsWith('client:')) {
        // Check if we have a phone number to dial
        callerPhone = phoneNumber || '1'; // Default to 1 if no number provided
        console.log(`[${reqId}] Found phone number to dial: ${callerPhone}`);
        
        // Notify lead connected with call status if we have a reasonable phone number
        if (callerPhone && callerPhone !== '1' && callerPhone.length > 2) {
          await notifyLeadConnected(callerPhone, callSid, callStatus, callerPhone);
        }
        
        // Create TwiML to dial to external number
        console.log(`[${reqId}] Dialing +${callerPhone} with caller ID: ${TWILIO_PHONE_NUMBER}`);
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${TWILIO_PHONE_NUMBER}" timeout="30" answerOnBridge="true" 
        action="${url.origin}${url.pathname}?dialAction=true&phoneNumber=${callerPhone}" method="POST">
    <Number>+${callerPhone}</Number>
  </Dial>
</Response>`;
        
        console.log(`[${reqId}] Generated TwiML for incoming call:`, twiml);
        
        return new Response(twiml, {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200
        });
      }
    }
    
    // Default TwiML response (empty)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('Error in Twilio voice function:', error);
    
    // Always return valid TwiML, even on error
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200
      }
    );
  }
});
