
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a client with the Authorization header from the request
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader || '' },
      },
    });

    const requestBody = await req.json();
    const { leadId, callData } = requestBody;

    console.log(`Lead connected function called for leadId: ${leadId}`);
    console.log('Call data:', callData);
    
    // If we have a leadId, fetch it from the database directly instead of using retrieve-leads
    if (leadId) {
      let user = null;
      
      // Try to get the authenticated user if we have an auth header
      if (authHeader) {
        const { data } = await supabaseClient.auth.getUser();
        user = data.user;
      }
      
      // Fetch the lead directly from the database instead of calling retrieve-leads
      const { data: lead, error } = await supabaseClient
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      if (error) {
        console.error('Error retrieving lead:', error);
        throw error;
      }

      if (lead) {
        // Log activity if we have call data
        if (callData?.callSid) {
          await logLeadActivity(supabaseClient, lead.id, callData);
        }

        console.log(`Retrieved lead directly from database: ${lead.first_name} ${lead.last_name}`);
        
        return new Response(JSON.stringify({ 
          success: true,
          lead: lead
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } else {
        console.log(`No lead found with ID: ${leadId}`);
      }
    }
    
    // Fallback response with empty data
    return new Response(JSON.stringify({ 
      success: true,
      lead: {
        id: leadId || 'unknown',
        first_name: "Unknown",
        last_name: "Contact",
        phone1: callData?.phoneNumber || "",
        email: "no-email@example.com",
        property_address: "No property address on file",
        mailing_address: "No mailing address on file"
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in lead-connected function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      lead: {
        first_name: "Error",
        last_name: "Loading Lead",
        phone1: "---",
        email: "---",
        property_address: "---",
        mailing_address: "---"
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});

// Helper function to log lead activity based on call data
async function logLeadActivity(supabaseClient, leadId, callData) {
  if (!callData || !callData.status) return;
  
  try {
    const activityType = callData.status === 'in-progress' ? 'call_connected' : 
                       callData.status === 'completed' ? 'call_ended' : 'call_status_change';
    
    const description = callData.status === 'in-progress' ? 'Call connected' : 
                      callData.status === 'completed' ? 'Call ended' : 
                      `Call status changed to ${callData.status}`;
    
    await supabaseClient
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        type: activityType,
        description: description,
        timestamp: callData.timestamp || new Date().toISOString()
      });
      
    console.log(`Successfully logged lead activity: ${activityType}`);
  } catch (err) {
    console.error('Error creating lead activity:', err);
  }
}
