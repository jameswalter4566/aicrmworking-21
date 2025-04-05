
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Enhanced CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
}

console.log("Thoughtly Call Contacts function loaded and ready")

// Base Thoughtly API URL 
const THOUGHTLY_API_URL = "https://api.thoughtly.com"

// Retrieve API credentials from environment variables
const THOUGHTLY_API_TOKEN = Deno.env.get("THOUGHTLY_API_TOKEN") || "8f6vq0cwvk59qwi63rcf1o";
const THOUGHTLY_TEAM_ID = Deno.env.get("THOUGHTLY_TEAM_ID") || "aa7e6d5e-35b5-491a-9111-18790d37612f";

serve(async (req) => {
  console.log(`Received ${req.method} request to ${req.url}`)
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request")
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    // Check if required credentials are available
    if (!THOUGHTLY_API_TOKEN || !THOUGHTLY_TEAM_ID) {
      console.error("Missing Thoughtly API credentials")
      return new Response(
        JSON.stringify({ 
          error: 'Missing required Thoughtly API credentials',
          missingCredentials: !THOUGHTLY_API_TOKEN ? 'API Token' : 'Team ID'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { contacts, interview_id, metadata = {} } = await req.json();

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No contacts to call',
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!interview_id) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required parameter: interview_id',
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Initiating calls for ${contacts.length} contacts using interview_id: ${interview_id}`);

    const results = {
      success: [],
      errors: []
    };

    // Process each contact call sequentially to avoid rate limits
    for (const contact of contacts) {
      try {
        const contact_id = contact.id || contact.contact_id;
        
        if (!contact_id) {
          console.error('Missing contact_id for contact:', contact);
          results.errors.push({
            contact,
            error: 'Missing contact_id'
          });
          continue;
        }
        
        console.log(`Calling contact ${contact_id}`);
        
        const callPayload = {
          contact_id,
          interview_id,
          metadata
        };
        
        // Use the exact header structure from the example
        const options = {
          method: 'POST',
          headers: {
            'x-api-token': THOUGHTLY_API_TOKEN,
            'team_id': THOUGHTLY_TEAM_ID,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(callPayload)
        };
        
        // Make the request to Thoughtly API
        const response = await fetch(`${THOUGHTLY_API_URL}/contact/call`, options);
        const data = await response.json();
        
        if (response.status !== 200) {
          console.error(`Error calling contact ${contact_id}:`, data);
          results.errors.push({
            contact_id,
            error: data.error || 'Unknown error',
            status: response.status,
            details: data
          });
        } else {
          console.log(`Successfully initiated call for contact ${contact_id}`);
          results.success.push({
            contact_id,
            callId: data.data?.id || null,
            data: data.data
          });
        }
        
        // Add a small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error calling contact:`, error);
        results.errors.push({
          contact: contact.id || contact.contact_id,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: results.success.length > 0,
        summary: {
          total: contacts.length,
          successful: results.success.length,
          failed: results.errors.length
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in callContacts function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
