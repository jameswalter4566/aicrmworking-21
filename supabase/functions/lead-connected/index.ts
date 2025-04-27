
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client with admin privileges for direct database access
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestBody = await req.json();
    const { leadId, callData } = requestBody;
    
    console.log(`🔍 Lead connected function called with leadId: ${leadId}`);
    console.log('📞 Call data:', callData);
    
    // Extract the effective lead ID - prioritize numeric IDs from various sources
    let effectiveLeadId = null;
    
    // Check for originalLeadId in callData
    if (callData?.originalLeadId) {
      effectiveLeadId = callData.originalLeadId;
      console.log(`📌 Using originalLeadId from callData: ${effectiveLeadId}`);
    } 
    // Try to parse notes JSON if present
    else if (callData?.notes) {
      try {
        const notesData = JSON.parse(callData.notes);
        if (notesData.originalLeadId) {
          effectiveLeadId = notesData.originalLeadId;
          console.log(`📌 Using originalLeadId from notes: ${effectiveLeadId}`);
        }
      } catch (e) {
        console.warn('⚠️ Could not parse notes JSON:', e);
      }
    }
    
    // Fallback to provided leadId if no other ID found
    if (!effectiveLeadId) {
      effectiveLeadId = leadId;
      console.log(`📌 Using provided leadId: ${leadId}`);
    }

    if (effectiveLeadId) {
      console.log(`🔎 Searching for lead with ID: ${effectiveLeadId}`);
      
      // Make sure we have a numeric ID if possible
      let numericLeadId = effectiveLeadId;
      if (typeof effectiveLeadId === 'string' && /^\d+$/.test(effectiveLeadId)) {
        numericLeadId = parseInt(effectiveLeadId, 10);
        console.log(`🔢 Converted lead ID to numeric format: ${numericLeadId}`);
      }
      
      // Direct database query with explicit columns
      const { data: lead, error } = await adminSupabase
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
      
      if (error) {
        console.error(`❌ Database query error: ${error.message}`);
        return createFallbackResponse(leadId, callData);
      }
      
      if (lead) {
        console.log(`✅ Successfully found lead: ${lead.id}`);
        
        // Log call activity if we have call data
        if (callData?.callSid || callData?.status) {
          try {
            await logLeadActivity(lead.id, callData);
            console.log(`📝 Logged call activity for lead: ${lead.id}`);
          } catch (activityError) {
            console.error(`⚠️ Failed to log activity: ${activityError.message}`);
          }
        }
        
        // Return formatted lead data that matches UI expectations
        return new Response(JSON.stringify({ 
          success: true,
          lead: {
            id: lead.id,
            first_name: lead.first_name || "Unknown",
            last_name: lead.last_name || "Contact",
            phone1: lead.phone1 || callData?.phoneNumber || "---",
            phone2: lead.phone2 || "---",
            email: lead.email || "---",
            property_address: lead.property_address || "---",
            mailing_address: lead.mailing_address || "---",
            disposition: lead.disposition || "Not Contacted",
            tags: lead.tags || [],
            created_at: lead.created_at,
            updated_at: lead.updated_at
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } else {
        console.log(`❓ No lead found with ID: ${numericLeadId}`);
        return createFallbackResponse(leadId, callData);
      }
    } else {
      console.log('⚠️ No valid lead ID provided');
      return createFallbackResponse(leadId, callData);
    }
  } catch (error) {
    console.error('❌ Error in lead-connected function:', error);
    return createFallbackResponse(null, null, error.message);
  }
});

// Create consistent response for when lead data is unavailable
function createFallbackResponse(leadId, callData, errorMessage = null) {
  const phoneNumber = callData?.phoneNumber || "---";
  
  console.log(`📄 Creating fallback response${errorMessage ? ' due to error' : ''}`);
  
  return new Response(JSON.stringify({ 
    success: errorMessage ? false : true,
    error: errorMessage,
    lead: {
      id: leadId || null,
      first_name: "Unknown",
      last_name: "Contact",
      phone1: phoneNumber,
      phone2: "---",
      email: "---",
      property_address: "---",
      mailing_address: "---",
      disposition: "Not Contacted",
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

// Log call activity in database
async function logLeadActivity(leadId, callData) {
  if (!callData) return;
  
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
}
