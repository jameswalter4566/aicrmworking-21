
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract data from request body
    const { leadId, content, createdBy } = await req.json();

    if (!leadId || !content) {
      throw new Error('Lead ID and content are required');
    }

    console.log(`Adding note to lead with ID: ${leadId}`);

    // Insert the note into the lead_notes table
    const { data: note, error } = await supabase
      .from('lead_notes')
      .insert({
        lead_id: leadId,
        content,
        created_by: createdBy || 'Anonymous',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error adding note:', error.message);
      throw new Error(`Failed to add note: ${error.message}`);
    }

    console.log('Note added successfully:', note);

    // Return the newly created note
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: note,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in add-lead-note function: ${error.message}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
