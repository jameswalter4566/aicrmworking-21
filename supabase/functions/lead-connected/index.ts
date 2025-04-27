
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
    
    let effectiveLeadId = null;
    
    if (callData?.originalLeadId) {
      effectiveLeadId = callData.originalLeadId;
      console.log(`Using originalLeadId from callData: ${effectiveLeadId}`);
    } 
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
      effectiveLeadId = leadId;
      console.log(`No numeric leadId found, using provided leadId: ${leadId}`);
    }

    if (effectiveLeadId) {
      try {
        let numericLeadId = effectiveLeadId;
        if (/^\d+$/.test(String(effectiveLeadId))) {
          numericLeadId = parseInt(String(effectiveLeadId), 10);
          console.log(`Converted lead ID to numeric format: ${numericLeadId}`);
        }
        
        // Direct database query with all required fields
        const { data: directLead, error: directError } = await adminSupabase
          .from('leads')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone1,
            phone2,
            property_address,
            mailing_address,
            disposition,
            tags,
            created_at,
            updated_at
          `)
          .eq('id', numericLeadId)
          .single();
          
        if (directLead && !directError) {
          console.log(`Successfully found lead directly in database: ${directLead.id}`);
          
          // Log activity if we have call data
          if (callData?.callSid || callData?.status) {
            await logLeadActivity(directLead.id, callData);
          }
          
          // Return formatted lead data
          return new Response(JSON.stringify({ 
            success: true,
            lead: {
              id: directLead.id,
              first_name: directLead.first_name || "Unknown",
              last_name: directLead.last_name || "Contact",
              phone1: directLead.phone1 || callData?.phoneNumber || "---",
              phone2: directLead.phone2 || "---",
              email: directLead.email || "---",
              property_address: directLead.property_address || "---",
              mailing_address: directLead.mailing_address || "---",
              disposition: directLead.disposition || "Not Contacted",
              tags: directLead.tags || [],
              created_at: directLead.created_at,
              updated_at: directLead.updated_at
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          console.log(`Direct database query failed: ${directError?.message || 'No lead found'}`);
          return fallbackResponse(effectiveLeadId, callData);
        }
      } catch (error) {
        console.error('Error in direct database query:', error);
        return fallbackResponse(effectiveLeadId, callData);
      }
    }
    
    return fallbackResponse(effectiveLeadId, callData);

  } catch (error) {
    console.error('Error in lead-connected function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      lead: createFallbackLead("Error", "Loading Lead")
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});

function createFallbackLead(firstName: string, lastName: string, phoneNumber?: string) {
  return {
    first_name: firstName,
    last_name: lastName,
    phone1: phoneNumber || "---",
    phone2: "---",
    email: "---",
    property_address: "---",
    mailing_address: "---",
    disposition: "Not Contacted",
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function fallbackResponse(leadId: string | number, callData?: any) {
  return new Response(JSON.stringify({ 
    success: true,
    lead: createFallbackLead(
      "Unknown",
      "Contact",
      callData?.phoneNumber
    )
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

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

