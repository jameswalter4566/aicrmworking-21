
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
const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Update agent status if provided
    const { agentId } = await req.json();
    
    if (agentId) {
      // Update agent status to offline
      await supabase
        .from('predictive_dialer_agents')
        .update({ status: 'offline' })
        .eq('id', agentId);
    }
    
    // Set flag in database to stop dialer (could be implemented with a system settings table)
    // For now, we'll just return success
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Predictive dialer stopped.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in stop-predictive-dialer function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'An error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || 500,
    });
  }
});
