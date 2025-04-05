
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Hard-coded Thoughtly API credentials since environment variables aren't working
// These should match what was provided in the API documentation
const THOUGHTLY_API_TOKEN = "8f6vq0cwvk59qwi63rcf1o";
const THOUGHTLY_TEAM_ID = "aa7e6d5e-35b5-491a-9111-18790d37612f";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-token, team_id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log the API credentials to confirm they're being used
    console.log(`Using Thoughtly API Token: ${THOUGHTLY_API_TOKEN ? '✓ Present' : '✗ Missing'}`);
    console.log(`Using Thoughtly Team ID: ${THOUGHTLY_TEAM_ID ? '✓ Present' : '✗ Missing'}`);

    const { leadIds, interviewId, lineCount = 1 } = await req.json();
    console.log(`Starting AI dialing session for leads: ${leadIds}, interview: ${interviewId}, lines: ${lineCount}`);

    // Step 1: Get all contacts from Thoughtly
    const contacts = await getThoughtlyContacts({
      phone_numbers_only: true,
      limit: 50
    });
    
    console.log(`Retrieved ${contacts.length} contacts from Thoughtly`);

    // If leadIds are provided, filter to only those leads
    const contactsToCall = leadIds && leadIds.length > 0
      ? contacts.filter(contact => leadIds.includes(contact.id))
      : contacts;
      
    console.log(`Filtered down to ${contactsToCall.length} contacts to call`);

    // Step 2: Start calling the contacts
    const callResults = [];
    const maxConcurrentCalls = Math.min(Number(lineCount), 3); // Maximum 3 lines
    
    // Take the first batch based on line count
    const initialBatch = contactsToCall.slice(0, maxConcurrentCalls);
    
    for (const contact of initialBatch) {
      try {
        console.log(`Initiating call to contact: ${contact.id}`);
        const callResult = await callThoughtlyContact(contact.id, interviewId);
        callResults.push({
          contactId: contact.id,
          status: 'initiated',
          result: callResult
        });
      } catch (callError) {
        console.error(`Error calling contact ${contact.id}:`, callError);
        callResults.push({
          contactId: contact.id,
          status: 'failed',
          error: callError.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        contacts: contactsToCall,
        callResults: callResults,
        queuedContacts: contactsToCall.slice(maxConcurrentCalls),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in start-dialing function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Get contacts from Thoughtly API
 */
async function getThoughtlyContacts(params: {
  search?: string;
  phone_numbers_only?: boolean;
  tags?: string[];
  excluded_tags?: string[];
  sort?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(item => queryParams.append(key, String(item)));
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
    }
    
    const url = `https://api.thoughtly.com/contact${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    console.log(`Fetching contacts from: ${url}`);
    
    // Use the hard-coded API credentials
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-token': THOUGHTLY_API_TOKEN,
        'team_id': THOUGHTLY_TEAM_ID,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Thoughtly API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data?.contacts || [];
  } catch (error) {
    console.error('Error getting contacts from Thoughtly:', error);
    throw error;
  }
}

/**
 * Call a contact through Thoughtly's API
 */
async function callThoughtlyContact(contactId: string, interviewId: string, metadata?: Record<string, any>) {
  try {
    console.log(`Calling contact ${contactId} with interview ${interviewId}`);
    
    // Use the hard-coded API credentials
    const response = await fetch('https://api.thoughtly.com/contact/call', {
      method: 'POST',
      headers: {
        'x-api-token': THOUGHTLY_API_TOKEN,
        'team_id': THOUGHTLY_TEAM_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact_id: contactId,
        interview_id: interviewId,
        metadata: metadata || {}
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Thoughtly call API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data || {};
  } catch (error) {
    console.error(`Error calling Thoughtly contact ${contactId}:`, error);
    throw error;
  }
}
