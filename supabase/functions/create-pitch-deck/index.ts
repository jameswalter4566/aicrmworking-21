
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
    // Get auth token from request headers
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized: Invalid user token');
    }
    
    // Parse request body
    const { action, pitchDeckData, pitchDeckId, searchQuery } = await req.json();
    
    let responseData;
    
    // Debug logs to track the flow
    console.log(`Action: ${action}, User ID: ${user.id}`);
    
    // Handle different actions
    switch (action) {
      case 'create':
        // Create new pitch deck with explicit created_by user ID
        console.log('Creating new pitch deck with data:', { ...pitchDeckData, created_by: user.id });
        
        const { data: newDeckData, error: createError } = await supabase
          .from('pitch_decks')
          .insert({
            ...pitchDeckData,
            created_by: user.id,
          })
          .select('*')
          .single();
          
        if (createError) {
          console.error('Create error details:', createError);
          throw new Error(`Failed to create pitch deck: ${createError.message}`);
        }
        responseData = { success: true, data: newDeckData };
        break;
        
      case 'update':
        // Update existing pitch deck
        const { data: updatedDeckData, error: updateError } = await supabase
          .from('pitch_decks')
          .update({ ...pitchDeckData, updated_at: new Date().toISOString() })
          .eq('id', pitchDeckId)
          .eq('created_by', user.id)
          .select('*')
          .single();
          
        if (updateError) throw new Error(`Failed to update pitch deck: ${updateError.message}`);
        responseData = { success: true, data: updatedDeckData };
        break;
        
      case 'delete':
        // Delete pitch deck
        const { error: deleteError } = await supabase
          .from('pitch_decks')
          .delete()
          .eq('id', pitchDeckId)
          .eq('created_by', user.id);
          
        if (deleteError) throw new Error(`Failed to delete pitch deck: ${deleteError.message}`);
        responseData = { success: true };
        break;
        
      case 'get':
        // Get single pitch deck
        const { data: deckData, error: getError } = await supabase
          .from('pitch_decks')
          .select('*')
          .eq('id', pitchDeckId)
          .eq('created_by', user.id)
          .single();
          
        if (getError) throw new Error(`Failed to get pitch deck: ${getError.message}`);
        responseData = { success: true, data: deckData };
        break;
        
      case 'list':
        // List all pitch decks for current user
        const { data: decksData, error: listError } = await supabase
          .from('pitch_decks')
          .select('*')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });
          
        if (listError) throw new Error(`Failed to list pitch decks: ${listError.message}`);
        responseData = { success: true, data: decksData };
        break;
        
      case 'search-leads':
        // Search for leads
        const { data: leadsData, error: searchError } = await supabase
          .from('leads')
          .select('id, first_name, last_name, email, phone1, mortgage_data, property_address')
          .eq('created_by', user.id)
          .eq('is_mortgage_lead', true)
          .or(`first_name.ilike.%${searchQuery}%, last_name.ilike.%${searchQuery}%, email.ilike.%${searchQuery}%`)
          .limit(10);
          
        if (searchError) throw new Error(`Failed to search leads: ${searchError.message}`);
        
        // Format leads for frontend display
        const formattedLeads = leadsData.map(lead => ({
          id: lead.id,
          firstName: lead.first_name || '',
          lastName: lead.last_name || '',
          email: lead.email || '',
          phone: lead.phone1 || '',
          propertyAddress: lead.property_address || '',
          mortgageData: lead.mortgage_data || {}
        }));
        
        responseData = { success: true, data: formattedLeads };
        break;
        
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in pitch-deck function: ${error.message}`);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
