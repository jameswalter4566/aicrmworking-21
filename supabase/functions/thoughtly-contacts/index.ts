import { serve } from 'https://deno.land/std@0.177.1/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, DELETE',
};

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Handle request
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse request body
    const { action, contacts, contactId } = await req.json();
    
    // Get environment variables
    const thoughtlyToken = Deno.env.get('THOUGHTLY_API_TOKEN');
    const thoughtlyTeamId = Deno.env.get('THOUGHTLY_TEAM_ID');
    
    if (!thoughtlyToken || !thoughtlyTeamId) {
      throw new Error('Missing required environment variables for Thoughtly API');
    }
    
    // Define headers for Thoughtly API requests
    const thoughtlyHeaders = {
      'Authorization': `Bearer ${thoughtlyToken}`,
      'Content-Type': 'application/json'
    };
    
    // Base URL for Thoughtly API
    const baseUrl = `https://api.thoughtly.ai/api/contacts/team/${thoughtlyTeamId}`;
    
    // Process based on action
    if (action === 'createContact') {
      if (!contacts) {
        throw new Error('Contacts are required for creation');
      }
      
      console.log('Creating contact(s) in Thoughtly');
      
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: thoughtlyHeaders,
        body: JSON.stringify(contacts)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error from Thoughtly API:', errorData);
        throw new Error(`Failed to create contact: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return new Response(
        JSON.stringify({
          success: true,
          data: data,
          message: 'Successfully created contact(s) in Thoughtly'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    else if (action === 'deleteContact') {
      if (!contactId) {
        throw new Error('Contact ID is required for deletion');
      }
      
      console.log(`Deleting contact ${contactId} from Thoughtly`);
      
      const deleteUrl = `${baseUrl}/${contactId}`;
      console.log('DELETE URL:', deleteUrl);
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: thoughtlyHeaders
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error from Thoughtly API:', errorData);
        throw new Error(`Failed to delete contact: ${response.status} ${response.statusText}`);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully deleted contact ${contactId}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    else {
      throw new Error(`Unknown action: ${action}`);
    }
    
  } catch (error) {
    console.error('Error in thoughtly-contacts function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
