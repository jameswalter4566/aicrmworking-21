
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

    // Get the lead details
    const { data: lead, error: leadError } = await supabase
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
      .eq('id', leadId)
      .single();

    if (leadError) {
      console.error('Error fetching lead details:', leadError);
      throw leadError;
    }

    if (!lead) {
      console.warn(`No lead found with ID: ${leadId}`);
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
      .eq('lead_id', leadId)
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
