
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { leadId } = await req.json();
    
    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'Lead ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete any associated notes
    const { error: notesError } = await supabaseClient
      .from('lead_notes')
      .delete()
      .eq('lead_id', leadId);
    
    if (notesError) {
      console.error('Error deleting lead notes:', notesError);
    }

    // Delete any activities
    const { error: activitiesError } = await supabaseClient
      .from('lead_activities')
      .delete()
      .eq('lead_id', leadId);
    
    if (activitiesError) {
      console.error('Error deleting lead activities:', activitiesError);
    }

    // Delete from any calling lists
    const { error: listError } = await supabaseClient
      .from('calling_list_leads')
      .delete()
      .eq('lead_id', leadId);
    
    if (listError) {
      console.error('Error deleting from calling lists:', listError);
    }

    // Finally delete the lead itself
    const { error: deleteError } = await supabaseClient
      .from('leads')
      .delete()
      .eq('id', leadId);
    
    if (deleteError) {
      return new Response(
        JSON.stringify({ error: 'Failed to delete lead' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
