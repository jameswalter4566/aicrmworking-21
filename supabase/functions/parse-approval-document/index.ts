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
    console.log('---------------------------------------------');
    console.log('🔍 STARTED: parse-approval-document function');
    
    // Parse the request body
    const { emailId, attachmentId, userId, fileUrl, fileData, leadId } = await req.json();
    
    console.log(`📝 Parameters received:`, {
      emailId,
      attachmentId,
      userId,
      leadId,
      fileUrl: fileUrl ? "Provided" : "Not provided",
      fileData: fileData ? "Provided" : "Not provided"
    });
    
    if ((!emailId || !attachmentId) && !fileUrl && !fileData) {
      console.log('❌ ERROR: Missing required parameters');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters. Please provide emailId and attachmentId, or fileUrl, or fileData.',
          code: 'MISSING_PARAMS'
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }
    
    if (!OPENAI_API_KEY) {
      console.log('❌ ERROR: OpenAI API key not configured');
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

    let pdfContent;
    
    // If fileData is provided (base64 encoded PDF)
    if (fileData) {
      console.log("💾 Using provided file data");
      pdfContent = fileData;
    }
    // If fileUrl is provided
    else if (fileUrl) {
      console.log(`🔍 Downloading PDF from provided URL: ${fileUrl}`);
      try {
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          console.error(`❌ Failed to download file: ${fileResponse.status} ${fileResponse.statusText}`);
          throw new Error(`Failed to download file from URL: ${fileResponse.statusText}`);
        }
        
        const contentType = fileResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/pdf')) {
          const arrayBuffer = await fileResponse.arrayBuffer();
          // Convert to base64
          pdfContent = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          console.log(`📄 PDF downloaded successfully (${arrayBuffer.byteLength} bytes)`);
        } else {
          console.error(`❌ Downloaded file is not a PDF: ${contentType}`);
          throw new Error(`The provided URL does not point to a PDF file: ${contentType}`);
        }
      } catch (error) {
        console.error(`❌ Error downloading file from URL: ${error}`);
        throw new Error(`Error downloading file from URL: ${error.message || error}`);
      }
    }
    // Otherwise, get from email
    else {
      console.log(`🔍 Processing attachment ${attachmentId} from email ${emailId}`);

      // Get the user's Google email connection
      let connectionQuery = supabaseAdmin
        .from('user_email_connections')
        .select('*')
        .eq('provider', 'google');
        
      if (userId) {
        console.log(`👤 Looking for email connection for user ${userId}`);
        connectionQuery = connectionQuery.eq('user_id', userId);
      } else {
        console.log('⚠️ WARNING: No userId provided, using first available Google connection');
      }
      
      const { data: connection, error: connectionError } = await connectionQuery.limit(1).single();

      if (connectionError) {
        console.error('❌ No Google email connection found:', connectionError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'No Google email connection found',
            code: 'NO_EMAIL_CONNECTION',
            details: 'Please connect your Google account in the Settings page',
            supabaseError: connectionError
          }),
          { 
            status: 404, 
            headers: corsHeaders 
          }
        );
      }

      if (!connection) {
        console.error('❌ No Google email connection found (connection is null)');
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
        console.error("❌ No refresh token available for email connection");
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
      
      console.log("🔄 Refreshing Google access token...");
      
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
      
      if (!refreshResponse.ok) {
        const refreshError = await refreshResponse.text();
        console.error(`❌ Token refresh error (${refreshResponse.status}):`, refreshError);
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to refresh access token', 
            details: refreshError,
            code: 'TOKEN_REFRESH_FAILED',
            message: 'Please reconnect your Gmail account in the Settings page'
          }),
          { 
            status: 401, 
            headers: corsHeaders 
          }
        );
      }
      
      const refreshData = await refreshResponse.json();
      console.log("✅ Access token refreshed successfully");
      const accessToken = refreshData.access_token;
      
      // Update the stored token
      console.log("💾 Updating stored token in database...");
      const updateResult = await supabaseAdmin
        .from('user_email_connections')
        .update({ 
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        })
        .eq('id', connection.id);
        
      if (updateResult.error) {
        console.warn("⚠️ Failed to update stored token, but continuing with attachment download:", updateResult.error);
      } else {
        console.log("✅ Token updated in database");
      }

      // Download the attachment
      console.log(`📥 Downloading attachment from Gmail API: ${emailId}/${attachmentId}`);
      const attachmentUrl = `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/attachments/${attachmentId}`;
      console.log(`🌐 Sending request to: ${attachmentUrl}`);
      
      const attachmentResponse = await fetch(attachmentUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!attachmentResponse.ok) {
        const errorText = await attachmentResponse.text();
        console.error(`❌ Gmail API attachment error (${attachmentResponse.status}):`, errorText);
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Gmail API attachment error (${attachmentResponse.status})`, 
            details: errorText,
            code: 'GMAIL_API_ERROR',
            requestUrl: attachmentUrl
          }),
          { 
            status: 502, 
            headers: corsHeaders 
          }
        );
      }
      
      const attachmentData = await attachmentResponse.json();
      console.log(`✅ Attachment data received: ${attachmentData.size} bytes`);
      
      if (!attachmentData.data) {
        console.error('❌ Attachment data is empty or missing');
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
      
      // Use the actual attachment data
      pdfContent = attachmentData.data;
    }

    // Now send the actual PDF to OpenAI for analysis
    console.log("🤖 Preparing OpenAI API request with PDF content...");
    
    const openaiPrompt = `
    I'll be providing you with a PDF document containing a mortgage approval letter with conditions. Please extract all conditions from this document and format them as follows:
    
    1. Extract all conditions mentioned in the document
    2. Categorize them as:
       - masterConditions - Critical conditions that must be met
       - generalConditions - Standard conditions that apply to most loans
       - priorToFinalConditions - Conditions that must be satisfied before final approval
       - complianceConditions - Regulatory and legal compliance requirements
    
    For each condition, provide:
    - id: A unique identifier (e.g., "MC001" for master conditions, "GC001" for general conditions, etc.)
    - text: The full text of the condition exactly as written in the document
    - status: Default to "no_action" for all conditions
    - category: Which category it belongs to
    - originalText: The complete original text as well
    
    Return the data as a JSON object with this structure:
    {
      "masterConditions": [
        { "id": "MC001", "text": "condition text", "status": "no_action", "category": "masterConditions", "originalText": "condition text" }
      ],
      "generalConditions": [
        { "id": "GC001", "text": "condition text", "status": "no_action", "category": "generalConditions", "originalText": "condition text" }
      ],
      "priorToFinalConditions": [
        { "id": "PF001", "text": "condition text", "status": "no_action", "category": "priorToFinalConditions", "originalText": "condition text" }
      ],
      "complianceConditions": [
        { "id": "CC001", "text": "condition text", "status": "no_action", "category": "complianceConditions", "originalText": "condition text" }
      ]
    }
    `;
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant specialized in parsing mortgage approval documents and extracting loan conditions. You will always respond with valid, well-formatted JSON only.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: openaiPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfContent}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    });
    
    if (!openaiResponse.ok) {
      const openaiError = await openaiResponse.text();
      console.error(`❌ OpenAI API error (${openaiResponse.status}):`, openaiError);
      
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
    
    console.log('✅ Received response from OpenAI');
    const openaiData = await openaiResponse.json();
    const parsedContent = openaiData.choices[0].message.content;
    
    console.log(`📝 Successfully received parsed content from OpenAI (${parsedContent.length} characters)`);
    
    // Extract JSON from the response
    let conditions;
    try {
      console.log('🔄 Parsing JSON from OpenAI response...');
      conditions = JSON.parse(parsedContent);
      
      console.log('✅ Successfully parsed JSON. Found conditions:');
      console.log(`- Master Conditions: ${conditions.masterConditions?.length || 0}`);
      console.log(`- General Conditions: ${conditions.generalConditions?.length || 0}`);
      console.log(`- Prior to Final Conditions: ${conditions.priorToFinalConditions?.length || 0}`);
      console.log(`- Compliance Conditions: ${conditions.complianceConditions?.length || 0}`);
      
      // Validate expected structure
      if (!conditions.masterConditions && !conditions.generalConditions && 
          !conditions.priorToFinalConditions && !conditions.complianceConditions) {
        console.log('⚠️ JSON does not have expected structure, attempting to fix common variations');
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
        
        console.log('✅ Fixed condition structure with counts:');
        console.log(`- Master Conditions: ${conditions.masterConditions?.length || 0}`);
        console.log(`- General Conditions: ${conditions.generalConditions?.length || 0}`);
        console.log(`- Prior to Final Conditions: ${conditions.priorToFinalConditions?.length || 0}`);
        console.log(`- Compliance Conditions: ${conditions.complianceConditions?.length || 0}`);
      }
      
      // If we have a leadId, save the results to the database
      if (leadId) {
        console.log(`💾 Saving conditions to database for lead ID ${leadId}`);
        const { data, error } = await supabaseAdmin
          .from('loan_conditions')
          .upsert({
            lead_id: leadId,
            conditions_data: conditions,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'lead_id'
          });
          
        if (error) {
          console.error("❌ Error saving conditions to database:", error);
        } else {
          console.log("✅ Conditions saved successfully to database");
        }
      }
      
    } catch (error) {
      console.error("❌ Error parsing OpenAI response:", error);
      console.error("Raw OpenAI response:", parsedContent);
      
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
    
    console.log('✅ COMPLETED: parse-approval-document function');
    return new Response(
      JSON.stringify({ 
        success: true,
        conditions,
        rawResponse: parsedContent
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error in parse-approval-document function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to parse approval document', 
        details: error.message,
        stack: error.stack,
        code: 'UNEXPECTED_ERROR'
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});
