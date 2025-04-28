
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      const twilioBaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json?Status=in-progress`;
      const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
      
      const activeCalls = await fetch(twilioBaseUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
        }
      });
      
      if (activeCalls.ok) {
        const callsData = await activeCalls.json();
        console.log("HANGUP FUNCTION - Active calls in Twilio:", JSON.stringify(callsData, null, 2));
      }
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
      
      const callSid = requestBody?.callSid || requestBody?.CallSid;
      const userId = requestBody?.userId || 'anonymous';

      // Even if no callSid is provided, log the attempt
      console.log(`HANGUP FUNCTION - Call SID provided: ${callSid || 'NONE'}`);
      
      // If no callSid provided but we're in a debug mode, we'll try to look up active calls
      if (!callSid) {
        console.log("HANGUP FUNCTION - No callSid provided, checking for active calls in the database");
        
        // Try to find any active calls in the database
        try {
          const { data: activeCalls, error } = await supabase
            .from('predictive_dialer_calls')
            .select('twilio_call_sid')
            .eq('status', 'in_progress')
            .limit(1);
          
          if (error) {
            console.error("HANGUP FUNCTION - Error fetching active calls from database:", error);
          } else if (activeCalls && activeCalls.length > 0) {
            const firstActiveCall = activeCalls[0].twilio_call_sid;
            console.log(`HANGUP FUNCTION - Found active call in database: ${firstActiveCall}`);
            
            // Log that we're using this call SID instead
            console.log(`HANGUP FUNCTION - Using database-found callSid: ${firstActiveCall}`);
            
            // Now attempt to end this call
            await handleCallTermination(firstActiveCall, userId);
            
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
            console.log("HANGUP FUNCTION - No active calls found in database");
          }
        } catch (dbError) {
          console.error("HANGUP FUNCTION - Database error while looking for active calls:", dbError);
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

      // Proceed with call termination
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
async function handleCallTermination(callSid: string, userId: string) {
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

    // Log the hang-up action
    if (userId) {
      console.log(`HANGUP FUNCTION - Logging hang-up action for call ${callSid} by user ${userId}`);
      
      try {
        const { data, error } = await supabase.from('call_logs').insert({
          call_sid: callSid,
          user_id: userId,
          action: 'hangup',
          timestamp: new Date().toISOString()
        });
        
        if (error) {
          console.error('HANGUP FUNCTION - Error logging call action to database:', error);
        } else {
          console.log('HANGUP FUNCTION - Successfully logged call action to database');
        }
        
        // Notify the lead-connected function about the hangup
        try {
          // Find the call in predictive_dialer_calls first to get the contact_id
          const callQuery = await supabase
            .from('predictive_dialer_calls')
            .select('contact_id')
            .eq('twilio_call_sid', callSid)
            .single();
            
          if (callQuery.data?.contact_id) {
            console.log(`HANGUP FUNCTION - Found contact_id: ${callQuery.data.contact_id} for call ${callSid}`);
            
            // Invoke lead-connected with the found contact_id
            await supabase.functions.invoke('lead-connected', {
              body: { 
                leadId: callQuery.data.contact_id.toString(),
                callData: {
                  callSid,
                  status: 'completed',
                  timestamp: new Date().toISOString(),
                  callState: 'disconnected',
                  hangupTriggered: true
                }
              }
            });
            
            console.log(`HANGUP FUNCTION - Notified lead-connected function about hangup for lead ${callQuery.data.contact_id}`);
          } else {
            console.log(`HANGUP FUNCTION - Could not find contact_id for call ${callSid}`);
            
            // If we couldn't find in predictive_dialer_calls, try dialing_session_leads
            const sessionLeadQuery = await supabase
              .from('dialing_session_leads')
              .select('lead_id, notes')
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (sessionLeadQuery.data && sessionLeadQuery.data.length > 0) {
              const leadId = sessionLeadQuery.data[0].lead_id;
              console.log(`HANGUP FUNCTION - Found most recent lead_id from session: ${leadId}`);
              
              // Try to extract original lead ID from notes JSON
              try {
                const notesData = JSON.parse(sessionLeadQuery.data[0].notes || '{}');
                const originalLeadId = notesData.originalLeadId;
                
                if (originalLeadId) {
                  console.log(`HANGUP FUNCTION - Found originalLeadId from notes: ${originalLeadId}`);
                  
                  // Notify lead-connected with this info
                  await supabase.functions.invoke('lead-connected', {
                    body: { 
                      leadId: originalLeadId.toString(),
                      callData: {
                        callSid: callSid || 'UNKNOWN',
                        status: 'completed',
                        timestamp: new Date().toISOString(),
                        callState: 'disconnected',
                        hangupTriggered: true
                      }
                    }
                  });
                  
                  console.log(`HANGUP FUNCTION - Notified lead-connected using originalLeadId: ${originalLeadId}`);
                }
              } catch (parseError) {
                console.error('HANGUP FUNCTION - Error parsing notes JSON:', parseError);
              }
            }
          }
        } catch (notifyError) {
          console.error('HANGUP FUNCTION - Error notifying lead-connected:', notifyError);
        }
      } catch (dbError) {
        console.error('HANGUP FUNCTION - Error in database operation:', dbError);
      }
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
