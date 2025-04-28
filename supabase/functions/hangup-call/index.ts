
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to retrieve all active calls from Twilio as a fallback mechanism
async function getActiveCallsFromTwilio() {
  const twilioBaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json?Status=in-progress`;
  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  
  try {
    console.log(`HANGUP FUNCTION - Fetching active calls from Twilio API: ${twilioBaseUrl}`);
    
    const activeCalls = await fetch(twilioBaseUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
      }
    });
    
    if (!activeCalls.ok) {
      throw new Error(`Twilio API returned ${activeCalls.status}: ${await activeCalls.text()}`);
    }
    
    const callsData = await activeCalls.json();
    console.log("HANGUP FUNCTION - Active calls in Twilio:", JSON.stringify(callsData, null, 2));
    
    return callsData?.calls || [];
  } catch (error) {
    console.error("HANGUP FUNCTION - Error fetching active calls from Twilio:", error);
    return [];
  }
}

// Function to find the most recent active call in database
async function getMostRecentActiveCallFromDB() {
  try {
    console.log("HANGUP FUNCTION - Trying to find most recent active call in database");
    
    // First try predictive_dialer_calls
    const { data: activeCall, error } = await supabase
      .from('predictive_dialer_calls')
      .select('twilio_call_sid, contact_id')
      .eq('status', 'in_progress')
      .order('start_timestamp', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error("HANGUP FUNCTION - Error querying predictive_dialer_calls:", error);
    } else if (activeCall && activeCall.length > 0) {
      console.log(`HANGUP FUNCTION - Found active call in predictive_dialer_calls: ${activeCall[0].twilio_call_sid}`);
      return activeCall[0];
    }
    
    // If no call found, check dialing_session_leads
    const { data: sessionLead, error: sessionError } = await supabase
      .from('dialing_session_leads')
      .select('id, lead_id, notes')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (sessionError) {
      console.error("HANGUP FUNCTION - Error querying dialing_session_leads:", sessionError);
    } else if (sessionLead && sessionLead.length > 0) {
      console.log(`HANGUP FUNCTION - Found most recent lead from dialing session: ${sessionLead[0].lead_id}`);
      
      // Try to extract call SID from notes if it exists
      try {
        if (sessionLead[0].notes) {
          const notesData = JSON.parse(sessionLead[0].notes);
          if (notesData.callSid) {
            console.log(`HANGUP FUNCTION - Found callSid in notes: ${notesData.callSid}`);
            return { 
              twilio_call_sid: notesData.callSid, 
              contact_id: notesData.originalLeadId || sessionLead[0].lead_id 
            };
          }
        }
      } catch (parseError) {
        console.error("HANGUP FUNCTION - Error parsing notes JSON:", parseError);
      }
      
      // If no call SID in notes, check Twilio API for active calls
      const activeCalls = await getActiveCallsFromTwilio();
      if (activeCalls && activeCalls.length > 0) {
        const firstCall = activeCalls[0];
        console.log(`HANGUP FUNCTION - Using first active call from Twilio API: ${firstCall.sid}`);
        return { 
          twilio_call_sid: firstCall.sid,
          contact_id: sessionLead[0].lead_id 
        };
      }
    }
    
    return null;
  } catch (dbError) {
    console.error("HANGUP FUNCTION - Database error while looking for active calls:", dbError);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    console.log("=============== HANGUP FUNCTION INVOKED ===============");
    console.log("REQUEST URL:", req.url);
    console.log("REQUEST METHOD:", req.method);
    console.log("REQUEST HEADERS:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    // Handle CORS
    if (req.method === 'OPTIONS') {
      console.log("HANGUP FUNCTION - Handling CORS preflight request");
      return new Response(null, { headers: corsHeaders });
    }

    // Log current active calls in the system to help debug
    try {
      const activeCalls = await getActiveCallsFromTwilio();
      console.log(`HANGUP FUNCTION - Found ${activeCalls.length} active calls in Twilio`);
    } catch (activeCallsError) {
      console.error("HANGUP FUNCTION - Error fetching active calls:", activeCallsError);
    }

    try {
      // Try to read request body as text first
      const bodyText = await req.text();
      console.log("HANGUP FUNCTION - Raw request body:", bodyText);
      
      // Always attempt to parse and log the request body
      let requestBody = {};
      
      try {
        // Parse the text as JSON if possible
        requestBody = JSON.parse(bodyText);
        console.log("HANGUP FUNCTION - Parsed request body:", JSON.stringify(requestBody, null, 2));
      } catch (parseError) {
        console.error("HANGUP FUNCTION - Error parsing request body as JSON:", parseError);
        
        // If parsing as JSON fails, try form data
        try {
          const formData = await req.formData();
          requestBody = {};
          for (const [key, value] of formData.entries()) {
            requestBody[key] = value;
          }
          console.log("HANGUP FUNCTION - Parsed request as form data:", JSON.stringify(requestBody, null, 2));
        } catch (formDataError) {
          console.error("HANGUP FUNCTION - Error parsing as form data:", formDataError);
          
          // If all parsing fails, try to extract data from URL search params
          try {
            const url = new URL(req.url);
            const callSidFromUrl = url.searchParams.get('CallSid') || url.searchParams.get('callSid');
            if (callSidFromUrl) {
              requestBody = { callSid: callSidFromUrl };
              console.log("HANGUP FUNCTION - Extracted CallSid from URL:", callSidFromUrl);
            }
          } catch (urlError) {
            console.error("HANGUP FUNCTION - Error extracting params from URL:", urlError);
          }
        }
      }
      
      let callSid = requestBody?.callSid || 
                    requestBody?.CallSid || 
                    requestBody?.callsid || 
                    requestBody?.call_sid;
                    
      const userId = requestBody?.userId || 
                    requestBody?.user_id || 
                    requestBody?.agentId || 
                    requestBody?.agent_id || 
                    'anonymous';

      // Even if no callSid is provided, log the attempt
      console.log(`HANGUP FUNCTION - Call SID provided: ${callSid || 'NONE'}`);
      
      // If no callSid provided, try to find one
      if (!callSid) {
        console.log("HANGUP FUNCTION - No callSid provided, checking for active calls in the database");
        
        const activeCall = await getMostRecentActiveCallFromDB();
        
        if (activeCall && activeCall.twilio_call_sid) {
          callSid = activeCall.twilio_call_sid;
          console.log(`HANGUP FUNCTION - Using database-found callSid: ${callSid}`);
          
          // Now attempt to end this call
          await handleCallTermination(callSid, userId, activeCall.contact_id);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Call ended successfully using database-found call SID" 
            }), 
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          );
        } else {
          console.log("HANGUP FUNCTION - No active calls found in database, checking Twilio API directly");
          
          // As a last resort, check Twilio API for any active calls
          const activeCalls = await getActiveCallsFromTwilio();
          if (activeCalls && activeCalls.length > 0) {
            callSid = activeCalls[0].sid;
            console.log(`HANGUP FUNCTION - Using Twilio API-found callSid: ${callSid}`);
            
            // Now attempt to end this call
            await handleCallTermination(callSid, userId);
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: "Call ended successfully using Twilio API-found call SID" 
              }), 
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
              }
            );
          }
          
          console.error("HANGUP FUNCTION - Error: No callSid provided and no active calls found");
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Call SID is required or no active calls found'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }
      }

      // Proceed with call termination if we have a callSid
      return await handleCallTermination(callSid, userId);

    } catch (error) {
      console.error('HANGUP FUNCTION - Error ending call:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
  } catch (outerError) {
    console.error("HANGUP FUNCTION - CRITICAL ERROR IN HANDLER:", outerError);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Critical server error occurred"
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Extracted function to handle call termination logic
async function handleCallTermination(callSid: string, userId: string, contactId?: string | number) {
  console.log(`HANGUP FUNCTION - Attempting to end call ${callSid} by user ${userId || 'anonymous'}`);

  // Call Twilio's API to end the call
  const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls/${callSid}.json`;
  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

  console.log(`HANGUP FUNCTION - Making request to Twilio endpoint: ${twilioEndpoint}`);
  console.log(`HANGUP FUNCTION - Using Twilio account SID: ${twilioAccountSid.substring(0, 5)}...`);
  console.log(`HANGUP FUNCTION - Auth token present: ${twilioAuthToken ? 'Yes' : 'No'}`);
  
  try {
    const twilioResponse = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'Status=completed'
    });

    const responseStatus = twilioResponse.status;
    console.log(`HANGUP FUNCTION - Twilio API response status: ${responseStatus}`);
    
    let responseText;
    try {
      responseText = await twilioResponse.text();
      console.log(`HANGUP FUNCTION - Twilio API response: ${responseText}`);
    } catch (textError) {
      console.error("HANGUP FUNCTION - Error reading Twilio response text:", textError);
      responseText = "Error reading response";
    }

    if (!twilioResponse.ok) {
      console.error(`HANGUP FUNCTION - Twilio API error: ${responseStatus} - ${responseText}`);
      throw new Error(`Failed to end call: ${responseText}`);
    }

    // Even if we don't have a contactId, try to search for it
    if (!contactId) {
      try {
        // Find the call in predictive_dialer_calls first to get the contact_id
        const callQuery = await supabase
          .from('predictive_dialer_calls')
          .select('contact_id')
          .eq('twilio_call_sid', callSid)
          .single();
          
        if (callQuery.data?.contact_id) {
          console.log(`HANGUP FUNCTION - Found contact_id: ${callQuery.data.contact_id} for call ${callSid}`);
          contactId = callQuery.data.contact_id;
        } else {
          console.log(`HANGUP FUNCTION - Could not find contact_id for call ${callSid} in predictive_dialer_calls`);
        }
      } catch (dbError) {
        console.error("HANGUP FUNCTION - Error searching for contact_id:", dbError);
      }
    }

    // Log the hang-up action
    console.log(`HANGUP FUNCTION - Logging hang-up action for call ${callSid} by user ${userId}`);
    
    try {
      const { data: logData, error: logError } = await supabase.from('call_logs').insert({
        call_sid: callSid,
        user_id: userId,
        action: 'hangup',
        timestamp: new Date().toISOString()
      });
      
      if (logError) {
        console.error('HANGUP FUNCTION - Error logging call action to database:', logError);
      } else {
        console.log('HANGUP FUNCTION - Successfully logged call action to database');
      }
    } catch (logDbError) {
      console.error('HANGUP FUNCTION - Error in database logging operation:', logDbError);
    }
    
    // Notify the lead-connected function about the hangup
    try {
      if (contactId) {
        console.log(`HANGUP FUNCTION - Notifying lead-connected function about hangup for lead ${contactId}`);
        
        // Invoke lead-connected with the found contact_id
        await supabase.functions.invoke('lead-connected', {
          body: { 
            leadId: contactId.toString(),
            callData: {
              callSid,
              status: 'completed',
              timestamp: new Date().toISOString(),
              callState: 'disconnected',
              hangupTriggered: true
            }
          }
        });
        
        console.log(`HANGUP FUNCTION - Notified lead-connected function about hangup for lead ${contactId}`);
      } else {
        console.log(`HANGUP FUNCTION - Could not find contact_id for call ${callSid}, cannot notify lead-connected`);
      }
    } catch (notifyError) {
      console.error('HANGUP FUNCTION - Error notifying lead-connected:', notifyError);
    }

    console.log("HANGUP FUNCTION - Successfully ended call");
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Call ended successfully" 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (twilioError) {
    console.error("HANGUP FUNCTION - Error calling Twilio API:", twilioError);
    throw new Error(`Twilio API error: ${twilioError.message}`);
  }
}
