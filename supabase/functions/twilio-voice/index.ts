
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Twilio
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Track active calls and their status
const activeCallRegistry = new Map();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse the request body
    const data = await req.json();
    const action = data.action || '';
    console.log(`Received voice action: ${action}`);
    
    // Initialize Twilio API (dynamically import to avoid issues)
    const twilio = await import('npm:twilio@4.10.0');
    const twilioClient = twilio.default(twilioAccountSid, twilioAuthToken);
    
    // Process the request based on the action
    switch (action) {
      case 'makeCall': {
        // Extract parameters
        const phoneNumber = data.phoneNumber;
        const leadId = data.leadId;
        const browserClientName = data.browserClientName;
        
        if (!phoneNumber || !leadId) {
          throw new Error('Missing required parameters: phoneNumber and leadId are required');
        }
        
        console.log(`Initiating call to ${phoneNumber} for lead ${leadId}`);
        
        // Create a unique conference name based on the lead ID and timestamp
        const conferenceRoomName = `Conference_Room_${Date.now()}_${leadId}`;
        
        // First, we only make the outbound call and don't try to connect to conference yet
        // This ensures we don't try to connect before the call is answered
        const phoneCall = await twilioClient.calls.create({
          to: phoneNumber,
          from: twilioPhoneNumber,
          twiml: `
            <Response>
              <Say>Please wait while we connect your call.</Say>
              <Pause length="2"/>
              <Dial>
                <Conference 
                  statusCallback="${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-conference-status?leadId=${leadId}"
                  statusCallbackEvent="start join end leave mute hold"
                  startConferenceOnEnter="true"
                  endConferenceOnExit="true"
                  waitUrl="https://demo.twilio.com/docs/classic.mp3"
                  waitMethod="GET">
                  ${conferenceRoomName}
                </Conference>
              </Dial>
            </Response>
          `
        });
        
        // Store the call details in our registry
        activeCallRegistry.set(leadId, {
          phoneCallSid: phoneCall.sid,
          conferenceRoomName,
          status: 'initiated',
          timestamp: Date.now()
        });
        
        console.log(`Outbound call initiated with SID: ${phoneCall.sid} for lead ${leadId}`);
        
        // Now, if a browser client name was provided, connect them to the conference
        if (browserClientName) {
          // Delay slightly to ensure call has enough time to be set up
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Call the browser client to connect them to the conference
          const browserCall = await twilioClient.calls.create({
            to: `client:${browserClientName}`,
            from: twilioPhoneNumber,
            twiml: `
              <Response>
                <Dial>
                  <Conference
                    statusCallbackEvent="start join end leave mute hold"
                    startConferenceOnEnter="true"
                    endConferenceOnExit="true">
                    ${conferenceRoomName}
                  </Conference>
                </Dial>
              </Response>
            `
          });
          
          // Update our registry with browser call info
          const callInfo = activeCallRegistry.get(leadId);
          if (callInfo) {
            callInfo.browserCallSid = browserCall.sid;
            activeCallRegistry.set(leadId, callInfo);
          }
          
          console.log(`Browser client call created with SID: ${browserCall.sid} for lead ${leadId}`);
        }
        
        // Return the call details
        return new Response(JSON.stringify({
          success: true,
          phoneCallSid: phoneCall.sid,
          browserCallSid: browserClientName ? activeCallRegistry.get(leadId)?.browserCallSid : undefined,
          conferenceName: conferenceRoomName
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      case 'checkCallStatus': {
        const leadId = data.leadId;
        if (!leadId) {
          throw new Error('Missing required parameter: leadId');
        }
        
        // Get call info from our registry
        const callInfo = activeCallRegistry.get(leadId);
        
        if (!callInfo) {
          return new Response(JSON.stringify({
            success: false,
            status: 'not_found',
            error: 'Call not found in registry'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
        
        // Check the call status in Twilio
        try {
          const phoneCallStatus = callInfo.phoneCallSid 
            ? (await twilioClient.calls(callInfo.phoneCallSid).fetch()).status
            : 'unknown';
            
          const browserCallStatus = callInfo.browserCallSid
            ? (await twilioClient.calls(callInfo.browserCallSid).fetch()).status
            : 'unknown';
            
          return new Response(JSON.stringify({
            success: true,
            phoneCallStatus,
            browserCallStatus,
            conferenceRoomName: callInfo.conferenceRoomName
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } catch (error) {
          console.error(`Error fetching call status: ${error.message}`);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }
      
      case 'hangupCall': {
        const leadId = data.leadId;
        const callSid = data.callSid;
        
        if (callSid) {
          // Hang up specific call
          await twilioClient.calls(callSid).update({status: 'completed'});
          console.log(`Call ${callSid} has been terminated`);
        } else if (leadId) {
          // Hang up calls for this lead
          const callInfo = activeCallRegistry.get(leadId);
          
          if (callInfo) {
            if (callInfo.phoneCallSid) {
              try {
                await twilioClient.calls(callInfo.phoneCallSid).update({status: 'completed'});
                console.log(`Phone call ${callInfo.phoneCallSid} for lead ${leadId} has been terminated`);
              } catch (error) {
                console.log(`Error hanging up phone call: ${error.message}`);
              }
            }
            
            if (callInfo.browserCallSid) {
              try {
                await twilioClient.calls(callInfo.browserCallSid).update({status: 'completed'});
                console.log(`Browser call ${callInfo.browserCallSid} for lead ${leadId} has been terminated`);
              } catch (error) {
                console.log(`Error hanging up browser call: ${error.message}`);
              }
            }
            
            activeCallRegistry.delete(leadId);
          }
        } else {
          throw new Error('Missing required parameter: either leadId or callSid');
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Call(s) terminated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      case 'hangupAll': {
        // Hang up all active calls
        const hangupPromises = [];
        
        for (const [leadId, callInfo] of activeCallRegistry.entries()) {
          if (callInfo.phoneCallSid) {
            hangupPromises.push(
              twilioClient.calls(callInfo.phoneCallSid)
                .update({status: 'completed'})
                .catch(err => console.error(`Failed to hang up call ${callInfo.phoneCallSid}: ${err.message}`))
            );
          }
          
          if (callInfo.browserCallSid) {
            hangupPromises.push(
              twilioClient.calls(callInfo.browserCallSid)
                .update({status: 'completed'})
                .catch(err => console.error(`Failed to hang up call ${callInfo.browserCallSid}: ${err.message}`))
            );
          }
        }
        
        await Promise.allSettled(hangupPromises);
        activeCallRegistry.clear();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'All calls terminated'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`Error in twilio-voice function: ${error.message}`);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'An unknown error occurred' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
