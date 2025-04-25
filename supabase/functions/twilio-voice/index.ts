
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import twilio from 'npm:twilio@4.18.1';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// For tracking calls in memory (temporary solution until we implement database tracking)
const callLogs = new Map<string, Array<{
  phoneNumber: string,
  timestamp: number,
  status: string,
  duration?: number,
  callSid?: string
}>>();

// The Twilio phone number to use as the caller ID
const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER") || "+18158625164";
const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get URL and query parameters
    const url = new URL(req.url);
    const isDialAction = url.searchParams.get('dialAction') === 'true';
    const phoneNumber = url.searchParams.get('phoneNumber') || '';
    const sessionId = url.searchParams.get('sessionId') || 'default-session';
    
    if (!callLogs.has(sessionId)) {
      callLogs.set(sessionId, []);
    }

    // Parse request body as form data (how Twilio sends it)
    const contentType = req.headers.get('content-type') || '';
    let body: any = {};
    
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        body[key] = value;
      }
    }

    // Special actions
    if (body.action === 'hangupAll') {
      console.log('Hanging up all active calls via API');
      if (accountSid && authToken) {
        const client = twilio(accountSid, authToken);
        const calls = await client.calls.list({ status: 'in-progress' });
        
        let hungUpCount = 0;
        for (const call of calls) {
          await client.calls(call.sid).update({ status: 'completed' });
          hungUpCount++;
        }
        
        return new Response(
          JSON.stringify({ success: true, hungUpCount }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Special action to clear call logs for a session
    if (body.action === 'clearCallLogs' && body.sessionId) {
      callLogs.set(body.sessionId, []);
      return new Response(
        JSON.stringify({ success: true, message: `Call logs cleared for session ${body.sessionId}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get call logs for a session
    if (body.action === 'getCallLogs' && body.sessionId) {
      const logs = callLogs.get(body.sessionId) || [];
      return new Response(
        JSON.stringify({ success: true, logs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle dial action result (when a call is completed)
    if (isDialAction) {
      const dialCallStatus = body.DialCallStatus || 'unknown';
      const dialCallSid = body.DialCallSid;
      const errorCode = body.ErrorCode;
      const errorMessage = body.ErrorMessage;
      
      // Log the call attempt outcome
      const logs = callLogs.get(sessionId) || [];
      const existingLogIndex = logs.findIndex(log => log.phoneNumber === phoneNumber);
      
      if (existingLogIndex >= 0) {
        logs[existingLogIndex] = {
          ...logs[existingLogIndex],
          status: dialCallStatus,
          callSid: dialCallSid,
          errorCode,
          errorMessage,
          timestamp: Date.now()
        };
      } else {
        logs.push({
          phoneNumber,
          status: dialCallStatus,
          callSid: dialCallSid,
          errorCode,
          errorMessage,
          timestamp: Date.now()
        });
      }
      callLogs.set(sessionId, logs);

      console.log(`Call to ${phoneNumber} ended with status: ${dialCallStatus}`);
      
      // Handle different call statuses
      if (dialCallStatus === 'failed' && errorCode) {
        console.warn(`Call failed with error code ${errorCode}: ${errorMessage}`);
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
           <Response>
             <Say>The call could not be completed. ${errorMessage || 'An error occurred.'}</Say>
             <Hangup/>
           </Response>`,
          { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
        );
      } else if (dialCallStatus === 'busy') {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
           <Response>
             <Say>The number is busy. Please try again later.</Say>
             <Hangup/>
           </Response>`,
          { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
        );
      } else if (dialCallStatus === 'no-answer') {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
           <Response>
             <Say>There was no answer. Please try again later.</Say>
             <Hangup/>
           </Response>`,
          { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
        );
      } else if (dialCallStatus === 'completed') {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
           <Response>
             <Say>The call has ended.</Say>
             <Hangup/>
           </Response>`,
          { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
        );
      }
      
      // Default response for other statuses
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
         <Response>
           <Say>The call has ended with status: ${dialCallStatus}</Say>
           <Hangup/>
         </Response>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }

    // Handle regular voice request
    const leadId = body.leadId || 'unknown';
    
    // Log the call attempt
    const logs = callLogs.get(sessionId) || [];
    logs.push({
      phoneNumber,
      status: 'initiated',
      timestamp: Date.now(),
      leadId
    });
    callLogs.set(sessionId, logs);
    
    console.log(`Initiating call to ${phoneNumber} for lead ${leadId}`);
    
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
       <Response>
         <Dial callerId="${fromNumber}" timeout="30" answerOnBridge="true" 
               action="${url.origin + url.pathname}?dialAction=true&phoneNumber=${encodeURIComponent(phoneNumber)}&sessionId=${encodeURIComponent(sessionId)}" 
               method="POST">
           <Number>${phoneNumber}</Number>
         </Dial>
       </Response>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );
  } catch (error) {
    console.error("Error handling Twilio voice request:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
       <Response>
         <Say>An error occurred: ${error.message || 'Unknown error'}</Say>
         <Hangup/>
       </Response>`,
      { 
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200 // Return 200 even for errors to prevent Twilio retries
      }
    );
  }
});
