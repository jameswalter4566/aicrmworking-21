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

    // First check if we have a call mapping
    if (callData?.callSid) {
      const { data: callMapping, error: mappingError } = await supabase
        .from('call_mappings')
        .select('*')
        .eq('call_sid', callData.callSid)
        .maybeSingle();

      if (callMapping) {
        console.log('Found call mapping:', callMapping);
        
        // Update call status
        await supabase
          .from('call_mappings')
          .update({ 
            status: callData.status,
            updated_at: new Date().toISOString()
          })
          .eq('call_sid', callData.callSid);

        // If we have lead details stored, use them
        if (callMapping.lead_details) {
          return new Response(JSON.stringify({
            success: true,
            lead: callMapping.lead_details,
            notes: [], // Could be enhanced to fetch notes if needed
            callData
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        }
      }
    }

    // If no mapping found or no lead details, proceed with existing lookup logic
    const isUuid = typeof leadId === 'string' && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId);

    // STRATEGY 1: Check dialing session leads
    if (isUuid) {
      const { data: dialingLead, error: dialingLeadError } = await supabase
        .from('dialing_session_leads')
        .select('*, notes')
        .eq('id', leadId)
        .maybeSingle();
      
      if (dialingLead) {
        console.log(`Found in dialing_session_leads with ID: ${dialingLead.id}`);
        
        let originalLeadId = null;
        if (dialingLead.notes) {
          try {
            const notesData = JSON.parse(dialingLead.notes);
            originalLeadId = notesData.originalLeadId;
          } catch (parseError) {
            console.log(`Could not parse notes JSON: ${parseError.message}`);
          }
        }

        if (originalLeadId) {
          const { data: actualLead } = await supabase
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
            .eq('id', originalLeadId)
            .maybeSingle();
          
          if (actualLead) {
            // Store mapping for future lookups
            if (callData?.callSid) {
              await supabase
                .from('call_mappings')
                .upsert({
                  call_sid: callData.callSid,
                  browser_call_sid: callData.browserCallSid || null,
                  lead_id: leadId,
                  original_lead_id: originalLeadId,
                  lead_details: actualLead,
                  status: callData.status
                })
                .select()
                .single();
            }

            // Get lead notes
            const { data: notes } = await supabase
              .from('lead_notes')
              .select('*')
              .eq('lead_id', actualLead.id)
              .order('created_at', { ascending: false });

            await logLeadActivity(actualLead.id, callData);

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
        
        // Return partial success with dialing session data
        return new Response(JSON.stringify({ 
          success: true,
          lead: {
            id: leadId,
            ...extractLeadDataFromNotes(dialingLead.notes)
          },
          notes: [],
          callData,
          source: 'dialing_session_lead_only'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // STRATEGY 2: Try to find the lead using our database function
    console.log('Trying database function to find lead by string ID');
    try {
      const { data: functionResult, error: functionError } = await supabase
        .rpc('find_lead_by_string_id', { lead_string_id: leadId });
      
      if (functionError) {
        console.log(`Database function error: ${functionError.message}`);
      } else if (functionResult && functionResult.length > 0) {
        const leadId = functionResult[0].id;
        console.log(`Found lead with ID ${leadId} using database function`);
        
        // Now get full lead details
        const { data: fullLead, error: fullLeadError } = await supabase
          .from('leads')
          .select(`*`)
          .eq('id', leadId)
          .maybeSingle();
          
        if (fullLead) {
          // Get lead notes
          const { data: notes } = await supabase
            .from('lead_notes')
            .select('*')
            .eq('lead_id', fullLead.id)
            .order('created_at', { ascending: false });

          // Log activity if we have call data
          await logLeadActivity(fullLead.id, callData);

          return new Response(JSON.stringify({ 
            success: true,
            lead: fullLead,
            notes: notes || [],
            callData
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }
    } catch (functionError) {
      console.log(`Error calling find_lead_by_string_id: ${functionError.message}`);
    }

    // STRATEGY 3: Try direct numeric query if possible
    if (!isNaN(Number(leadId))) {
      console.log('Trying direct numeric query');
      const numericId = Number(leadId);
      const { data: numericLead, error: numericLeadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', numericId)
        .maybeSingle();
        
      if (numericLead) {
        console.log(`Found lead via numeric ID: ${numericLead.first_name} ${numericLead.last_name}`);
        
        // Get lead notes
        const { data: notes } = await supabase
          .from('lead_notes')
          .select('*')
          .eq('lead_id', numericLead.id)
          .order('created_at', { ascending: false });

        // Log activity if we have call data
        await logLeadActivity(numericLead.id, callData);

        return new Response(JSON.stringify({ 
          success: true,
          lead: numericLead,
          notes: notes || [],
          callData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // If we still haven't found anything, return a 404
    console.log(`No lead found with ID: ${leadId}`);
    
    // Return the call data anyway so the UI can at least show the call status
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Lead not found, but call data is available',
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

// Helper function to log lead activity based on call data
async function logLeadActivity(leadId: number | string, callData?: any) {
  if (!callData || !callData.status) return;
  
  try {
    const activityType = callData.status === 'in-progress' ? 'call_connected' : 
                       callData.status === 'completed' ? 'call_ended' : 'call_status_change';
    
    const description = callData.status === 'in-progress' ? 'Call connected' : 
                      callData.status === 'completed' ? 'Call ended' : 
                      `Call status changed to ${callData.status}`;
    
    const { error: activityError } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
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

// Extract whatever lead data we can from notes JSON
function extractLeadDataFromNotes(notesString: string | null): any {
  if (!notesString) return {};
  
  try {
    const notesData = JSON.parse(notesString);
    return {
      first_name: notesData.firstName || notesData.first_name,
      last_name: notesData.lastName || notesData.last_name,
      phone1: notesData.phone,
      email: notesData.email,
      // Add any other fields we might find in notes
    };
  } catch (e) {
    console.log(`Could not parse notes as JSON: ${e.message}`);
    return {};
  }
}
