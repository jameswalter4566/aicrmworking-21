
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import twilio from 'npm:twilio@4.23.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
};

console.log("Power Dialer Webhook function loaded");

const DEFAULT_HOLD_MUSIC = "https://assets.twilio.com/resources/hold-music.mp3";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Initialize Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get URL parameters
    const url = new URL(req.url);
    const callId = url.searchParams.get('callId');
    const action = url.searchParams.get('action');
    
    // Parse request body based on content type
    const contentType = req.headers.get('content-type') || '';
    let requestData = {};
    
    if (contentType.includes('application/json')) {
      requestData = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.text();
      const params = new URLSearchParams(formData);
      params.forEach((value, key) => {
        requestData[key] = value;
      });
    } else {
      const text = await req.text();
      try {
        requestData = JSON.parse(text);
      } catch (e) {
        // If it's not JSON, try to parse it as form data
        const params = new URLSearchParams(text);
        params.forEach((value, key) => {
          requestData[key] = value;
        });
      }
    }
    
    if (!callId) {
      console.error("No callId provided");
      return new Response(
        JSON.stringify({ success: false, error: "Call ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing webhook for call ${callId}, action: ${action || 'default'}`);
    console.log("Request data:", JSON.stringify(requestData).substring(0, 200));
    
    // Handle status callbacks
    if (action === 'status') {
      const { CallSid, CallStatus, AnsweredBy } = requestData;
      
      console.log(`Call ${CallSid} status: ${CallStatus}, AnsweredBy: ${AnsweredBy || 'unknown'}`);
      
      // Fetch the current call record
      const { data: callRecord, error: callFetchError } = await supabase
        .from('power_dialer_calls')
        .select('*, contact:contact_id(*)')
        .eq('id', callId)
        .single();
      
      if (callFetchError) {
        console.error("Error fetching call record:", callFetchError);
        return new Response(
          JSON.stringify({ success: false, error: "Call record not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update call status based on the webhook
      switch (CallStatus) {
        case 'completed':
        case 'busy':
        case 'no-answer':
        case 'failed':
          // Call ended, update the call and contact records
          await supabase
            .from('power_dialer_calls')
            .update({
              status: CallStatus === 'completed' ? 'completed' : 'failed',
              end_timestamp: new Date().toISOString(),
              duration: parseInt(requestData.CallDuration || '0', 10)
            })
            .eq('id', callId);
          
          // Update contact status
          const newStatus = CallStatus === 'completed' ? 
            (callRecord.machine_detection_result === 'human' ? 'contacted' : 'voicemail') :
            CallStatus === 'busy' ? 'busy' : 
            CallStatus === 'no-answer' ? 'no_answer' : 'not_contacted';
          
          await supabase
            .from('power_dialer_contacts')
            .update({
              status: newStatus,
              last_call_timestamp: new Date().toISOString()
            })
            .eq('id', callRecord.contact_id);
          
          // If the call was assigned to an agent, update agent status
          if (callRecord.agent_id) {
            await supabase
              .from('power_dialer_agents')
              .update({
                status: 'available',
                current_call_id: null,
                last_status_change: new Date().toISOString()
              })
              .eq('id', callRecord.agent_id);
            
            // Check if there are any calls in the queue
            const { data: queuedCalls } = await supabase
              .from('power_dialer_call_queue')
              .select('*')
              .order('priority', { ascending: false })
              .order('created_timestamp', { ascending: true })
              .limit(1);
            
            if (queuedCalls && queuedCalls.length > 0) {
              // Assign the agent to the next call in the queue
              const nextCall = queuedCalls[0];
              
              await supabase
                .from('power_dialer_call_queue')
                .update({ assigned_to_agent_id: callRecord.agent_id })
                .eq('id', nextCall.id);
              
              await supabase
                .from('power_dialer_calls')
                .update({ agent_id: callRecord.agent_id })
                .eq('id', nextCall.call_id);
              
              await supabase
                .from('power_dialer_agents')
                .update({
                  status: 'busy',
                  current_call_id: nextCall.call_id,
                  last_status_change: new Date().toISOString()
                })
                .eq('id', callRecord.agent_id);
            }
          }
          break;
          
        case 'in-progress':
          // If we've detected answering machine status, handle it
          if (AnsweredBy) {
            await supabase
              .from('power_dialer_calls')
              .update({ machine_detection_result: AnsweredBy.toLowerCase() })
              .eq('id', callId);
            
            if (AnsweredBy.toLowerCase() === 'human') {
              // Find an available agent
              const { data: availableAgents } = await supabase
                .from('power_dialer_agents')
                .select('*')
                .eq('status', 'available')
                .order('last_status_change', { ascending: true })
                .limit(1);
              
              if (availableAgents && availableAgents.length > 0) {
                // Assign the call to the available agent
                const agent = availableAgents[0];
                
                await supabase
                  .from('power_dialer_calls')
                  .update({ agent_id: agent.id })
                  .eq('id', callId);
                
                await supabase
                  .from('power_dialer_agents')
                  .update({
                    status: 'busy',
                    current_call_id: callId,
                    last_status_change: new Date().toISOString()
                  })
                  .eq('id', agent.id);
              } else {
                // No agent available, add the call to the queue
                await supabase
                  .from('power_dialer_call_queue')
                  .insert([{
                    call_id: callId,
                    priority: 1,
                    created_timestamp: new Date().toISOString()
                  }]);
              }
            } else if (AnsweredBy.toLowerCase() === 'machine') {
              // Update contact status to voicemail
              await supabase
                .from('power_dialer_contacts')
                .update({
                  status: 'voicemail',
                  last_call_timestamp: new Date().toISOString()
                })
                .eq('id', callRecord.contact_id);
              
              // Create TwiML to leave a voicemail
              const twiml = new twilio.twiml.VoiceResponse();
              twiml.say('This is an automated message. We will try to reach you at a later time. Thank you.');
              twiml.hangup();
              
              return new Response(twiml.toString(), {
                headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
              });
            }
          }
          break;
      }
      
      // Return empty TwiML for status callbacks
      const twiml = new twilio.twiml.VoiceResponse();
      return new Response(twiml.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
    
    // Default handler for regular TwiML generation
    console.log("Generating TwiML for call handling");
    
    // Fetch the call record
    const { data: callRecord, error: callFetchError } = await supabase
      .from('power_dialer_calls')
      .select('*, contact:contact_id(*)')
      .eq('id', callId)
      .single();
    
    if (callFetchError) {
      console.error("Error fetching call record:", callFetchError);
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, there was an error with this call. Goodbye.');
      twiml.hangup();
      
      return new Response(twiml.toString(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
    
    // Get answering machine detection result
    const { AnsweredBy } = requestData;
    if (AnsweredBy) {
      await supabase
        .from('power_dialer_calls')
        .update({ machine_detection_result: AnsweredBy.toLowerCase() })
        .eq('id', callId);
      
      if (AnsweredBy.toLowerCase() === 'machine') {
        // Update contact status to voicemail
        await supabase
          .from('power_dialer_contacts')
          .update({
            status: 'voicemail',
            last_call_timestamp: new Date().toISOString()
          })
          .eq('id', callRecord.contact_id);
        
        // Create TwiML to leave a voicemail
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('This is an automated message. We will try to reach you at a later time. Thank you.');
        twiml.hangup();
        
        return new Response(twiml.toString(), {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
        });
      }
    }
    
    // Find an available agent
    const { data: availableAgents } = await supabase
      .from('power_dialer_agents')
      .select('*')
      .eq('status', 'available')
      .order('last_status_change', { ascending: true })
      .limit(1);
    
    // Generate TwiML based on agent availability
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (availableAgents && availableAgents.length > 0) {
      // Assign the call to the available agent
      const agent = availableAgents[0];
      
      await supabase
        .from('power_dialer_calls')
        .update({ agent_id: agent.id })
        .eq('id', callId);
      
      await supabase
        .from('power_dialer_agents')
        .update({
          status: 'busy',
          current_call_id: callId,
          last_status_change: new Date().toISOString()
        })
        .eq('id', agent.id);
      
      // Build TwiML to connect call to agent
      twiml.say('Thank you for answering. Please wait while we connect you to an agent.');
      
      // Use Twilio client API to set up conference bridge
      const host = req.headers.get('host') || '';
      const protocol = req.headers.get('x-forwarded-proto') || 'https';
      const baseUrl = `${protocol}://${host}`;
      
      // Implement conference bridge here
      const conferenceName = `call_${callId}_${Date.now()}`;
      const dial = twiml.dial();
      dial.conference({
        statusCallback: `${baseUrl}/functions/v1/power-dialer-webhook?callId=${callId}&action=conference`,
        statusCallbackEvent: ['join', 'leave'],
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
        waitUrl: DEFAULT_HOLD_MUSIC,
      }, conferenceName);
      
      // Initialize Twilio client
      const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      
      // Make a call to the agent's browser client
      try {
        // Get user ID associated with the agent
        const { data: agentUser } = await supabase
          .from('power_dialer_agents')
          .select('user_id')
          .eq('id', agent.id)
          .single();
        
        if (agentUser) {
          const clientName = `browser-${agentUser.user_id}`;
          
          // Call the agent's browser client
          await twilioClient.calls.create({
            to: `client:${clientName}`,
            from: "+15017122661", // This should be your Twilio phone number
            url: `${baseUrl}/functions/v1/power-dialer-agent-connect?callId=${callId}&conferenceName=${conferenceName}`,
          });
        }
      } catch (error) {
        console.error("Error calling agent:", error);
      }
    } else {
      // No agent available, add to queue and play hold music
      console.log("No agent available, adding call to queue");
      
      await supabase
        .from('power_dialer_call_queue')
        .insert([{
          call_id: callId,
          priority: 1,
          created_timestamp: new Date().toISOString()
        }]);
      
      twiml.say('Thank you for answering. All of our agents are currently busy. Please hold for the next available agent.');
      twiml.play({ loop: 0 }, DEFAULT_HOLD_MUSIC);
    }
    
    return new Response(twiml.toString(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });
    
  } catch (error) {
    console.error("Error in power-dialer-webhook function:", error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, there was an error with this call. Goodbye.');
    twiml.hangup();
    
    return new Response(twiml.toString(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });
  }
});
