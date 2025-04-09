
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

console.log("Power Dialer Start function loaded");

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
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Initialize Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Validate required credentials
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Missing required Twilio credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Missing required Twilio credentials" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { agentId, maxConcurrentCalls = 3 } = await req.json();
    
    if (!agentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Agent ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting dialer for agent ${agentId} with max ${maxConcurrentCalls} concurrent calls`);

    // Verify the agent exists and update status
    const { data: agent, error: agentError } = await supabase
      .from('power_dialer_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error(`Agent not found: ${agentId}`, agentError);
      return new Response(
        JSON.stringify({ success: false, error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update agent status to available
    await supabase
      .from('power_dialer_agents')
      .update({
        status: 'available',
        last_status_change: new Date().toISOString()
      })
      .eq('id', agentId);

    // Get contacts that haven't been contacted yet
    const { data: contacts, error: contactsError } = await supabase
      .from('power_dialer_contacts')
      .select('*')
      .eq('status', 'not_contacted')
      .limit(maxConcurrentCalls);

    if (contactsError) {
      console.error("Error fetching contacts:", contactsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch contacts" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contacts || contacts.length === 0) {
      console.warn("No contacts available for dialing");
      return new Response(
        JSON.stringify({ success: false, error: "No contacts available for dialing" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Twilio client
    const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Host for callbacks
    const host = req.headers.get('host') || '';
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;
    
    // Place calls for each contact
    const callResults = [];
    
    for (const contact of contacts) {
      try {
        console.log(`Placing call to ${contact.phone_number}`);
        
        // Create a call record in the database
        const { data: callRecord, error: callRecordError } = await supabase
          .from('power_dialer_calls')
          .insert([{
            contact_id: contact.id,
            status: 'in_progress',
            start_timestamp: new Date().toISOString()
          }])
          .select()
          .single();

        if (callRecordError) {
          console.error("Error creating call record:", callRecordError);
          continue;
        }

        // Update the contact status to in_progress
        await supabase
          .from('power_dialer_contacts')
          .update({
            status: 'in_progress',
            last_call_timestamp: new Date().toISOString()
          })
          .eq('id', contact.id);

        // Place the call with Twilio
        const call = await twilioClient.calls.create({
          to: contact.phone_number,
          from: TWILIO_PHONE_NUMBER,
          machineDetection: 'DetectMessageEnd',
          machineDetectionTimeout: 30,
          url: `${baseUrl}/functions/v1/power-dialer-webhook?callId=${callRecord.id}`,
          statusCallback: `${baseUrl}/functions/v1/power-dialer-webhook?callId=${callRecord.id}&action=status`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST',
        });

        // Update the call record with the Twilio call SID
        await supabase
          .from('power_dialer_calls')
          .update({ twilio_call_sid: call.sid })
          .eq('id', callRecord.id);

        callResults.push({
          contactId: contact.id,
          callId: callRecord.id,
          twilioCallSid: call.sid,
          status: 'initiated'
        });

        console.log(`Call placed successfully to ${contact.phone_number}, SID: ${call.sid}`);
      } catch (error) {
        console.error(`Error placing call to ${contact.phone_number}:`, error);
        
        // Update contact and call status on error
        await supabase
          .from('power_dialer_contacts')
          .update({ status: 'not_contacted' })
          .eq('id', contact.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Started dialer with ${callResults.length} calls`,
        calls: callResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in power-dialer-start function:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
