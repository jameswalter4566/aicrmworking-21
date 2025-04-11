
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const { messageId, attachmentId, userId } = await req.json();
    
    if (!messageId || !attachmentId || !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters',
          code: 'MISSING_PARAMS'
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OpenAI API key not configured',
          code: 'MISSING_API_KEY'
        }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }
    
    console.log(`Processing attachment ${attachmentId} from message ${messageId}`);

    // First get the user's Google email connection
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('provider', 'google')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (connectionError || !connection) {
      console.error('No Google email connection found:', connectionError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No Google email connection found',
          code: 'NO_EMAIL_CONNECTION'
        }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      );
    }

    // Refresh the access token
    if (!connection.refresh_token) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Email connection refresh token not available',
          code: 'REFRESH_TOKEN_MISSING'
        }),
        { 
          status: 401, 
          headers: corsHeaders 
        }
      );
    }
    
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token'
      })
    });
    
    if (!refreshResponse.ok) {
      const refreshError = await refreshResponse.text();
      console.error('Token refresh error:', refreshResponse.status, refreshError);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to refresh access token', 
          details: refreshError,
          code: 'TOKEN_REFRESH_FAILED'
        }),
        { 
          status: 401, 
          headers: corsHeaders 
        }
      );
    }
    
    const refreshData = await refreshResponse.json();
    const accessToken = refreshData.access_token;
    
    // Update the stored token
    await supabaseAdmin
      .from('user_email_connections')
      .update({ 
        access_token: accessToken,
        expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
      })
      .eq('id', connection.id);
    
    // Download the attachment from Gmail
    const attachmentResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!attachmentResponse.ok) {
      const errorText = await attachmentResponse.text();
      console.error('Failed to download attachment:', attachmentResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Gmail API attachment fetch error', 
          details: errorText,
          code: 'GMAIL_ATTACHMENT_ERROR'
        }),
        { 
          status: 502, 
          headers: corsHeaders 
        }
      );
    }

    const attachmentData = await attachmentResponse.json();
    
    if (!attachmentData.data) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Attachment data is empty', 
          code: 'EMPTY_ATTACHMENT'
        }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      );
    }

    // Convert base64 data to text (basic approach for PDF content extraction)
    // This is simplified - for real PDF parsing you might need a dedicated library
    // or external service
    const base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/');
    
    // Send to OpenAI for parsing
    console.log("Sending PDF content to OpenAI for extraction and parsing");
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a mortgage document analyst specializing in extracting loan conditions from approval letters. 
                     Extract and categorize all conditions from the document into the following categories:
                     - Master Conditions (usually must be met for all loans)
                     - General Conditions (specific to this loan)
                     - Prior to Final Conditions (must be met before final approval)
                     - Compliance Conditions (regulatory requirements)
                     
                     Format your response as a JSON object with these categories as keys.
                     Each condition should include: 
                     - description (the full text of the condition)
                     - status (always set this to "pending")
                     
                     Example format:
                     {
                       "masterConditions": [
                         {"description": "Verification of employment", "status": "pending"}
                       ],
                       "generalConditions": [
                         {"description": "Verification of funds for down payment", "status": "pending"}
                       ],
                       "priorToFinalConditions": [
                         {"description": "Clear title report", "status": "pending"}
                       ],
                       "complianceConditions": [
                         {"description": "Signed disclosure forms", "status": "pending"}
                       ]
                     }
                     
                     If a category has no conditions, return an empty array for that category.
                     Focus only on loan conditions - do not include other information.`
          },
          {
            role: "user",
            content: `Here is the content of a mortgage approval letter in base64 format. Extract all conditions and categorize them according to the instructions: ${base64Data.substring(0, 100000)}`
          }
        ],
        temperature: 0.2,
      })
    });

    if (!openAIResponse.ok) {
      const openAIError = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, openAIError);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to parse document with OpenAI', 
          details: openAIError,
          code: 'OPENAI_API_ERROR'
        }),
        { 
          status: 502, 
          headers: corsHeaders 
        }
      );
    }

    const openAIResult = await openAIResponse.json();
    let parsedConditions = {};
    
    try {
      // Extract the JSON from the OpenAI response
      const content = openAIResult.choices[0].message.content;
      
      // Parse the conditions
      if (content.includes('{') && content.includes('}')) {
        // Extract JSON part if there's surrounding text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedConditions = JSON.parse(jsonMatch[0]);
        } else {
          parsedConditions = JSON.parse(content);
        }
      } else {
        // If OpenAI didn't return JSON
        console.error("OpenAI didn't return valid JSON");
        parsedConditions = {
          masterConditions: [],
          generalConditions: [],
          priorToFinalConditions: [],
          complianceConditions: []
        };
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response as JSON:', parseError);
      console.log('Raw OpenAI response:', openAIResult.choices[0].message.content);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to parse OpenAI response', 
          details: parseError.message,
          code: 'JSON_PARSE_ERROR'
        }),
        { 
          status: 422, 
          headers: corsHeaders 
        }
      );
    }
    
    console.log("Successfully extracted conditions from approval document");
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        conditions: parsedConditions 
      }),
      { 
        headers: corsHeaders 
      }
    );
  } catch (error) {
    console.error('Error in parse-approval-document function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to parse approval document', 
        details: error.message,
        code: 'UNEXPECTED_ERROR'
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});
