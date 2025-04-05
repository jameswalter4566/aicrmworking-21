
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Enhanced CORS headers with broader support
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
}

console.log("Thoughtly Call Contact function loaded and ready")

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

    // Get the request body
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const body = await req.json()
    
    if (!body.contact_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: contact_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!body.interview_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: interview_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`Calling contact ${body.contact_id} using interview ${body.interview_id}`)
    
    // Prepare the payload for the Thoughtly API
    const payload = {
      contact_id: body.contact_id,
      interview_id: body.interview_id
    }
    
    // Add metadata if provided
    if (body.metadata) {
      payload.metadata = body.metadata
    }
    
    // Make the request to Thoughtly API
    const response = await fetch(`${THOUGHTLY_API_URL}/contact/call`, {
      method: 'POST',
      headers: {
        'x-api-token': THOUGHTLY_API_TOKEN,
        'team_id': THOUGHTLY_TEAM_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    const data = await response.json()
    
    console.log(`Thoughtly API call response status: ${response.status}`)
    
    if (response.status !== 200) {
      console.error(`Error calling contact: ${JSON.stringify(data)}`)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to call contact in Thoughtly', 
          details: data.error || 'Unknown error',
          status: response.status
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully initiated call to contact ${body.contact_id}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        data: data.data || {}
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in thoughtly-call-contact:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to call contact through Thoughtly API', 
        details: error.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
