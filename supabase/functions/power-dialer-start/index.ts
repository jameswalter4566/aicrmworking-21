
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
    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { agentId, maxConcurrentCalls = 3 } = await req.json();

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: 'Agent ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Starting power dialer for agent ${agentId} with ${maxConcurrentCalls} concurrent calls`);

    // Update agent status to available
    const { data: agentData, error: agentError } = await supabase
      .from('power_dialer_agents')
      .update({ status: 'available', last_status_change: new Date().toISOString() })
      .eq('id', agentId)
      .select()
      .single();

    if (agentError) {
      console.error("Error updating agent:", agentError);
      return new Response(
        JSON.stringify({ error: 'Failed to update agent status', details: agentError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log("Agent updated:", agentData);

    // Get contacts to call
    const { data: contacts, error: contactsError } = await supabase
      .from('power_dialer_contacts')
      .select()
      .eq('status', 'not_contacted')
      .limit(maxConcurrentCalls);

    if (contactsError) {
      console.error("Error fetching contacts:", contactsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch contacts', details: contactsError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No contacts available to call' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${contacts.length} contacts to call`);

    // Initialize Twilio
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
    const twilioNumber = Deno.env.get("TWILIO_PHONE_NUMBER") || "";

    if (!twilioAccountSid || !twilioAuthToken || !twilioNumber) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const baseUrl = req.headers.get("origin") || "https://imrmboyczebjlbnkgjns.supabase.co";
    const results = [];

    // Place calls for each contact
    for (const contact of contacts) {
      try {
        console.log(`Initiating call for contact ${contact.id} - ${contact.name}`);

        // Create call record in database
        const { data: callRecord, error: callError } = await supabase
          .from('power_dialer_calls')
          .insert({
            contact_id: contact.id,
            status: 'in_progress',
            start_timestamp: new Date().toISOString()
          })
          .select()
          .single();

        if (callError) {
          console.error("Error creating call record:", callError);
          results.push({
            contact: contact.id,
            success: false,
            error: 'Failed to create call record'
          });
          continue;
        }

        console.log("Created call record:", callRecord);

        // Update contact status
        await supabase
          .from('power_dialer_contacts')
          .update({ status: 'in_progress', last_call_timestamp: new Date().toISOString() })
          .eq('id', contact.id);

        // Make Twilio API call
        const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
        
        // Webhook URLs
        const statusCallbackUrl = `${baseUrl}/functions/v1/power-dialer-webhook`;
        const machineDetectionUrl = `${baseUrl}/functions/v1/power-dialer-machine-detection`;
        
        const twilioResponse = await fetch(twilioEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`
          },
          body: new URLSearchParams({
            To: contact.phone_number,
            From: twilioNumber,
            Url: machineDetectionUrl,
            StatusCallback: statusCallbackUrl,
            StatusCallbackEvent: 'initiated ringing answered completed',
            StatusCallbackMethod: 'POST',
            MachineDetection: 'Enable',
            MachineDetectionTimeout: '30',
            AsyncAmd: 'true',
            AsyncAmdStatusCallback: machineDetectionUrl,
            AsyncAmdStatusCallbackMethod: 'POST',
            Record: 'false'
          }).toString()
        });

        if (!twilioResponse.ok) {
          const errorText = await twilioResponse.text();
          console.error(`Error from Twilio: ${twilioResponse.status}`, errorText);
          
          // Update call record to failed
          await supabase
            .from('power_dialer_calls')
            .update({ status: 'failed' })
            .eq('id', callRecord.id);
            
          // Update contact status back to not_contacted
          await supabase
            .from('power_dialer_contacts')
            .update({ status: 'not_contacted' })
            .eq('id', contact.id);
            
          results.push({
            contact: contact.id,
            success: false,
            error: `Twilio API error: ${twilioResponse.status}`
          });
          continue;
        }

        const twilioData = await twilioResponse.json();
        console.log("Twilio call initiated:", twilioData);

        // Update call record with Twilio SID
        await supabase
          .from('power_dialer_calls')
          .update({ twilio_call_sid: twilioData.sid })
          .eq('id', callRecord.id);

        results.push({
          contact: contact.id,
          success: true,
          callId: callRecord.id,
          callSid: twilioData.sid
        });
      } catch (error) {
        console.error(`Error initiating call for contact ${contact.id}:`, error);
        results.push({
          contact: contact.id,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: results.some(r => r.success),
        results,
        agentId: agentId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error in power-dialer-start:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
