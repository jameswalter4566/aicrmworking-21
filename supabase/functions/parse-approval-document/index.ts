
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

// Create a supabase admin client with the service role key for bypassing RLS
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
    // Parse the request body
    const { emailId, attachmentId, userId } = await req.json();
    
    if (!emailId || !attachmentId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters. Please provide emailId and attachmentId.',
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
          error: 'OpenAI API key not configured.',
          code: 'MISSING_API_KEY'
        }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }
    
    console.log(`Processing attachment ${attachmentId} from email ${emailId}`);

    // Get the user's Google email connection
    let connectionQuery = supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('provider', 'google');
      
    if (userId) {
      console.log(`Looking for email connection for user ${userId}`);
      connectionQuery = connectionQuery.eq('user_id', userId);
    }
    
    const { data: connection, error: connectionError } = await connectionQuery.limit(1).single();

    if (connectionError || !connection) {
      console.error('No Google email connection found:', connectionError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No Google email connection found',
          code: 'NO_EMAIL_CONNECTION',
          details: 'Please connect your Google account in the Settings page'
        }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      );
    }

    // Refresh the token before proceeding
    if (!connection.refresh_token) {
      console.error("No refresh token available");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Email connection refresh token not available',
          code: 'REFRESH_TOKEN_MISSING',
          message: 'Please reconnect your Gmail account in the Settings page with the proper scopes'
        }),
        { 
          status: 401, 
          headers: corsHeaders 
        }
      );
    }
    
    // Refresh the token
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
    
    const refreshData = await refreshResponse.json();
    
    if (refreshResponse.status !== 200) {
      console.error('Token refresh error:', refreshResponse.status, refreshData);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to refresh access token', 
          details: refreshData,
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Please reconnect your Gmail account in the Settings page'
        }),
        { 
          status: 401, 
          headers: corsHeaders 
        }
      );
    }
    
    console.log("Access token refreshed successfully");
    const accessToken = refreshData.access_token;
    
    // Update the stored token
    await supabaseAdmin
      .from('user_email_connections')
      .update({ 
        access_token: accessToken,
        expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
      })
      .eq('id', connection.id);

    // Download the attachment
    const attachmentResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/attachments/${attachmentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!attachmentResponse.ok) {
      const errorText = await attachmentResponse.text();
      console.error('Gmail API attachment error:', attachmentResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Gmail API attachment error (${attachmentResponse.status})`, 
          details: errorText,
          code: 'GMAIL_API_ERROR'
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
          error: 'Attachment data not found', 
          code: 'ATTACHMENT_EMPTY'
        }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      );
    }
    
    // Decode base64 data
    const decodedData = atob(attachmentData.data.replace(/-/g, '+').replace(/_/g, '/'));
    
    // For PDF parsing we would typically use a PDF parsing library
    // Since we're using OpenAI to extract the conditions from the text content
    // We'll send a simplified prompt with base64 data (if supported) or just key details
    
    console.log("Sending document to OpenAI for parsing");
    
    // Use OpenAI to extract conditions
    const openaiPrompt = `
    Parse the following mortgage approval document for loan conditions:
    
    Below is a base64-encoded PDF from a mortgage approval letter. Please extract all conditions from this document and format them as follows:
    
    1. Extract all conditions mentioned in the document
    2. Categorize them as:
       - Master Conditions
       - General Conditions
       - Prior to Final Conditions
       - Compliance Conditions
    
    For each condition, provide:
    - Description: The full text of the condition
    - Status: "pending" (default value)
    - Category: Which category it belongs to
    
    Return the data as a JSON object with this structure:
    {
      "masterConditions": [
        { "description": "condition text", "status": "pending" }
      ],
      "generalConditions": [
        { "description": "condition text", "status": "pending" }
      ],
      "priorToFinalConditions": [
        { "description": "condition text", "status": "pending" }
      ],
      "complianceConditions": [
        { "description": "condition text", "status": "pending" }
      ]
    }
    
    If you can't find conditions in a specific category, return an empty array for that category.
    If the document doesn't appear to be a mortgage approval document, please indicate this in your response.
    `;
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant specialized in parsing mortgage approval documents and extracting loan conditions.'
          },
          {
            role: 'user',
            content: openaiPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    });
    
    if (!openaiResponse.ok) {
      const openaiError = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, openaiError);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `OpenAI API error (${openaiResponse.status})`, 
          details: openaiError,
          code: 'OPENAI_API_ERROR'
        }),
        { 
          status: 502, 
          headers: corsHeaders 
        }
      );
    }
    
    const openaiData = await openaiResponse.json();
    const parsedContent = openaiData.choices[0].message.content;
    
    console.log("Successfully parsed conditions from document");
    
    // Extract JSON from the response
    let conditions;
    try {
      // Find JSON in the response (it might be wrapped in markdown code blocks)
      const jsonMatch = parsedContent.match(/```json\n([\s\S]*?)\n```/) || 
                       parsedContent.match(/```\n([\s\S]*?)\n```/) || 
                       parsedContent.match(/{[\s\S]*?}/);
      
      const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json\n|```\n|```/g, '') : parsedContent;
      conditions = JSON.parse(jsonStr);
      
      // Validate expected structure
      if (!conditions.masterConditions && !conditions.generalConditions && 
          !conditions.priorToFinalConditions && !conditions.complianceConditions) {
        // Try to fix common variations in key naming
        const fixedConditions = {
          masterConditions: conditions.masterConditions || conditions.master || conditions['Master Conditions'] || [],
          generalConditions: conditions.generalConditions || conditions.general || conditions['General Conditions'] || [],
          priorToFinalConditions: conditions.priorToFinalConditions || conditions.priorToFinal || 
                                 conditions['Prior to Final Conditions'] || conditions['Prior To Final'] || [],
          complianceConditions: conditions.complianceConditions || conditions.compliance || 
                               conditions['Compliance Conditions'] || []
        };
        conditions = fixedConditions;
      }
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to parse conditions from OpenAI response', 
          details: error.message,
          rawResponse: parsedContent,
          code: 'PARSING_ERROR'
        }),
        { 
          status: 422, 
          headers: corsHeaders 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        conditions,
        rawResponse: parsedContent
      }),
      { headers: corsHeaders }
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
