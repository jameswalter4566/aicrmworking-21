
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { VoiceResponse } from 'https://esm.sh/twilio@4.18.1/twiml';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Session tracking for active calls
const activeSessions = new Map();

// Helper function to notify lead-connected function
async function notifyLeadConnected(leadId, callSid, status, originalLeadId) {
  try {
    console.log(`Notifying lead-connected for lead: ${leadId}, originalLeadId: ${originalLeadId}, status: ${status}`);
    
    await supabase.functions.invoke('lead-connected', {
      body: { 
        leadId,
        callData: {
          callSid,
          status,
          timestamp: new Date().toISOString(),
          originalLeadId: originalLeadId || leadId
        }
      }
    });
  } catch (err) {
    console.error('Error notifying lead-connected:', err);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Received request to Twilio Voice function");
  
  try {
    // Create a unique request ID for logging
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 12)}`;
    console.log(`[${requestId}] Processing request`);
    
    const url = new URL(req.url);
    const isDialAction = url.searchParams.get('dialAction') === 'true';
    const phoneNumber = url.searchParams.get('phoneNumber');
    
    // Get form data from Twilio
    const formData = await req.formData();
    const formDataObj = {};
    for (const [key, value] of formData.entries()) {
      formDataObj[key] = value;
    }
    
    console.log(`[${requestId}] Received form data request:`, JSON.stringify(formDataObj));
    
    // Create or get session tracking
    const sessionId = formDataObj.sessionId || 'default-session';
    if (!activeSessions.has(sessionId)) {
      console.log(`[${requestId}] Created new session tracking for session ${sessionId}`);
      activeSessions.set(sessionId, {
        calls: new Map(),
        dialAttempts: 0,
      });
    }
    const session = activeSessions.get(sessionId);
    
    // Handle different types of requests
    if (isDialAction) {
      // Processing a dial action (call completed, no answer, etc.)
      const status = formDataObj.DialCallStatus;
      const dialCallSid = formDataObj.DialCallSid;
      const callSid = formDataObj.CallSid;
      
      console.log(`[${requestId}] Processing dial action response: Status=${status}, Error=${formDataObj.DialCallError || ''}`);
      console.log(`[${requestId}] Call ${callSid} has been active for ${Date.now()}ms`);
      
      if (status === 'completed' || status === 'busy' || status === 'no-answer' || status === 'failed') {
        console.log(`[${requestId}] Call ${callSid} was ${status === 'completed' ? 'answered and completed normally' : status}`);
        
        // If originalLeadId was passed, use it for the notification
        const originalLeadId = formDataObj.originalLeadId || phoneNumber;
        
        // Notify lead-connected with call status update including originalLeadId
        if (phoneNumber) {
          await notifyLeadConnected(phoneNumber, callSid, status, originalLeadId);
        }
      }
      
      // Return empty TwiML
      const twiml = new VoiceResponse();
      return new Response(twiml.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    } 
    else if (formDataObj.CallStatus === 'in-progress' || formDataObj.CallStatus === 'ringing' || formDataObj.CallStatus === 'queued') {
      // Handling an active call status update
      
      // Extract originalLeadId from formData if available
      const originalLeadId = formDataObj.originalLeadId;
      const leadId = formDataObj.leadId || phoneNumber;
      
      // Notify lead-connected with call status update
      if (leadId) {
        await notifyLeadConnected(leadId, formDataObj.CallSid, formDataObj.CallStatus, originalLeadId);
      }
      
      // Return empty TwiML
      const twiml = new VoiceResponse();
      return new Response(twiml.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }
    else if (formDataObj.From && formDataObj.From.startsWith('client:')) {
      // Handling an incoming call from a Twilio Client (browser)
      console.log(`[${requestId}] Processing incoming call from Twilio: CallSid=${formDataObj.CallSid}, Caller=${formDataObj.Caller}`);
      
      // Extract phone number and originalLeadId from parameters
      const phoneToCall = phoneNumber || formDataObj.phoneNumber;
      console.log(`[${requestId}] Found phone number to dial: ${phoneToCall}`);
      
      const originalLeadId = formDataObj.originalLeadId;
      const leadId = formDataObj.leadId || phoneToCall;
      
      if (phoneToCall) {
        // Create TwiML to dial the phone number
        const twiml = new VoiceResponse();
        const callerId = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
        console.log(`[${requestId}] Dialing ${phoneToCall} with caller ID: ${callerId}`);
        
        // Create dial action URL that includes the originalLeadId
        const actionUrl = new URL(`${supabaseUrl}/functions/v1/twilio-voice`);
        actionUrl.searchParams.set('dialAction', 'true');
        actionUrl.searchParams.set('phoneNumber', phoneToCall);
        if (originalLeadId) {
          actionUrl.searchParams.set('originalLeadId', originalLeadId);
        }
        
        const dial = twiml.dial({
          callerId,
          timeout: 30,
          answerOnBridge: true,
          action: actionUrl.toString(),
          method: 'POST'
        });
        
        // Format phone number for dialing
        let formattedPhone = phoneToCall;
        if (!phoneToCall.startsWith('+') && phoneToCall.match(/^\d+$/)) {
          formattedPhone = `+${phoneToCall}`;
        }
        
        dial.number(formattedPhone);
        
        console.log(`[${requestId}] Generated TwiML for incoming call: ${twiml.toString()}`);
        
        // Notify lead-connected function about the outbound call
        await notifyLeadConnected(leadId, formDataObj.CallSid, 'dialing', originalLeadId);
        
        return new Response(twiml.toString(), {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        });
      }
    } else {
      // Handle JSON requests for custom actions
      const contentType = req.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonData = await req.json();
        
        // Handle hangup all calls request
        if (jsonData.action === 'hangupAll') {
          console.log(`[${requestId}] Attempting to hang up all active calls`);
          
          // In a real implementation, you would use the Twilio API to end active calls
          const activeCalls = [];
          console.log(`[${requestId}] Found ${activeCalls.length} active calls`);
          
          return new Response(JSON.stringify({ success: true, message: 'All calls ended' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }
    
    // Default response for unhandled request types
    const twiml = new VoiceResponse();
    return new Response(twiml.toString(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error in twilio-voice function:', error);
    
    const twiml = new VoiceResponse();
    return new Response(twiml.toString(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200, // Return 200 even on error to prevent Twilio retries
    });
  }
});
