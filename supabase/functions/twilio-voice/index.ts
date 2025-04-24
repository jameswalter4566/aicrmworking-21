
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import twilio from "https://esm.sh/twilio@4.18.1";

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting - track call attempts to prevent spam
const callRateLimit = {
  callsByNumber: new Map<string, {count: number, lastAttempt: number}>(),
  maxCallsPerWindow: 2,     // Maximum 2 calls to the same number
  windowMs: 60000,          // In a 60-second window
  ipLimiter: new Map<string, {count: number, lastAttempt: number}>(),
  maxCallsPerIp: 5,         // Maximum 5 call attempts per IP
  ipWindowMs: 60000,        // In a 60-second window
  blacklistedNumbers: new Set<string>(),
};

// For tracking concurrent calls per user/session
const activeSessions = new Map<string, {
  callCount: number,
  lastCallTime: number,
}>();

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  
  // Clean up number entries older than the window
  for (const [number, data] of callRateLimit.callsByNumber.entries()) {
    if (now - data.lastAttempt > callRateLimit.windowMs) {
      callRateLimit.callsByNumber.delete(number);
    }
  }
  
  // Clean up IP entries older than the window
  for (const [ip, data] of callRateLimit.ipLimiter.entries()) {
    if (now - data.lastAttempt > callRateLimit.ipWindowMs) {
      callRateLimit.ipLimiter.delete(ip);
    }
  }
  
  // Clean up active sessions that haven't made calls in 5 minutes
  for (const [sessionId, data] of activeSessions.entries()) {
    if (now - data.lastCallTime > 300000) {
      activeSessions.delete(sessionId);
    }
  }
}, 300000); // Run every 5 minutes

// Helper to normalize phone numbers for consistent comparison
function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, '');
}

// Main function to handle requests
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Twilio client
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
  const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

  try {
    const url = new URL(req.url);
    const dialAction = url.searchParams.get('dialAction') === 'true';
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const sessionId = url.searchParams.get('sessionId') || 'default';

    // Track and limit calls per session
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, {
        callCount: 0,
        lastCallTime: Date.now()
      });
    }

    const sessionData = activeSessions.get(sessionId)!;
    
    // Update last call time
    sessionData.lastCallTime = Date.now();

    if (req.headers.get("content-type")?.includes("application/json")) {
      // Handle JSON requests (used for hangupAll)
      const data = await req.json();
      
      if (data.action === 'hangupAll') {
        console.log('Handling hangupAll request');

        try {
          const calls = await twilioClient.calls.list({ status: 'in-progress', limit: 20 });
          let hungUpCount = 0;

          for (const call of calls) {
            try {
              await twilioClient.calls(call.sid).update({ status: 'completed' });
              hungUpCount++;
            } catch (callError) {
              console.error(`Error hanging up call ${call.sid}:`, callError);
            }
          }

          // Reset session data after hanging up all calls
          activeSessions.delete(sessionId);

          return new Response(JSON.stringify({
            success: true,
            hungUpCount,
            message: 'Initiated hangup for all active calls'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        } catch (error) {
          console.error('Error listing or updating calls:', error);

          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to hang up calls: ' + (error.message || error)
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unknown action' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    } else {
      // Handle form data (used for TwiML generation)
      console.log('Received request to Twilio Voice function');
      let formData;
      
      try {
        formData = await req.formData();
      } catch (error) {
        console.error('Error parsing form data:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid form data' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      
      // Convert formData to an object for easier access
      const params: Record<string, string> = {};
      for (const [key, value] of formData.entries()) {
        params[key] = value.toString();
      }

      console.log('Received form data request:', JSON.stringify(params));
      
      if (dialAction) {
        // This is a response to a dial action (call completed, not answered, etc.)
        console.log('Processing dial action with status:', params.DialCallStatus);
        
        // If failed with error code 13225 or related to call limits, record in blacklisted numbers
        if (params.ErrorCode === '13225' || params.ErrorCode === '20003' || params.ErrorMessage?.includes('blacklist')) {
          if (params.phoneNumber) {
            const normalizedNumber = normalizePhoneNumber(params.phoneNumber);
            console.log(`Phone number ${params.phoneNumber} is blacklisted due to error ${params.ErrorCode}.`);
            callRateLimit.blacklistedNumbers.add(normalizedNumber);
          }
        }
        
        // Return empty TwiML to complete the call
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200,
        });
      } else if (params.phoneNumber) {
        // This is a call from the browser to a phone
        console.log('Processing form outbound call request to:', params.phoneNumber);
        
        // Rate limiting logic
        const normalizedNumber = normalizePhoneNumber(params.phoneNumber);
        
        // Check for blacklisted number
        if (callRateLimit.blacklistedNumbers.has(normalizedNumber)) {
          console.log(`Blocked attempt to call blacklisted number: ${params.phoneNumber}`);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'This number is blacklisted and cannot be called.',
            errorCode: 13225
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          });
        }
        
        // Check IP rate limits
        const ipLimitData = callRateLimit.ipLimiter.get(clientIp) || { count: 0, lastAttempt: 0 };
        const now = Date.now();
        
        // Reset counter if outside window
        if (now - ipLimitData.lastAttempt > callRateLimit.ipWindowMs) {
          ipLimitData.count = 0;
        }
        
        if (ipLimitData.count >= callRateLimit.maxCallsPerIp) {
          console.log(`IP ${clientIp} has exceeded call rate limits`);
          return new Response(JSON.stringify({
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
            errorCode: 20003
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429,
          });
        }
        
        // Check number rate limits
        const numberLimitData = callRateLimit.callsByNumber.get(normalizedNumber) || { count: 0, lastAttempt: 0 };
        
        // Reset counter if outside window
        if (now - numberLimitData.lastAttempt > callRateLimit.windowMs) {
          numberLimitData.count = 0;
        }
        
        if (numberLimitData.count >= callRateLimit.maxCallsPerWindow) {
          console.log(`Number ${params.phoneNumber} has exceeded call rate limits`);
          return new Response(JSON.stringify({
            success: false,
            error: 'Too many attempts to call this number. Please try again later.',
            errorCode: 20003
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429,
          });
        }
        
        // Update rate limit counters
        numberLimitData.count++;
        numberLimitData.lastAttempt = now;
        callRateLimit.callsByNumber.set(normalizedNumber, numberLimitData);
        
        ipLimitData.count++;
        ipLimitData.lastAttempt = now;
        callRateLimit.ipLimiter.set(clientIp, ipLimitData);
        
        // Increment session call count
        sessionData.callCount++;
        
        console.log(`Form Request: Dialing ${params.phoneNumber} with caller ID: ${twilioPhoneNumber}`);
        
        // Generate TwiML to create the call
        // Include sessionId and phoneNumber in the callback URL for better tracking
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${twilioPhoneNumber}" timeout="30" answerOnBridge="true" action="${url.origin}${url.pathname}?dialAction=true&phoneNumber=${encodeURIComponent(params.phoneNumber)}&sessionId=${encodeURIComponent(sessionId)}" method="POST"><Number>${params.phoneNumber}</Number></Dial></Response>`;
        
        console.log('Generated TwiML for form request:', twiml);
        
        return new Response(twiml, {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200,
        });
      } else {
        console.error('Missing required parameters');
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Missing required parameters</Say></Response>', {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 400,
        });
      }
    }
  } catch (error) {
    console.error('Error in Twilio Voice function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'An error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
