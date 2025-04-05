
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Enhanced CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-token, team_id',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
}

console.log("Thoughtly Get Contacts function loaded and ready")

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

    // Extract query parameters from request body
    const body = await req.json().catch(() => ({}));
    const {
      search,
      phone_numbers_only,
      tags,
      excluded_tags,
      sort,
      sortDirection,
      page,
      limit = 20
    } = body;

    // Build query parameters
    const params = new URLSearchParams();
    
    if (search) params.append('search', search);
    if (phone_numbers_only !== undefined) params.append('phone_numbers_only', String(phone_numbers_only));
    if (tags && Array.isArray(tags)) {
      tags.forEach(tag => params.append('tags', tag));
    }
    if (excluded_tags && Array.isArray(excluded_tags)) {
      excluded_tags.forEach(tag => params.append('excluded_tags', tag));
    }
    if (sort) params.append('sort', sort);
    if (sortDirection) params.append('sortDirection', sortDirection);
    if (page !== undefined) params.append('page', String(page));
    if (limit !== undefined) params.append('limit', String(limit));

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const url = `${THOUGHTLY_API_URL}/contact${queryString}`;

    console.log(`Fetching contacts from Thoughtly API: ${url}`);
    console.log(`Using API token: ${THOUGHTLY_API_TOKEN}`);
    console.log(`Using team ID: ${THOUGHTLY_TEAM_ID}`);

    // Call the Thoughtly API with appropriate headers
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-token': THOUGHTLY_API_TOKEN,
        'team_id': THOUGHTLY_TEAM_ID,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log(`Got Thoughtly API response with status: ${response.status}`);
    
    if (response.status !== 200) {
      console.error('Error from Thoughtly API:', data);
      return new Response(
        JSON.stringify({
          success: false,
          error: data.error || 'Failed to get contacts from Thoughtly',
          details: data,
          status: response.status
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: data.data || [],
        count: data.data?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in getContacts function:', error);
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
