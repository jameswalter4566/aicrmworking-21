
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
    
    // Log detailed callData information including the originalLeadId
    if (callData) {
      const { callSid, status, timestamp, originalLeadId } = callData;
      console.log(`Call data received: callSid=${callSid}, status=${status}, timestamp=${timestamp}`);
      console.log(`Original Lead ID from callData: ${originalLeadId}`);
    }

    // First determine if the leadId is a UUID format
    const isUuid = typeof leadId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId);
    console.log(`Lead ID appears to be a ${isUuid ? 'UUID' : 'numeric ID'}: ${leadId}`);
    
    // Log the Original Lead ID if it exists in callData
    if (callData?.originalLeadId) {
      console.log(`Working with original lead ID from callData: ${callData.originalLeadId}`);
    }

    // STRATEGY 1: Check if this is a dialing session lead first - this is most likely with power dialer
    if (isUuid) {
      console.log('Checking if this is a dialing session lead ID first');
      const { data: dialingLead, error: dialingLeadError } = await supabase
        .from('dialing_session_leads')
        .select('*, notes')
        .eq('id', leadId)
        .maybeSingle();
      
      if (dialingLead) {
        console.log(`Found in dialing_session_leads with ID: ${dialingLead.id}`);
        
        // Try to extract the original lead ID from the notes field if it exists
        let originalLeadId = null;
        if (dialingLead.notes) {
          try {
            const notesData = JSON.parse(dialingLead.notes);
            if (notesData.originalLeadId) {
              originalLeadId = notesData.originalLeadId;
              console.log(`Found original lead ID in notes: ${originalLeadId}`);
            }
          } catch (parseError) {
            console.log(`Could not parse notes JSON: ${parseError.message}`);
          }
        }

        // If we have an original lead ID from notes or from callData, fetch that lead
        const effectiveOriginalLeadId = originalLeadId || callData?.originalLeadId;
        
        if (effectiveOriginalLeadId) {
          console.log(`Using effective original lead ID: ${effectiveOriginalLeadId}`);
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
            .eq('id', effectiveOriginalLeadId)
            .maybeSingle();
          
          if (actualLead) {
            console.log(`Successfully found lead via originalLeadId: ${actualLead.first_name} ${actualLead.last_name}`);
            
            // Get lead notes
            const { data: notes } = await supabase
              .from('lead_notes')
              .select('*')
              .eq('lead_id', actualLead.id)
              .order('created_at', { ascending: false });

            // Log activity if we have call data
            await logLeadActivity(actualLead.id, callData);

            return new Response(JSON.stringify({ 
              success: true,
              lead: actualLead,
              notes: notes || [],
              callData,
              originalLeadId: effectiveOriginalLeadId
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          } else {
            console.log(`Could not find lead with originalLeadId: ${effectiveOriginalLeadId}`);
          }
        }
        
        // If we reached here, we found the dialing_session_lead but couldn't get a lead record
        // Return a partial success with what we have
        return new Response(JSON.stringify({ 
          success: true,
          lead: {
            id: leadId,
            // Extract any basic info we can from notes
            ...extractLeadDataFromNotes(dialingLead.notes)
          },
          notes: [],
          callData,
          originalLeadId: callData?.originalLeadId,
          source: 'dialing_session_lead_only'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } else {
        console.log('No dialing session lead found, checking dialing_session_leads by lead_id');
        
        // Try to match UUID as lead_id in dialing_session_leads
        const { data: dialingLeadByLeadId } = await supabase
          .from('dialing_session_leads')
          .select('*, notes')
          .eq('lead_id', leadId)
          .maybeSingle();
          
        if (dialingLeadByLeadId?.notes) {
          console.log('Found match by lead_id in dialing_session_leads');
          return new Response(JSON.stringify({ 
            success: true,
            lead: {
              id: leadId,
              // Extract what we can from notes
              ...extractLeadDataFromNotes(dialingLeadByLeadId.notes)
            },
            notes: [],
            callData,
            originalLeadId: callData?.originalLeadId,
            source: 'dialing_session_lead_by_lead_id'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }
    }

    // STRATEGY 2: Try to find the lead using our database function
    // Always try originalLeadId first if it exists in callData
    const idToSearch = callData?.originalLeadId || leadId;
    console.log(`Trying database function to find lead by string ID: ${idToSearch}`);
    try {
      const { data: functionResult, error: functionError } = await supabase
        .rpc('find_lead_by_string_id', { lead_string_id: idToSearch });
      
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
            callData,
            originalLeadId: callData?.originalLeadId
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
    const numericIdToTry = callData?.originalLeadId || leadId;
    if (!isNaN(Number(numericIdToTry))) {
      console.log(`Trying direct numeric query with ID: ${numericIdToTry}`);
      const numericId = Number(numericIdToTry);
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
          callData,
          originalLeadId: callData?.originalLeadId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // If we still haven't found anything, try one last approach: searching dialing_session_leads
    console.log('Trying to lookup in dialing_session_leads');
    const searchId = callData?.originalLeadId || leadId;
    const { data: allDialingLeads, error: allDialingError } = await supabase
      .from('dialing_session_leads')
      .select('notes')
      .filter('notes', 'ilike', `%${searchId}%`)
      .maybeSingle();
      
    if (allDialingLeads?.notes) {
      console.log('Found potential match in dialing_session_leads notes');
      return new Response(JSON.stringify({ 
        success: true,
        lead: {
          id: leadId,
          ...extractLeadDataFromNotes(allDialingLeads.notes)
        },
        notes: [],
        callData,
        originalLeadId: callData?.originalLeadId,
        source: 'dialing_session_lead_notes_search'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // If we still haven't found anything, return a 404
    console.log(`No lead found with ID: ${leadId}`);
    
    // Return the call data anyway so the UI can at least show the call status
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Lead not found, but call data is available',
      callData,
      originalLeadId: callData?.originalLeadId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 instead of 404 so call data is still accessible
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
