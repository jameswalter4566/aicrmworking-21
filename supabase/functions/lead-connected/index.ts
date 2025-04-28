import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Twilio } from 'https://esm.sh/twilio@4.19.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
const anonSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '');

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');

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

async function broadcastLeadFound(lead, callState?: string, transcriptions?: any[]) {
  if (!lead?.id) {
    console.warn('⚠️ Cannot broadcast: lead or lead.id is missing');
    return;
  }
  
  try {
    const channelName = `lead-data-${lead.id}`;
    
    console.log(`📢 Broadcasting lead data to channel: ${channelName}, callState: ${callState}`);
    
    const result = await anonSupabase
      .channel(channelName)
      .send({
        type: 'broadcast',
        event: 'lead_data_update',
        payload: {
          lead,
          callState,
          timestamp: new Date().toISOString(),
          transcriptions,
          source: 'lead_connected'
        }
      });
      
    if (result.error) {
      console.error('❌ Broadcast failed:', result.error);
    } else {
      console.log('✅ Broadcast successful!');
    }
    
    await anonSupabase
      .channel('global-leads')
      .send({
        type: 'broadcast',
        event: 'lead_data_update',
        payload: {
          lead,
          callState,
          timestamp: new Date().toISOString(),
          transcriptions,
          source: 'lead_connected_global'
        }
      });
      
  } catch (error) {
    console.error('❌ Failed to broadcast lead data:', error);
  }
}

async function broadcastTranscription(leadId: string | number, transcription: any) {
  if (!leadId || !transcription) {
    console.warn('⚠️ Cannot broadcast transcription: leadId or transcription missing');
    return;
  }
  
  try {
    const channelName = `lead-transcription-${leadId}`;
    
    console.log(`📢 Broadcasting transcription to channel: ${channelName}`);
    
    const result = await anonSupabase
      .channel(channelName)
      .send({
        type: 'broadcast',
        event: 'transcription_update',
        payload: {
          leadId,
          transcription,
          timestamp: new Date().toISOString()
        }
      });
      
    if (result.error) {
      console.error('❌ Transcription broadcast failed:', result.error);
    } else {
      console.log('✅ Transcription broadcast successful!');
    }
    
  } catch (error) {
    console.error('❌ Failed to broadcast transcription:', error);
  }
}

async function fetchTwilioTranscriptions(callSid: string, leadId: string | number) {
  console.log(`🔍 Attempting to fetch Twilio transcriptions directly for call SID: ${callSid}`);
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('❌ Twilio credentials not available');
    return [];
  }
  
  try {
    const client = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    const transcriptionsResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}/Transcriptions.json`,
      {
        headers: {
          "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`
        }
      }
    );
    
    if (!transcriptionsResponse.ok) {
      console.error(`❌ Failed to fetch transcriptions from Twilio API: ${transcriptionsResponse.status}`);
      return [];
    }
    
    const transcriptionsData = await transcriptionsResponse.json();
    console.log(`✅ Retrieved ${transcriptionsData.transcriptions?.length || 0} transcriptions from Twilio API`);
    
    const transcriptions = [];
    
    if (transcriptionsData.transcriptions && transcriptionsData.transcriptions.length > 0) {
      for (const item of transcriptionsData.transcriptions) {
        const transcriptionResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Transcriptions/${item.sid}.json`,
          {
            headers: {
              "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`
            }
          }
        );
        
        if (transcriptionResponse.ok) {
          const transcriptionData = await transcriptionResponse.json();
          
          const transcription = {
            lead_id: String(leadId),
            call_sid: callSid,
            segment_text: transcriptionData.transcription_text,
            is_final: true,
            confidence: 0.8,
            speaker: 'Unknown',
            timestamp: transcriptionData.date_created
          };
          
          const { data, error } = await adminSupabase
            .from('call_transcriptions')
            .insert(transcription)
            .select();
            
          if (error) {
            console.error('❌ Error storing Twilio transcription:', error);
          } else if (data && data.length > 0) {
            console.log(`✅ Stored Twilio transcription: ${data[0].id}`);
            transcriptions.push(data[0]);
            
            await broadcastTranscription(leadId, data[0]);
          }
        } else {
          console.error(`❌ Failed to fetch transcription text for SID ${item.sid}: ${transcriptionResponse.status}`);
        }
      }
    }
    
    return transcriptions;
  } catch (error) {
    console.error('❌ Error fetching Twilio transcriptions:', error);
    return [];
  }
}

