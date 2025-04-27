
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
        // Here's the enhanced approach to call retrieve-leads that's more aligned with traditional usage
        console.log(`Attempting to fetch lead with ID: ${effectiveLeadId} using enhanced approach`);
        
        // Convert to number if it's a numeric string to ensure proper type handling
        let numericLeadId = effectiveLeadId;
        if (/^\d+$/.test(String(effectiveLeadId))) {
          numericLeadId = parseInt(String(effectiveLeadId), 10);
          console.log(`Converted lead ID to numeric format: ${numericLeadId}`);
        }
        
        // Use a direct database query when possible to avoid interference with auth flows
        try {
          const { data: directLead, error: directError } = await adminSupabase
            .from('leads')
            .select('*')
            .eq('id', numericLeadId)
            .single();
            
          if (directLead && !directError) {
            console.log(`Successfully found lead directly in database: ${directLead.id}`);
            
            // Format the lead data to match expected structure
            const formattedLead = {
              id: directLead.id,
              firstName: directLead.first_name,
              lastName: directLead.last_name,
              email: directLead.email,
              phone1: directLead.phone1,
              phone2: directLead.phone2,
              mailingAddress: directLead.mailing_address,
              propertyAddress: directLead.property_address,
              disposition: directLead.disposition,
              createdAt: directLead.created_at
            };
            
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
            console.log(`Direct database query failed, falling back to retrieve-leads: ${directError?.message || 'No lead found'}`);
          }
        } catch (directQueryError) {
          console.warn(`Error in direct database query, falling back to retrieve-leads: ${directQueryError.message}`);
        }
        
        // Fall back to the retrieve-leads function with enhanced configuration
        const { data: leadResponse, error: retrieveError } = await adminSupabase.functions.invoke(
          'retrieve-leads',
          {
            body: {
              source: 'all',
              leadId: numericLeadId,
              exactMatch: true,
              pageSize: 1,
              // Adding additional commonly used parameters
              includeNotes: true,
              includeActivities: true
            },
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
              'x-client-info': 'lead-connected-function'
            }
          }
        );
        
        if (retrieveError) {
          console.error('Error retrieving lead data:', retrieveError);
          throw retrieveError;
        }

        if (leadResponse?.data && leadResponse.data.length > 0) {
          console.log('Successfully retrieved lead data from retrieve-leads:', leadResponse.data[0].id);
          
          // Log activity if we have call data
          if (callData?.callSid || callData?.status) {
            await logLeadActivity(leadResponse.data[0].id, callData);
          }
          
          return new Response(JSON.stringify({ 
            success: true,
            lead: {
              id: leadResponse.data[0].id,
              first_name: leadResponse.data[0].firstName,
              last_name: leadResponse.data[0].lastName,
              phone1: leadResponse.data[0].phone1,
              email: leadResponse.data[0].email,
              property_address: leadResponse.data[0].propertyAddress,
              mailing_address: leadResponse.data[0].mailingAddress
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else if (leadResponse?.data) {
          console.log(`No lead found for ID: ${effectiveLeadId} in retrieve-leads response`);
          console.log('Full retrieve-leads response:', JSON.stringify(leadResponse));
        } else {
          console.log(`Unexpected response format from retrieve-leads:`, leadResponse);
        }
      } catch (error) {
        console.error('Error fetching lead data:', error);
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
