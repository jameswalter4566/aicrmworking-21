
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Enhanced CORS headers with broader support
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
}

console.log("Retrieve Leads function loaded and ready")

// Base Thoughtly API URL 
const THOUGHTLY_API_URL = "https://api.thoughtly.com"
const THOUGHTLY_API_TOKEN = Deno.env.get("THOUGHTLY_API_TOKEN")
const THOUGHTLY_TEAM_ID = Deno.env.get("THOUGHTLY_TEAM_ID")

// Main serve function to handle requests
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

    // Process GET requests for leads
    const requestUrl = new URL(req.url)
    const searchParams = requestUrl.searchParams
    
    console.log("Retrieving all leads from available sources")
    
    // Fetch leads from Thoughtly
    const thoughtlyLeads = await getThoughtlyContacts(searchParams, THOUGHTLY_API_TOKEN, THOUGHTLY_TEAM_ID)
    
    // TODO: In the future, we could add more lead sources here and merge them
    
    return new Response(
      JSON.stringify(thoughtlyLeads),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Retrieve Leads Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Function to get contacts from Thoughtly API - reusing logic from thoughtly-contacts
async function getThoughtlyContacts(searchParams, apiToken, teamId) {
  console.log("Getting contacts from Thoughtly API")
  
  // Build query string from searchParams if any
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : ''
  
  try {
    const response = await fetch(`${THOUGHTLY_API_URL}/contact${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': apiToken,
        'team_id': teamId
      }
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error(`Error getting contacts: ${JSON.stringify(data)}`)
      return {
        success: false, 
        error: 'Failed to get contacts from Thoughtly', 
        details: data.error || 'Unknown error'
      }
    }

    console.log(`Successfully retrieved contacts from Thoughtly`)
    
    return {
      success: true,
      data: data.data
    }
  } catch (error) {
    console.error('Error in getThoughtlyContacts:', error)
    return { 
      success: false,
      error: 'Failed to get contacts from Thoughtly API', 
      details: error.message
    }
  }
}
