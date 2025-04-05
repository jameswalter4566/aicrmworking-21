
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Enhanced CORS headers with broader support
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
}

console.log("Thoughtly Get Contacts function loaded and ready")

// Base Thoughtly API URL 
const THOUGHTLY_API_URL = "https://api.thoughtly.com"

// Fixed API credentials
const THOUGHTLY_API_TOKEN = Deno.env.get("THOUGHTLY_API_TOKEN") || "8f6vq0cwvk59qwi63rcf1o"
const THOUGHTLY_TEAM_ID = Deno.env.get("THOUGHTLY_TEAM_ID") || "aa7e6d5e-35b5-491a-9111-18790d37612f"

serve(async (req) => {
  console.log(`Received ${req.method} request to ${req.url}`)
  
  // Handle preflight requests properly (critical for browser CORS)
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

    // Get query parameters from the request
    let searchParams = new URLSearchParams()
    
    if (req.method === 'GET') {
      // For GET requests, extract query params from URL
      const url = new URL(req.url)
      searchParams = url.searchParams
    } else {
      // For POST requests, extract params from the body
      const body = await req.json()
      
      if (body.searchParams) {
        // If searchParams is provided as a string, parse it
        if (typeof body.searchParams === 'string') {
          searchParams = new URLSearchParams(body.searchParams)
        } 
        // If searchParams is provided as an object, convert it to URLSearchParams
        else if (typeof body.searchParams === 'object') {
          Object.entries(body.searchParams).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(item => searchParams.append(key, String(item)))
            } else {
              searchParams.append(key, String(value))
            }
          })
        }
      }
    }
    
    // Set default limit if not provided
    if (!searchParams.has('limit')) {
      searchParams.append('limit', '50')
    }
    
    // Set phone_numbers_only to true if not provided
    if (!searchParams.has('phone_numbers_only')) {
      searchParams.append('phone_numbers_only', 'true')
    }
    
    // Add query string to URL if there are parameters
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : ''
    const url = `${THOUGHTLY_API_URL}/contact${queryString}`
    
    console.log(`Fetching contacts from Thoughtly API: ${url}`)
    
    // Make the request to Thoughtly API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-token': THOUGHTLY_API_TOKEN,
        'team_id': THOUGHTLY_TEAM_ID,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    console.log(`Thoughtly API response status: ${response.status}`)
    
    if (response.status !== 200) {
      console.error(`Error getting contacts: ${JSON.stringify(data)}`)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get contacts from Thoughtly', 
          details: data.error || 'Unknown error'
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully retrieved ${data.data?.length || 0} contacts from Thoughtly`)
    
    return new Response(
      JSON.stringify({
        success: true,
        data: data.data || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in thoughtly-get-contacts:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get contacts from Thoughtly API', 
        details: error.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
