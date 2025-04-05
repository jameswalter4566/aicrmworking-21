
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

// Fixed API credentials - hardcoded for now as requested
const THOUGHTLY_API_TOKEN = "8f6vq0cwvk59qwi63rcf1o"
const THOUGHTLY_TEAM_ID = "aa7e6d5e-35b5-491a-9111-18790d37612f"

// Utility function to format phone numbers according to Thoughtly requirements
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return "";
  
  // For now just return the phone number as is, with any formatting intact
  // This is because the example showed a formatted phone number: "(714)2449021"
  return phoneNumber;
}

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

    // Process the request based on the action
    const requestUrl = new URL(req.url)
    
    // Clone the request to safely parse the body once
    const reqClone = req.clone();
    
    let action;
    if (req.method === 'GET') {
      action = 'getContacts'; // If it's a GET request, assume it's for getting contacts
    } else {
      // For POST requests, parse the body to get the action
      const body = await reqClone.json();
      action = body.action;
      console.log(`Processing POST action: ${action}`, body);
    }

    switch (action) {
      case 'createContact': {
        const body = await req.json(); // Safe to read the body now
        const { contacts } = body;
        
        console.log(`createContact action with contacts:`, 
                   Array.isArray(contacts) ? `${contacts.length} contacts` : '1 contact');
        
        // Handle single contact creation
        if (!Array.isArray(contacts)) {
          return await createSingleContact(
            contacts, 
            THOUGHTLY_API_TOKEN, 
            THOUGHTLY_TEAM_ID
          )
        }
        
        // Handle bulk contact creation
        return await createBulkContacts(
          contacts, 
          THOUGHTLY_API_TOKEN, 
          THOUGHTLY_TEAM_ID
        )
      }

      case 'getContacts': {
        const body = await req.json();
        // Extract searchParams string from the request body
        const searchParamsString = body.searchParams || '';
        const searchParams = new URLSearchParams(searchParamsString);
        
        return await getContacts(
          searchParams,
          THOUGHTLY_API_TOKEN,
          THOUGHTLY_TEAM_ID
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Thoughtly Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Function to create a single contact in Thoughtly
async function createSingleContact(contactData, apiToken, teamId) {
  console.log(`Creating single contact: ${contactData.firstName} ${contactData.lastName}`);
  
  try {
    // Format phone number according to example
    const phone = contactData.phone1 || contactData.phone || "";
    
    if (!phone) {
      console.error('Error: Missing phone number for contact', contactData);
      return new Response(
        JSON.stringify({ 
          error: 'Missing phone number', 
          contact: contactData 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a payload following the example format
    const payload = {
      phone_number: phone,
    };
    
    // Only add optional fields if they exist
    if (contactData.firstName || contactData.lastName) {
      payload.name = `${contactData.firstName || ""} ${contactData.lastName || ""}`.trim();
    }
    
    if (contactData.email) {
      payload.email = contactData.email;
    }
    
    if (contactData.countryCode) {
      payload.country_code = contactData.countryCode;
    }
    
    if (Array.isArray(contactData.tags) && contactData.tags.length > 0) {
      payload.tags = [...new Set(contactData.tags)];
    }
    
    // Collect all attributes into a single object
    const attributes = {
      ...(contactData.attributes || {}),
      source: "CRM Import",
      disposition: contactData.disposition || "Not Contacted",
      importDate: new Date().toISOString(),
    };
    
    // Add ID as string if it exists
    if (contactData.id !== undefined) {
      attributes.id = String(contactData.id);
    }
    
    // Store first and last name separately in attributes
    if (contactData.firstName) {
      attributes.firstName = contactData.firstName;
    }
    
    if (contactData.lastName) {
      attributes.lastName = contactData.lastName;
    }
    
    // Add attributes to payload if we have any
    if (Object.keys(attributes).length > 0) {
      payload.attributes = attributes;
    }
    
    console.log(`Sending payload to Thoughtly:`, payload);
    
    // Use the exact header structure from the example
    const options = {
      method: 'POST',
      headers: {
        'x-api-token': apiToken,
        'team_id': teamId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    };
    
    console.log(`Request options:`, options);
    
    // Make the request to Thoughtly API
    const response = await fetch(`${THOUGHTLY_API_URL}/contact/create`, options);
    const data = await response.json();
    
    console.log(`Thoughtly API response:`, data);
    
    if (response.status !== 200) {
      console.error(`Error creating contact: ${JSON.stringify(data)}`);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create contact in Thoughtly', 
          details: data.error || 'Unknown error',
          status: response.status,
          contactData: payload
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        contactId: data.data?.id || null,
        data: data.data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in createSingleContact:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create contact in Thoughtly', 
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Function to create multiple contacts in Thoughtly
async function createBulkContacts(contacts, apiToken, teamId) {
  console.log(`Creating ${contacts.length} contacts in bulk`);
  
  const results = {
    success: [],
    errors: []
  };

  // Process each contact sequentially to avoid rate limits
  for (const contact of contacts) {
    try {
      // Get phone number
      const phone = contact.phone1 || contact.phone || "";
      
      if (!phone) {
        console.error('Error: Missing phone number for contact', contact);
        results.errors.push({
          contact,
          error: 'Missing phone number'
        });
        continue;
      }
      
      // Create a payload following the example format
      const payload = {
        phone_number: phone,
      };
      
      // Only add optional fields if they exist
      if (contact.firstName || contact.lastName) {
        payload.name = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
      }
      
      if (contact.email) {
        payload.email = contact.email;
      }
      
      if (contact.countryCode) {
        payload.country_code = contact.countryCode;
      }
      
      if (Array.isArray(contact.tags) && contact.tags.length > 0) {
        payload.tags = [...new Set(contact.tags)];
      }
      
      // Collect all attributes into a single object
      const attributes = {
        ...(contact.attributes || {}),
        source: "CRM Import",
        disposition: contact.disposition || "Not Contacted",
        importDate: new Date().toISOString()
      };
      
      // Add ID as string if it exists
      if (contact.id !== undefined) {
        attributes.id = String(contact.id);
      }
      
      // Store first and last name separately in attributes
      if (contact.firstName) {
        attributes.firstName = contact.firstName;
      }
      
      if (contact.lastName) {
        attributes.lastName = contact.lastName;
      }
      
      // Add attributes to payload if we have any
      if (Object.keys(attributes).length > 0) {
        payload.attributes = attributes;
      }
      
      console.log(`Sending payload for ${contact.firstName} ${contact.lastName}:`, payload);
      
      // Use the exact header structure from the example
      const options = {
        method: 'POST',
        headers: {
          'x-api-token': apiToken,
          'team_id': teamId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      };
      
      // Make the request to Thoughtly API
      const response = await fetch(`${THOUGHTLY_API_URL}/contact/create`, options);
      const data = await response.json();
      
      if (response.status !== 200) {
        console.error(`Error creating contact: ${JSON.stringify(data)}`);
        results.errors.push({
          contact,
          error: data.error || 'Unknown error',
          status: response.status
        });
      } else {
        results.success.push({
          originalId: contact.id,
          thoughtlyId: data.data?.id || null,
          data: data.data
        });
      }
      
      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error creating contact ${contact.id}:`, error);
      results.errors.push({
        contact,
        error: error.message
      });
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
  );
}

// Function to get contacts from Thoughtly API
async function getContacts(searchParams, apiToken, teamId) {
  console.log("Getting contacts from Thoughtly API");
  
  // Build query string from searchParams if any
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  
  try {
    // Use the exact header structure from the example
    const options = {
      method: 'GET',
      headers: {
        'x-api-token': apiToken,
        'team_id': teamId,
        'Content-Type': 'application/json'
      }
    };
    
    const response = await fetch(`${THOUGHTLY_API_URL}/contact${queryString}`, options);
    const data = await response.json();
    
    if (response.status !== 200) {
      console.error(`Error getting contacts: ${JSON.stringify(data)}`);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get contacts from Thoughtly', 
          details: data.error || 'Unknown error'
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully retrieved contacts from Thoughtly`);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: data.data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in getContacts:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get contacts from Thoughtly API', 
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
