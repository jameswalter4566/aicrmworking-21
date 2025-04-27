
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { leadId, callData } = requestBody;

    console.log(`Lead connected function called for leadId: ${leadId}`);
    console.log('Call data:', callData);
    
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // If we have a leadId, fetch it from the leads table
    if (leadId) {
      let leadData = null;
      
      // Try to match UUID format leads (session leads)
      try {
        const { data: sessionLead, error: sessionLeadError } = await supabase
          .from('dialing_session_leads')
          .select('*, original_lead_id')
          .eq('lead_id', leadId)
          .maybeSingle();
        
        if (sessionLead && !sessionLeadError) {
          console.log('Found session lead:', sessionLead);
          
          if (sessionLead.original_lead_id) {
            // Get the original lead data
            const { data: originalLead, error: originalLeadError } = await supabase
              .from('leads')
              .select('*')
              .eq('id', sessionLead.original_lead_id)
              .maybeSingle();
              
            if (originalLead && !originalLeadError) {
              leadData = originalLead;
              console.log('Found original lead data:', originalLead);
            }
          }
        }
      } catch (sessionError) {
        console.error('Error fetching session lead:', sessionError);
      }
      
      // If no session lead found, try direct lead lookup
      if (!leadData) {
        try {
          // Try to parse as number if it's a numeric string
          const numericId = /^\d+$/.test(leadId) ? parseInt(leadId, 10) : null;
          
          if (numericId !== null) {
            const { data: lead, error: leadError } = await supabase
              .from('leads')
              .select('*')
              .eq('id', numericId)
              .maybeSingle();
            
            if (lead && !leadError) {
              leadData = lead;
              console.log('Found direct lead data:', lead);
            }
          }
        } catch (directError) {
          console.error('Error fetching direct lead:', directError);
        }
      }
      
      // If we found lead data, return it
      if (leadData) {
        // Log activity if we have call data
        if (callData?.callSid && leadData.id) {
          await logLeadActivity(supabase, leadData.id, callData);
        }
        
        return new Response(JSON.stringify({ 
          success: true,
          lead: leadData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
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
async function logLeadActivity(supabase, leadId, callData) {
  if (!callData || !callData.status) return;
  
  try {
    const activityType = callData.status === 'in-progress' ? 'call_connected' : 
                       callData.status === 'completed' ? 'call_ended' : 'call_status_change';
    
    const description = callData.status === 'in-progress' ? 'Call connected' : 
                      callData.status === 'completed' ? 'Call ended' : 
                      `Call status changed to ${callData.status}`;
    
    await supabase
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
