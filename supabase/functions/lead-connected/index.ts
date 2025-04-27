
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
const anonSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '');

// FALLBACK DATA - Will always be returned in case of any error
const FALLBACK_LEAD_DATA = {
  id: 999999,
  first_name: "FALLBACK",
  last_name: "DATA",
  phone1: "555-FALLBACK",
  phone2: "---",
  email: "fallback@example.com",
  property_address: "123 FALLBACK STREET",
  mailing_address: "456 FALLBACK AVENUE",
  disposition: "FALLBACK",
  tags: ["fallback", "error-handling"],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_mortgage_lead: false,
  mortgage_data: null,
  avatar: null
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Lead connected function called');
    let requestBody;
    
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error('❌ Failed to parse request body:', e);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to parse request body'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    console.log('📌 Request body:', JSON.stringify(requestBody, null, 2));
    
    const { leadId, userId, callData } = requestBody;
    
    if (!leadId) {
      console.log('❌ No lead ID provided - returning fallback data');
      return createSuccessResponse(FALLBACK_LEAD_DATA);
    }

    // Try multiple ways to get the effective lead ID
    let effectiveLeadId = null;
    
    // First try getting from callData.originalLeadId
    if (callData?.originalLeadId) {
      effectiveLeadId = callData.originalLeadId;
      console.log(`📌 Using originalLeadId from callData: ${effectiveLeadId}`);
    } 
    // Then try parsing the notes field if it exists
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
    
    // If no other ID found, use the provided leadId
    if (!effectiveLeadId) {
      effectiveLeadId = leadId;
      console.log(`📌 Using provided leadId: ${leadId}`);
    }

    // Store the user's association with this lead for realtime filtering
    if (userId && effectiveLeadId) {
      try {
        // We need to make sure effectiveLeadId is an integer
        let leadIdForActivity;
        
        // Convert to integer if possible
        if (typeof effectiveLeadId === 'string' && /^\d+$/.test(effectiveLeadId)) {
          leadIdForActivity = parseInt(effectiveLeadId);
        } else if (typeof effectiveLeadId === 'number') {
          leadIdForActivity = effectiveLeadId;
        }
        
        // Only proceed if we have a valid integer lead ID
        if (leadIdForActivity) {
          // Track which user is accessing which lead - we store this temporarily
          const { error } = await adminSupabase
            .from('lead_activities')
            .insert({
              lead_id: leadIdForActivity,
              type: 'lead_access',
              description: `User ${userId} accessed lead data`,
            });
            
          if (error) {
            console.warn('⚠️ Could not log lead access:', error.message);
          }
        } else {
          console.warn('⚠️ Cannot log lead access: invalid lead_id format:', effectiveLeadId);
        }
      } catch (trackError) {
        console.warn('⚠️ Error tracking user-lead association:', trackError.message);
      }
    }

    // First approach: Try direct query with the ID as is
    try {
      console.log(`⏳ Attempting to find lead with ID: ${effectiveLeadId}`);
      
      // Use a generic query that accepts both string/UUID and numeric IDs
      const { data: lead, error } = await adminSupabase
        .from('leads')
        .select('*')
        .eq('id', effectiveLeadId)
        .maybeSingle();

      if (lead) {
        console.log('✅ Successfully found lead via direct query:', lead.id);
        // Log call activity if we have call data
        if (callData?.callSid || callData?.status) {
          await logLeadActivity(lead.id, callData, userId);
        }
        
        // Also broadcast lead found event to broadcast channel
        await broadcastLeadFound(lead);
        
        return createSuccessResponse(formatLeadResponse(lead, callData));
      }
    } catch (directError) {
      console.warn('⚠️ Direct query failed:', directError.message);
    }

    // Second approach: Try by session UUID if that field exists
    try {
      if (typeof effectiveLeadId === 'string') {
        console.log('🔄 Trying to find lead by UUID in session_uuid field');
        const { data: uuidLead, error } = await adminSupabase
          .from('leads')
          .select('*')
          .eq('session_uuid', effectiveLeadId)
          .maybeSingle();
          
        if (uuidLead) {
          console.log('✅ Successfully found lead by UUID:', uuidLead.id);
          // Log call activity if we have call data
          if (callData?.callSid || callData?.status) {
            await logLeadActivity(uuidLead.id, callData, userId);
          }
          
          // Also broadcast lead found event to broadcast channel
          await broadcastLeadFound(uuidLead);
          
          return createSuccessResponse(formatLeadResponse(uuidLead, callData));
        }
      }
    } catch (uuidError) {
      console.warn('⚠️ UUID search failed:', uuidError.message);
    }

    // Third approach: For numeric IDs, try database function
    if (typeof effectiveLeadId === 'string' && /^\d+$/.test(effectiveLeadId)) {
      try {
        const numericId = parseInt(effectiveLeadId, 10);
        console.log(`🔢 Trying with converted numeric ID: ${numericId}`);
        const { data, error } = await adminSupabase.rpc('find_lead_by_string_id', {
          lead_string_id: effectiveLeadId
        });
        
        if (data && data.length > 0) {
          const foundId = data[0].id;
          console.log(`👍 Found lead via database function, ID: ${foundId}`);
          
          // Now fetch the full lead data
          const { data: fullLeadData, error: fullLeadError } = await adminSupabase
            .from('leads')
            .select('*')
            .eq('id', foundId)
            .maybeSingle();
            
          if (fullLeadData) {
            console.log('✅ Successfully retrieved full lead data:', fullLeadData.id);
            // Log call activity if we have call data
            if (callData?.callSid || callData?.status) {
              await logLeadActivity(fullLeadData.id, callData, userId);
            }
            
            // Also broadcast lead found event to broadcast channel
            await broadcastLeadFound(fullLeadData);
            
            return createSuccessResponse(formatLeadResponse(fullLeadData, callData));
          }
        }
      } catch (dbFunctionError) {
        console.warn('⚠️ Database function search failed:', dbFunctionError.message);
      }
    }

    // Fourth approach: Try retrieving via retrieve-leads (LAST RESORT)
    try {
      console.log('🔍 Attempting to use retrieve-leads as last resort');
      
      // Use the service role to directly invoke the retrieve-leads function
      const { data: retrieveLeadsResponse, error: retrieveLeadsError } = await adminSupabase.functions.invoke('retrieve-leads', {
        body: {
          leadId: effectiveLeadId,
          exactMatch: true,
          source: 'all'
        }
      });

      if (retrieveLeadsResponse?.data && retrieveLeadsResponse.data.length > 0) {
        const retrievedLead = retrieveLeadsResponse.data[0];
        console.log('✅ Successfully retrieved lead via retrieve-leads:', retrievedLead.id);
        
        // Convert from retrieve-leads format to our lead-connected format
        const formattedLead = {
          id: retrievedLead.id,
          first_name: retrievedLead.firstName || 'Unknown',
          last_name: retrievedLead.lastName || 'Contact',
          phone1: retrievedLead.phone1 || callData?.phoneNumber || '---',
          phone2: retrievedLead.phone2 || '---',
          email: retrievedLead.email || '---',
          property_address: retrievedLead.propertyAddress || '---',
          mailing_address: retrievedLead.mailingAddress || '---',
          disposition: retrievedLead.disposition || 'Not Contacted',
          tags: retrievedLead.tags || [],
          created_at: retrievedLead.createdAt,
          updated_at: retrievedLead.updatedAt,
          is_mortgage_lead: retrievedLead.isMortgageLead || false,
          mortgage_data: retrievedLead.mortgageData || null,
          avatar: retrievedLead.avatar || null
        };
        
        // Log call activity if we have call data
        if (callData?.callSid || callData?.status) {
          await logLeadActivity(formattedLead.id, callData, userId);
        }
        
        // Also broadcast lead found event to broadcast channel
        await broadcastLeadFound(formattedLead);
        
        return createSuccessResponse(formattedLead);
      }
    } catch (retrieveLeadsError) {
      console.warn('⚠️ Retrieve-leads approach failed:', retrieveLeadsError.message);
    }
    
    // If all approaches failed, return fallback data with the requested ID
    console.log('⚠️ All approaches to find lead failed - returning fallback data');
    
    // Try to build a more useful fallback with any available information
    const fallback = { 
      ...FALLBACK_LEAD_DATA,
      id: typeof effectiveLeadId === 'number' || /^\d+$/.test(effectiveLeadId) ? parseInt(String(effectiveLeadId)) : FALLBACK_LEAD_DATA.id,
      phone1: callData?.phoneNumber || FALLBACK_LEAD_DATA.phone1
    };
    
    // Broadcast fallback data too so the UI shows something
    await broadcastLeadFound(fallback);
    
    return createSuccessResponse(fallback);
    
  } catch (error) {
    console.error('❌ Error in lead-connected function:', error);
    
    // Try to broadcast fallback data in case of error
    await broadcastLeadFound(FALLBACK_LEAD_DATA);
    
    return createSuccessResponse(FALLBACK_LEAD_DATA);
  }
});

