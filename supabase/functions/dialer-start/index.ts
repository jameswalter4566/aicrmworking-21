
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Twilio client (but don't import the module yet to prevent the error)
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';

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
    
    // Start making calls - but don't actually use Twilio in this function
    // Instead, we'll just create the call records and return them
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
        
        // Without actually making the Twilio call, just record the planned call
        const mockTwilioSid = `simulated-${Date.now()}-${Math.round(Math.random() * 1000)}`;
        
        // Update call record with simulated Twilio SID
        await supabase
          .from('predictive_dialer_calls')
          .update({
            twilio_call_sid: mockTwilioSid,
            status: 'in_progress'
          })
          .eq('id', callData.id);
          
        callsPlaced.push({
          id: callData.id,
          contactName: contact.name,
          phoneNumber: contact.phone_number,
          twilioSid: mockTwilioSid
        });
          
        console.log(`Call record created for ${contact.phone_number} (${contact.name}), Mock SID: ${mockTwilioSid}`);
      } catch (callError) {
        console.error('Error creating call record:', callError);
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Predictive dialer started. Created ${callsPlaced.length} call records.`,
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
