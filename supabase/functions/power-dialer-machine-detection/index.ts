
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse data from Twilio webhook
    const formData = await req.formData();
    const callSid = formData.get('CallSid')?.toString();
    const answeredBy = formData.get('AnsweredBy')?.toString() || formData.get('MachineDetectionResult')?.toString();

    console.log(`Received machine detection for call ${callSid}: ${answeredBy}`);

    if (!callSid) {
      return new Response(
        JSON.stringify({ error: 'Missing CallSid in webhook data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Find the call record using the Twilio Call SID
    const { data: callRecord, error: callError } = await supabase
      .from('power_dialer_calls')
      .select('*')
      .eq('twilio_call_sid', callSid)
      .single();

    if (callError || !callRecord) {
      console.error("Error finding call record:", callError);
      return new Response(
        JSON.stringify({ error: 'Call record not found', details: callError }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log("Found call record:", callRecord);

    // Update call record with machine detection result
    await supabase
      .from('power_dialer_calls')
      .update({
        machine_detection_result: answeredBy || 'unknown'
      })
      .eq('id', callRecord.id);

    let twiml;

    // Handle different answering scenarios
    if (answeredBy === 'human') {
      console.log("Call answered by human, checking for available agent");
      
      // Check for available agent
      const { data: availableAgent, error: agentError } = await supabase
        .from('power_dialer_agents')
        .select('*')
        .eq('status', 'available')
        .order('last_status_change', { ascending: true })
        .limit(1)
        .single();

      if (availableAgent && !agentError) {
        console.log("Found available agent:", availableAgent);
        
        // Update agent status
        await supabase
          .from('power_dialer_agents')
          .update({
            status: 'busy',
            current_call_id: callRecord.id,
            last_status_change: new Date().toISOString()
          })
          .eq('id', availableAgent.id);
        
        // Update call with agent
        await supabase
          .from('power_dialer_calls')
          .update({
            agent_id: availableAgent.id
          })
          .eq('id', callRecord.id);

        // Update contact status
        if (callRecord.contact_id) {
          await supabase
            .from('power_dialer_contacts')
            .update({
              status: 'contacted'
            })
            .eq('id', callRecord.contact_id);
        }

        // TwiML to bridge to agent (would connect to a browser client)
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Please wait while we connect you to an available agent.</Say>
          <Dial timeout="30">
            <Client>agent-${availableAgent.id}</Client>
          </Dial>
        </Response>`;
      } else {
        console.log("No available agent, adding call to queue");
        
        // Add call to queue
        await supabase
          .from('power_dialer_call_queue')
          .insert({
            call_id: callRecord.id,
            priority: 1,
            created_timestamp: new Date().toISOString()
          });

        // TwiML to play hold music
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Please hold for the next available agent. Your call is important to us.</Say>
          <Play loop="10">https://api.twilio.com/cowbell.mp3</Play>
          <Say>We're sorry, all our agents are currently busy. Please try your call again later.</Say>
          <Hangup/>
        </Response>`;
      }
    } else if (answeredBy === 'machine') {
      console.log("Call answered by machine, leaving voicemail");
      
      // Update contact status to voicemail
      if (callRecord.contact_id) {
        await supabase
          .from('power_dialer_contacts')
          .update({
            status: 'voicemail'
          })
          .eq('id', callRecord.contact_id);
      }

      // TwiML to leave a voicemail
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Pause length="2"/>
        <Say>Hello, this is an important message. Please call us back at your earliest convenience. Thank you!</Say>
        <Hangup/>
      </Response>`;
    } else {
      // Default TwiML if machine detection is uncertain
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Hello, this is an automated call. Please call us back at your earliest convenience. Thank you!</Say>
        <Hangup/>
      </Response>`;
    }

    // Return TwiML to Twilio
    return new Response(twiml, {
      status: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  } catch (error) {
    console.error("Error in power-dialer-machine-detection:", error);
    
    // Return basic TwiML in case of error to avoid call failure
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say>We're sorry, an error occurred. Please try your call again later.</Say>
      <Hangup/>
    </Response>`;
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  }
});