// Helper function to create a success response with lead data
function createSuccessResponse(lead) {
  console.log('📤 Returning lead data:', lead.id, lead.first_name, lead.last_name);
  return new Response(JSON.stringify({
    success: true,
    lead: lead
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

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

// Helper function to log lead activity
async function logLeadActivity(leadId, callData, userId = null) {
  if (!callData) return;
  
  // Make sure leadId is a number for lead_activities table
  let numericLeadId = leadId;
  if (typeof leadId === 'string' && /^\d+$/.test(leadId)) {
    numericLeadId = parseInt(leadId, 10);
  }
  
  if (typeof numericLeadId !== 'number') {
    console.warn(`Cannot log activity: leadId must be a number, got ${typeof leadId}: ${leadId}`);
    return;
  }

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
        lead_id: numericLeadId,
        type: activityType,
        description: description + (userId ? ` by user ${userId}` : ''),
        timestamp: callData.timestamp || new Date().toISOString()
      });
    
    console.log('📝 Logged lead activity:', {
      leadId: numericLeadId,
      type: activityType,
      description,
      userId
    });
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
  }
}

// Helper function to broadcast lead data to channel
async function broadcastLeadFound(lead) {
  if (!lead?.id) {
    console.warn('⚠️ Cannot broadcast: lead or lead.id is missing');
    return;
  }
  
  try {
    // Create a channel specific to this lead ID for broadcasting updates
    const channelName = `lead-data-${lead.id}`;
    
    // Log before sending the broadcast
    console.log(`📢 Broadcasting lead data to channel: ${channelName}`);
    
    // Send a broadcast message with the lead data
    const result = await anonSupabase
      .channel(channelName)
      .send({
        type: 'broadcast',
        event: 'lead_data_update',
        payload: {
          lead,
          timestamp: new Date().toISOString(),
          source: 'lead_connected'
        }
      });
      
    // Check if broadcast was successful
    if (result.error) {
      console.error('❌ Broadcast failed:', result.error);
    } else {
      console.log('✅ Broadcast successful!');
    }
    
    // Also try sending to a global channel as backup
    await anonSupabase
      .channel('global-leads')
      .send({
        type: 'broadcast',
        event: 'lead_data_update',
        payload: {
          lead,
          timestamp: new Date().toISOString(),
          source: 'lead_connected_global'
        }
      });
      
  } catch (error) {
    console.error('❌ Failed to broadcast lead data:', error);
  }
}
