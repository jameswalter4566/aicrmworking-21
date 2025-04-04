
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Enhanced CORS headers with broader support
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Max-Age': '86400',
}

console.log("Thoughtly Contacts function loaded and ready")

// Base Thoughtly API URL 
const THOUGHTLY_API_URL = "https://api.thoughtly.com"
const API_TOKEN = "8f6vq0cwvk59qwi63rcf1o" // Using the provided API token

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
    // Get Thoughtly Team ID from environment variables
    const THOUGHTLY_TEAM_ID = Deno.env.get('THOUGHTLY_TEAM_ID')

    // Check if required credentials are available
    if (!THOUGHTLY_TEAM_ID) {
      console.error("Missing Thoughtly Team ID")
      return new Response(
        JSON.stringify({ 
          error: 'Missing required Thoughtly Team ID',
          missingCredentials: 'Team ID'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Process the request based on the action
    const requestUrl = new URL(req.url)
    const action = req.method === 'GET' 
      ? 'getContacts' // If it's a GET request, assume it's for getting contacts
      : await req.json().then(data => data.action) // Otherwise extract action from body

    console.log(`Processing action: ${action}`)

    switch (action) {
      case 'createContact': {
        const { contacts } = await req.json()
        // Handle single contact creation
        if (!Array.isArray(contacts)) {
          return await createSingleContact(
            contacts, 
            API_TOKEN, 
            THOUGHTLY_TEAM_ID
          )
        }
        
        // Handle bulk contact creation
        return await createBulkContacts(
          contacts, 
          API_TOKEN, 
          THOUGHTLY_TEAM_ID
        )
      }

      case 'getContacts': {
        const searchParams = requestUrl.searchParams
        return await getContacts(
          searchParams,
          API_TOKEN,
          THOUGHTLY_TEAM_ID
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Thoughtly Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Function to create a single contact in Thoughtly
async function createSingleContact(contactData, apiToken, teamId) {
  console.log(`Creating single contact: ${contactData.firstName} ${contactData.lastName}`)
  
  try {
    console.log('API Token:', apiToken)
    console.log('Team ID:', teamId)
    
    const response = await fetch(`${THOUGHTLY_API_URL}/contact/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': apiToken,
        'team_id': teamId
      },
      body: JSON.stringify({
        phone_number: contactData.phone1 || contactData.phone || "",
        name: `${contactData.firstName || ""} ${contactData.lastName || ""}`.trim(),
        email: contactData.email || "",
        country_code: contactData.countryCode || "US",
        tags: contactData.tags || [],
        attributes: {
          ...contactData.attributes || {},
          source: "CRM Import",
          disposition: contactData.disposition || "Not Contacted",
          importDate: new Date().toISOString()
        }
      })
    })

    const data = await response.json()
    console.log('Response status:', response.status)
    console.log('Response data:', JSON.stringify(data))
    
    if (!response.ok) {
      console.error(`Error creating contact: ${JSON.stringify(data)}`)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create contact in Thoughtly', 
          details: data.error || 'Unknown error',
          status: response.status
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        contactId: data.data?.id || null,
        data: data.data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in createSingleContact:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create contact in Thoughtly', 
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// Function to create multiple contacts in Thoughtly
async function createBulkContacts(contacts, apiToken, teamId) {
  console.log(`Creating ${contacts.length} contacts in bulk`)
  console.log('Using API Token:', apiToken)
  console.log('Using Team ID:', teamId)
  
  const results = {
    success: [],
    errors: []
  }

  // Process each contact sequentially to avoid rate limits
  for (const contact of contacts) {
    try {
      const response = await fetch(`${THOUGHTLY_API_URL}/contact/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': apiToken,
          'team_id': teamId
        },
        body: JSON.stringify({
          phone_number: contact.phone1 || contact.phone || "",
          name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
          email: contact.email || "",
          country_code: contact.countryCode || "US",
          tags: contact.tags || [],
          attributes: {
            ...contact.attributes || {},
            source: "CRM Import",
            disposition: contact.disposition || "Not Contacted",
            importDate: new Date().toISOString(),
            id: contact.id || null
          }
        })
      })

      const data = await response.json()
      console.log(`Contact ${contact.firstName} ${contact.lastName} - status: ${response.status}`)
      
      if (!response.ok) {
        console.error(`Error creating contact: ${JSON.stringify(data)}`)
        results.errors.push({
          contact,
          error: data.error || 'Unknown error',
          status: response.status
        })
      } else {
        results.success.push({
          originalId: contact.id,
          thoughtlyId: data.data?.id || null,
          data: data.data
        })
      }
      
      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`Error creating contact ${contact.id}:`, error)
      results.errors.push({
        contact,
        error: error.message
      })
    }
  }

  return new Response(
    JSON.stringify({
      summary: {
        total: contacts.length,
        successful: results.success.length,
        failed: results.errors.length
      },
      results
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Function to get contacts from Thoughtly API
async function getContacts(searchParams, apiToken, teamId) {
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
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get contacts from Thoughtly', 
          details: data.error || 'Unknown error'
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully retrieved contacts from Thoughtly`)
    
    return new Response(
      JSON.stringify({
        success: true,
        data: data.data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in getContacts:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get contacts from Thoughtly API', 
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