async function fetchRecentTranscriptions(leadId: string | number, callSid?: string, limit = 10) {
  if (!leadId) return [];
  
  try {
    let query = adminSupabase
      .from('call_transcriptions')
      .select('*')
      .eq('lead_id', leadId)
      .order('timestamp', { ascending: false })
      .limit(limit);
      
    if (callSid) {
      query = query.eq('call_sid', callSid);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching transcriptions:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Exception fetching transcriptions:', error);
    return [];
  }
}

async function storeTranscription(leadId: string | number, callSid: string, transcriptionData: any) {
  if (!leadId || !callSid || !transcriptionData?.segment_text) {
    console.warn('⚠️ Cannot store transcription: required data missing');
    return null;
  }
  
  try {
    const { data, error } = await adminSupabase
      .from('call_transcriptions')
      .insert({
        lead_id: String(leadId),
        call_sid: callSid,
        segment_text: transcriptionData.segment_text,
        speaker: transcriptionData.speaker || null,
        confidence: transcriptionData.confidence || null,
        is_final: transcriptionData.is_final || false,
        timestamp: transcriptionData.timestamp || new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('❌ Error storing transcription:', error);
      return null;
    }
    
    console.log('✅ Transcription stored successfully:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Exception storing transcription:', error);
    return null;
  }
}

Deno.serve(async (req) => {
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
    
    const { leadId, userId, callData, transcription, fetchTranscriptions } = requestBody;
    
    const callState = callData?.callState || 'unknown';
    console.log(`📞 Call State: ${callState}`);
    
    if (fetchTranscriptions === true && callData?.callSid && leadId) {
      console.log(`🔍 Explicit request to fetch transcriptions for call SID ${callData.callSid}`);
      const twilioTranscriptions = await fetchTwilioTranscriptions(callData.callSid, leadId);
      const dbTranscriptions = await fetchRecentTranscriptions(leadId, callData.callSid);
      
      const allTranscriptions = [...dbTranscriptions];
      for (const trans of twilioTranscriptions) {
        if (!allTranscriptions.some(t => t.id === trans.id)) {
          allTranscriptions.push(trans);
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        transcriptions: allTranscriptions
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    if (transcription && leadId) {
      console.log('🎤 Processing transcription update for lead:', leadId);
      
      const callSid = callData?.callSid || transcription.callSid;
      if (!callSid) {
        console.warn('⚠️ Cannot process transcription without callSid');
      } else {
        const storedTranscription = await storeTranscription(leadId, callSid, transcription);
        if (storedTranscription) {
          await broadcastTranscription(leadId, storedTranscription);
          
          if (requestBody.transcriptionOnly === true) {
            return new Response(JSON.stringify({
              success: true,
              transcription: storedTranscription
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          }
        }
      }
    }
    
    if (!leadId) {
      console.log('❌ No lead ID provided - returning fallback data');
      const fallback = FALLBACK_LEAD_DATA;
      await broadcastLeadFound(fallback, callState);
      return createSuccessResponse(fallback);
    }

    let effectiveLeadId = null;
    
    if (callData?.originalLeadId) {
      effectiveLeadId = callData.originalLeadId;
      console.log(`📌 Using originalLeadId from callData: ${effectiveLeadId}`);
    } 
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
    
    if (!effectiveLeadId) {
      effectiveLeadId = leadId;
      console.log(`📌 Using provided leadId: ${leadId}`);
    }

    if (userId && effectiveLeadId) {
      try {
        let leadIdForActivity;
        
        if (typeof effectiveLeadId === 'string' && /^\d+$/.test(effectiveLeadId)) {
          leadIdForActivity = parseInt(effectiveLeadId);
        } else if (typeof effectiveLeadId === 'number') {
          leadIdForActivity = effectiveLeadId;
        }
        
        if (leadIdForActivity) {
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

    const callSid = callData?.callSid;
    
    let transcriptions = [];
    if (callSid) {
      console.log(`🎤 Call SID detected: ${callSid}, fetching transcriptions from Twilio`);
      const twilioTranscriptions = await fetchTwilioTranscriptions(callSid, effectiveLeadId);
      const dbTranscriptions = await fetchRecentTranscriptions(effectiveLeadId, callSid);
      
      transcriptions = [...dbTranscriptions];
      for (const trans of twilioTranscriptions) {
        if (!transcriptions.some(t => t.id === trans.id)) {
          transcriptions.push(trans);
        }
      }
    } else {
      transcriptions = await fetchRecentTranscriptions(effectiveLeadId);
    }

    try {
      console.log(`⏳ Attempting to find lead with ID: ${effectiveLeadId}`);
      
      const { data: lead, error } = await adminSupabase
        .from('leads')
        .select('*')
        .eq('id', effectiveLeadId)
        .maybeSingle();

      if (lead) {
        console.log('✅ Successfully found lead via direct query:', lead.id);
        if (callData?.callSid || callData?.status) {
          await logLeadActivity(lead.id, callData, userId);
        }
        await broadcastLeadFound(lead, callState, transcriptions);
        return createSuccessResponse(formatLeadResponse(lead, callData, transcriptions));
      }
    } catch (directError) {
      console.warn('⚠️ Direct query failed:', directError.message);
    }

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
          if (callData?.callSid || callData?.status) {
            await logLeadActivity(uuidLead.id, callData, userId);
          }
          await broadcastLeadFound(uuidLead, callState, transcriptions);
          return createSuccessResponse(formatLeadResponse(uuidLead, callData, transcriptions));
        }
      }
    } catch (uuidError) {
      console.warn('⚠️ UUID search failed:', uuidError.message);
    }

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
          
          const { data: fullLeadData, error: fullLeadError } = await adminSupabase
            .from('leads')
            .select('*')
            .eq('id', foundId)
            .maybeSingle();
            
          if (fullLeadData) {
            console.log('✅ Successfully retrieved full lead data:', fullLeadData.id);
            if (callData?.callSid || callData?.status) {
              await logLeadActivity(fullLeadData.id, callData, userId);
            }
            await broadcastLeadFound(fullLeadData, callState, transcriptions);
            return createSuccessResponse(formatLeadResponse(fullLeadData, callData, transcriptions));
          }
        }
      } catch (dbFunctionError) {
        console.warn('⚠️ Database function search failed:', dbFunctionError.message);
      }
    }

    try {
      console.log('🔍 Attempting to use retrieve-leads as last resort');
      
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
          avatar: retrievedLead.avatar || null,
          transcriptions: transcriptions
        };
        
        if (callData?.callSid || callData?.status) {
          await logLeadActivity(formattedLead.id, callData, userId);
        }
        await broadcastLeadFound(formattedLead, callState, transcriptions);
        return createSuccessResponse(formattedLead);
      }
    } catch (retrieveLeadsError) {
      console.warn('⚠️ Retrieve-leads approach failed:', retrieveLeadsError.message);
    }
    
    console.log('⚠️ All approaches to find lead failed - returning fallback data');
    
    const fallback = { 
      ...FALLBACK_LEAD_DATA,
      id: typeof effectiveLeadId === 'number' || /^\d+$/.test(effectiveLeadId) ? parseInt(String(effectiveLeadId)) : FALLBACK_LEAD_DATA.id,
      phone1: callData?.phoneNumber || FALLBACK_LEAD_DATA.phone1
    };
    
    await broadcastLeadFound(fallback, callState, transcriptions);
    
    return createSuccessResponse(fallback);
    
  } catch (error) {
    console.error('❌ Error in lead-connected function:', error);
    
    await broadcastLeadFound(FALLBACK_LEAD_DATA, 'unknown');
    
    return createSuccessResponse(FALLBACK_LEAD_DATA);
  }
});

function createSuccessResponse(lead, transcriptions = []) {
  console.log('📤 Returning lead data:', lead.id, lead.first_name, lead.last_name);
  return new Response(JSON.stringify({
    success: true,
    lead: lead,
    transcriptions: transcriptions
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

function formatLeadResponse(lead, callData = null, transcriptions = []) {
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
    avatar: lead.avatar || null,
    transcriptions: transcriptions
  };
}

async function logLeadActivity(leadId, callData, userId = null) {
  if (!callData) return;
  
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
