
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Create a Supabase client with the service role key for admin access
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

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
    
    // Get the numeric ID from callData if available, otherwise try to use the leadId
    let effectiveLeadId = null;
    
    // First try to get originalLeadId from callData
    if (callData?.originalLeadId) {
      effectiveLeadId = callData.originalLeadId;
      console.log(`Using originalLeadId from callData: ${effectiveLeadId}`);
    } 
    // If originalLeadId is in notes (some legacy data structure), try to parse it
    else if (callData?.notes) {
      try {
        const notesData = JSON.parse(callData.notes);
        if (notesData.originalLeadId) {
          effectiveLeadId = notesData.originalLeadId;
          console.log(`Using originalLeadId from notes: ${effectiveLeadId}`);
        }
      } catch (e) {
        console.warn('Could not parse notes JSON:', e);
      }
    }
    
    if (!effectiveLeadId) {
      console.log('No numeric leadId found, attempting to use provided leadId:', leadId);
      effectiveLeadId = leadId;
    }

    if (effectiveLeadId) {
      try {
        // Convert to number if it's a numeric string to ensure proper type handling
        let numericLeadId = effectiveLeadId;
        if (/^\d+$/.test(String(effectiveLeadId))) {
          numericLeadId = parseInt(String(effectiveLeadId), 10);
          console.log(`Converted lead ID to numeric format: ${numericLeadId}`);
        }
        
        // SIMPLIFICATION: Use a direct database query with the admin client
        console.log(`Attempting direct database query for lead with ID: ${numericLeadId}`);
        
        const { data: directLead, error: directError } = await adminSupabase
          .from('leads')
          .select('*')
          .eq('id', numericLeadId)
          .single();
          
        if (directLead && !directError) {
          console.log(`Successfully found lead directly in database: ${directLead.id}`);
          
          // Log activity if we have call data
          if (callData?.callSid || callData?.status) {
            await logLeadActivity(directLead.id, callData);
          }
          
          return new Response(JSON.stringify({ 
            success: true,
            lead: directLead
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          console.log(`Direct database query failed: ${directError?.message || 'No lead found'}`);
          console.log('Attempting to search by string ID as fallback');
          
          // Try searching by string ID
          const { data: stringSearchLead, error: stringSearchError } = await adminSupabase
            .from('leads')
            .select('*')
            .eq('id', String(effectiveLeadId))
            .single();
            
          if (stringSearchLead && !stringSearchError) {
            console.log(`Found lead using string ID: ${stringSearchLead.id}`);
            
            // Log activity if we have call data
            if (callData?.callSid || callData?.status) {
              await logLeadActivity(stringSearchLead.id, callData);
            }
            
            return new Response(JSON.stringify({ 
              success: true,
              lead: stringSearchLead
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          } else {
            console.log(`String ID search also failed: ${stringSearchError?.message || 'No lead found'}`);
          }
        }
      } catch (error) {
        console.error('Error in direct database query:', error);
      }
    }
    
    // Fallback response with empty data
    return new Response(JSON.stringify({ 
      success: true,
      lead: {
        id: effectiveLeadId || 'unknown',
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
async function logLeadActivity(leadId: number | string, callData?: any) {
  if (!callData) return;
  
  try {
    const activityType = callData.status === 'in-progress' ? 'call_connected' : 
                       callData.status === 'completed' ? 'call_ended' : 'call_status_change';
    
    const description = callData.status === 'in-progress' ? 'Call connected' : 
                      callData.status === 'completed' ? 'Call ended' : 
                      `Call status changed to ${callData.status}`;
    
    await adminSupabase
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
