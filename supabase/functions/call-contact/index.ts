
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Hard-coded Thoughtly API credentials
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
    const { contactId, interviewId, metadata } = await req.json();
    
    if (!contactId) {
      return new Response(
        JSON.stringify({ success: false, error: "Contact ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Initiating call to contact: ${contactId} with interview: ${interviewId}`);
    
    // Call the contact using Thoughtly API
    const callResult = await callThoughtlyContact(contactId, interviewId, metadata);
    
    return new Response(
      JSON.stringify({
        success: true,
        contactId,
        callResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in call-contact function:', error);
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
        interview_id: interviewId || "interview_demo_123",
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
