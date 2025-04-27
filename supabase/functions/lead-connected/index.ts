
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Lead connected function called');
    const requestBody = await req.json();
    const { leadId, callData } = requestBody;
    
    console.log('📌 Request body:', JSON.stringify(requestBody, null, 2));

    // Get effective lead ID
    let effectiveLeadId = null;
    
    if (callData?.originalLeadId) {
      effectiveLeadId = callData.originalLeadId;
      console.log('📌 Using originalLeadId from callData:', effectiveLeadId);
    } 
    else if (callData?.notes) {
      try {
        const notesData = JSON.parse(callData.notes);
        if (notesData.originalLeadId) {
          effectiveLeadId = notesData.originalLeadId;
          console.log('📌 Using originalLeadId from notes:', effectiveLeadId);
        }
      } catch (e) {
        console.warn('⚠️ Could not parse notes JSON:', e);
      }
    }
    
    if (!effectiveLeadId) {
      effectiveLeadId = leadId;
      console.log('📌 Using provided leadId:', leadId);
    }

    if (!effectiveLeadId) {
      console.log('❌ No lead ID provided');
      return createFallbackResponse();
    }

    // Convert string ID to number if possible
    let numericLeadId = effectiveLeadId;
    if (typeof effectiveLeadId === 'string' && /^\d+$/.test(effectiveLeadId)) {
      numericLeadId = parseInt(effectiveLeadId, 10);
      console.log('🔢 Converted lead ID to numeric:', numericLeadId);
    }

    console.log(`⏳ Attempting to find lead with ID: ${numericLeadId}`);

    // Try to find the lead directly in the database with all fields
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
        updated_at,
        created_by,
        is_mortgage_lead,
        mortgage_data,
        avatar
      `)
      .eq('id', numericLeadId)
      .single();

    if (error) {
      console.error('❌ Database error:', error.message);
      
      // Try searching by UUID if numeric ID failed
      if (typeof leadId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
        console.log('🔄 Trying to find lead by UUID instead');
        
        const { data: uuidLead, error: uuidError } = await adminSupabase
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
            updated_at,
            created_by,
            is_mortgage_lead,
            mortgage_data,
            avatar
          `)
          .eq('session_uuid', leadId)
          .single();
          
        if (uuidError || !uuidLead) {
          console.error('❌ UUID search failed:', uuidError?.message);
          return createFallbackResponse(leadId, callData, error.message);
        }
        
        console.log('✅ Successfully found lead by UUID:', uuidLead.id);
        
        // Log call activity if we have call data
        if (callData?.callSid || callData?.status) {
          await logLeadActivity(uuidLead.id, callData);
        }
        
        return new Response(JSON.stringify({
          success: true,
          lead: formatLeadResponse(uuidLead, callData)
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      return createFallbackResponse(leadId, callData, error.message);
    }

    if (!lead) {
      console.log('❌ No lead found with ID:', numericLeadId);
      return createFallbackResponse(leadId, callData);
    }

    // Log successful lead retrieval with full details
    console.log('✅ Successfully found lead directly in database:', lead.id);
    console.log('📊 Lead details:', {
      id: lead.id,
      name: `${lead.first_name || ''} ${lead.last_name || ''}`,
      phone1: lead.phone1,
      email: lead.email
    });

    // Log call activity if we have call data
    if (callData?.callSid || callData?.status) {
      await logLeadActivity(lead.id, callData);
    }

    // Return formatted lead data
    return new Response(JSON.stringify({
      success: true,
      lead: formatLeadResponse(lead, callData)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Error in lead-connected function:', error);
    return createFallbackResponse(null, null, error.message);
  }
});

// Format the lead data for consistent response
function formatLeadResponse(lead, callData = null) {
  return {
    id: lead.id,
    first_name: lead.first_name || 'Unknown',
    last_name: lead.last_name || 'Contact',
    phone1: lead.phone1 || callData?.phoneNumber || '---',
    phone2: lead.phone2 || '---',
    email: lead.email || '---',
    property_address: lead.property_address || '---',
    mailing_address: lead.mailing_address || '---',
    disposition: lead.disposition || 'Not Contacted',
    tags: lead.tags || [],
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    is_mortgage_lead: lead.is_mortgage_lead || false,
    mortgage_data: lead.mortgage_data || null,
    avatar: lead.avatar || null
  };
}

function createFallbackResponse(leadId = null, callData = null, errorMessage = null) {
  const phoneNumber = callData?.phoneNumber || '---';
  
  console.log('📄 Creating fallback response', {
    error: errorMessage,
    leadId,
    phoneNumber
  });
  
  return new Response(JSON.stringify({
    success: errorMessage ? false : true,
    error: errorMessage,
    lead: {
      id: leadId,
      first_name: 'Unknown',
      last_name: 'Contact',
      phone1: phoneNumber,
      phone2: '---',
      email: '---',
      property_address: '---',
      mailing_address: '---',
      disposition: 'Not Contacted',
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_mortgage_lead: false,
      mortgage_data: null,
      avatar: null
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

async function logLeadActivity(leadId: number, callData: any) {
  if (!callData) return;
  
  const activityType = callData.status === 'in-progress' ? 'call_connected' : 
                       callData.status === 'completed' ? 'call_ended' : 
                       'call_status_change';
  
  const description = callData.status === 'in-progress' ? 'Call connected' :
                     callData.status === 'completed' ? 'Call ended' :
                     `Call status changed to ${callData.status}`;
  
  try {
    await adminSupabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        type: activityType,
        description: description,
        timestamp: callData.timestamp || new Date().toISOString()
      });
    
    console.log('📝 Logged lead activity:', {
      leadId,
      type: activityType,
      description
    });
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
  }
}
