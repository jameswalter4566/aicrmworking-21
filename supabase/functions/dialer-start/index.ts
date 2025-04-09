
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import twilio from 'https://esm.sh/twilio@4.18.1';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Twilio client
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { agentId, maxConcurrentCalls } = await req.json();
    
    if (!agentId) {
      throw new Error('Agent ID is required');
    }
    
    // Get the agent
    const { data: agent, error: agentError } = await supabase
      .from('predictive_dialer_agents')
      .select('*')
      .eq('id', agentId)
      .single();
      
    if (agentError || !agent) {
      throw new Error('Agent not found: ' + agentError?.message);
    }
    
    // Update agent status to available if not already
    if (agent.status !== 'available') {
      await supabase
        .from('predictive_dialer_agents')
        .update({ status: 'available' })
        .eq('id', agentId);
    }
    
    // Get available agents count for capacity calculation
    const { data: availableAgents, error: availableAgentsError } = await supabase
      .from('predictive_dialer_agents')
      .select('id')
      .eq('status', 'available');
      
    if (availableAgentsError) {
      throw new Error('Failed to get available agents: ' + availableAgentsError.message);
    }
    
    const availableAgentsCount = availableAgents?.length || 0;
    if (availableAgentsCount === 0) {
      throw new Error('No available agents to handle calls');
    }
    
    // Get contacts to call (not contacted or last contacted more than a day ago)
    const { data: contacts, error: contactsError } = await supabase
      .from('predictive_dialer_contacts')
      .select('*')
      .or(`status.eq.not_contacted,status.eq.no_answer`);
      
    if (contactsError) {
      throw new Error('Failed to get contacts: ' + contactsError.message);
    }
    
    if (!contacts || contacts.length === 0) {
      throw new Error('No contacts available to call');
    }
    
    // Calculate how many calls to make
    const targetCalls = availableAgentsCount * (maxConcurrentCalls || 3);
    
    // Get current active calls
    const { data: activeCalls, error: activeCallsError } = await supabase
      .from('predictive_dialer_calls')
      .select('*')
      .eq('status', 'in_progress');
      
    if (activeCallsError) {
      throw new Error('Failed to get active calls: ' + activeCallsError.message);
    }
    
    const activeCallsCount = activeCalls?.length || 0;
    const callsToMake = Math.max(0, targetCalls - activeCallsCount);
    
    if (callsToMake <= 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Dialer is already at capacity',
        activeCallsCount,
        targetCalls
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    // Select contacts to call (up to callsToMake)
    const contactsToCall = contacts.slice(0, callsToMake);
    const callsPlaced = [];
    
    // Start making calls
    for (const contact of contactsToCall) {
      try {
        // Create a call record
        const { data: callData, error: callError } = await supabase
          .from('predictive_dialer_calls')
          .insert({
            contact_id: contact.id,
            status: 'queued',
            start_timestamp: new Date().toISOString()
          })
          .select()
          .single();
          
        if (callError || !callData) {
          console.error('Failed to create call record:', callError?.message);
          continue;
        }
        
        // Update contact status
        await supabase
          .from('predictive_dialer_contacts')
          .update({
            status: 'in_progress',
            last_call_timestamp: new Date().toISOString()
          })
          .eq('id', contact.id);
        
        // Define webhook URLs for Twilio
        const statusCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/dialer-webhook?callId=${callData.id}`;
        const machineDetectionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/dialer-machine-detection?callId=${callData.id}`;
        
        // Place the call using Twilio
        const twilioCall = await twilioClient.calls.create({
          to: contact.phone_number,
          from: twilioPhoneNumber,
          machineDetection: 'DetectMessageEnd',
          machineDetectionTimeout: 30,
          statusCallback: statusCallbackUrl,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST',
          url: machineDetectionUrl,
        });
        
        // Update call record with Twilio SID
        await supabase
          .from('predictive_dialer_calls')
          .update({
            twilio_call_sid: twilioCall.sid,
            status: 'in_progress'
          })
          .eq('id', callData.id);
          
        callsPlaced.push({
          id: callData.id,
          contactName: contact.name,
          phoneNumber: contact.phone_number,
          twilioSid: twilioCall.sid
        });
          
        console.log(`Call initiated to ${contact.phone_number} (${contact.name}), Twilio SID: ${twilioCall.sid}`);
      } catch (callError) {
        console.error('Error making call:', callError);
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Predictive dialer started. Making ${callsPlaced.length} calls.`,
      callsPlaced
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in dialer-start function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'An error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || 500,
    });
  }
});
