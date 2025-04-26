
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { leadId, callData } = requestBody;

    if (!leadId) {
      throw new Error('Lead ID is required');
    }

    console.log(`Lead connected function called for leadId: ${leadId}`);
    if (callData) {
      console.log(`Call data received: callSid=${callData.callSid}, status=${callData.status}, timestamp=${callData.timestamp}`);
    }

    // First try to determine if the leadId is a UUID or a numeric ID
    const isUuid = typeof leadId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId);
    console.log(`Lead ID appears to be a ${isUuid ? 'UUID' : 'numeric ID'}: ${leadId}`);

    // First, check if this ID might be in the dialing_session_leads
    if (isUuid) {
      console.log('Checking if this is a dialing session lead ID first');
      const { data: dialingLead, error: dialingLeadError } = await supabase
        .from('dialing_session_leads')
        .select('*, lead_id')
        .eq('id', leadId)
        .maybeSingle();
      
      if (dialingLead && dialingLead.lead_id) {
        console.log(`Found in dialing_session_leads with lead_id: ${dialingLead.lead_id}`);
        
        // Now try to get the actual lead with this ID
        const { data: actualLead, error: actualLeadError } = await supabase
          .from('leads')
          .select(`
            id,
            first_name,
            last_name,
            phone1,
            phone2,
            email,
            mailing_address,
            property_address,
            disposition,
            created_at,
            updated_at
          `)
          .eq('id', dialingLead.lead_id)
          .maybeSingle();
        
        if (actualLead) {
          console.log(`Successfully found lead: ${actualLead.first_name} ${actualLead.last_name}`);
          
          // Get lead notes
          const { data: notes, error: notesError } = await supabase
            .from('lead_notes')
            .select('*')
            .eq('lead_id', actualLead.id)
            .order('created_at', { ascending: false });

          if (notesError) {
            console.error('Error fetching lead notes:', notesError);
          }

          console.log(`Retrieved ${notes?.length || 0} notes for lead`);

          // If we received call data, log it as a lead activity
          if (callData && callData.status && actualLead.id) {
            try {
              const activityType = callData.status === 'in-progress' ? 'call_connected' : 
                                 callData.status === 'completed' ? 'call_ended' : 'call_status_change';
              
              const description = callData.status === 'in-progress' ? 'Call connected' : 
                               callData.status === 'completed' ? 'Call ended' : 
                               `Call status changed to ${callData.status}`;
              
              const { error: activityError } = await supabase
                .from('lead_activities')
                .insert({
                  lead_id: actualLead.id,
                  type: activityType,
                  description: description,
                  timestamp: callData.timestamp || new Date().toISOString()
                });
              
              if (activityError) {
                console.error('Error logging lead activity:', activityError);
              } else {
                console.log(`Successfully logged lead activity: ${activityType}`);
              }
            } catch (err) {
              console.error('Error creating lead activity:', err);
            }
          }

          return new Response(JSON.stringify({ 
            success: true,
            lead: actualLead,
            notes: notes || [],
            callData
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }
    }

    // If not found in dialing session leads, try a direct lookup
    // For UUID, try to query by uuid directly (requires the leads table to have UUID primary key)
    let leadQuery;
    if (isUuid) {
      console.log('Attempting direct UUID query (if supported by schema)');
      // Try a different approach, treating the UUID as a string in a stringified WHERE clause
      leadQuery = supabase.rpc('find_lead_by_string_id', { lead_string_id: leadId });
    } else {
      console.log('Querying with numeric ID format');
      // Try to convert to numeric if it's not a UUID
      const numericId = Number(leadId);
      if (isNaN(numericId)) {
        throw new Error(`Invalid lead ID format: ${leadId}`);
      }
      leadQuery = supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          phone1,
          phone2,
          email,
          mailing_address,
          property_address,
          disposition,
          created_at,
          updated_at
        `)
        .eq('id', numericId);
    }

    // Execute the query
    const { data: result, error: leadError } = await leadQuery;

    if (leadError) {
      console.error('Error fetching lead details:', leadError);
      
      // Try another fallback approach for any type of ID
      console.log('Trying general fallback query');
      const { data: allLeadsResult, error: allLeadsError } = await supabase
        .from('leads')
        .select('*')
        .limit(1);
      
      if (allLeadsError || !allLeadsResult || allLeadsResult.length === 0) {
        console.error('Final fallback failed:', allLeadsError);
        throw leadError;
      }
      
      console.log(`Found a sample lead with ID: ${allLeadsResult[0].id} (fallback)`);
    }

    const lead = result?.[0] || null;

    if (!lead) {
      console.warn(`No lead found with ID: ${leadId}`);
      
      // As a last resort, try to query the dialing_session_leads for more information
      console.log('Trying to lookup in dialing_session_leads');
      const { data: dialingLead, error: dialingLeadError } = await supabase
        .from('dialing_session_leads')
        .select('*, lead_id')
        .eq('id', leadId)
        .maybeSingle();
      
      if (dialingLead && dialingLead.lead_id) {
        console.log(`Found in dialing_session_leads with actual lead_id: ${dialingLead.lead_id}`);
        
        // Now try to get the actual lead with this ID
        const { data: actualLead, error: actualLeadError } = await supabase
          .from('leads')
          .select(`
            id,
            first_name,
            last_name,
            phone1,
            phone2,
            email,
            mailing_address,
            property_address,
            disposition,
            created_at,
            updated_at
          `)
          .eq('id', dialingLead.lead_id)
          .maybeSingle();
          
        if (actualLead) {
          console.log(`Successfully found lead: ${actualLead.first_name} ${actualLead.last_name}`);
          
          // Return the found lead information
          return new Response(JSON.stringify({ 
            success: true,
            lead: actualLead,
            notes: [],
            callData
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Lead not found',
        callData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log(`Found lead: ${lead.first_name} ${lead.last_name}`);

    // Get lead notes
    const { data: notes, error: notesError } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('Error fetching lead notes:', notesError);
      throw notesError;
    }

    console.log(`Retrieved ${notes?.length || 0} notes for lead`);

    // If we received call data, log it as a lead activity
    if (callData && callData.status) {
      try {
        const activityType = callData.status === 'in-progress' ? 'call_connected' : 
                          callData.status === 'completed' ? 'call_ended' : 'call_status_change';
        
        const description = callData.status === 'in-progress' ? 'Call connected' : 
                          callData.status === 'completed' ? 'Call ended' : 
                          `Call status changed to ${callData.status}`;
        
        const { error: activityError } = await supabase
          .from('lead_activities')
          .insert({
            lead_id: lead.id,
            type: activityType,
            description: description,
            timestamp: callData.timestamp || new Date().toISOString()
          });
        
        if (activityError) {
          console.error('Error logging lead activity:', activityError);
        } else {
          console.log(`Successfully logged lead activity: ${activityType}`);
        }
      } catch (err) {
        console.error('Error creating lead activity:', err);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      lead,
      notes: notes || [],
      callData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in lead-connected function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
