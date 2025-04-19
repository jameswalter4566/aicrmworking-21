
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Create a supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "OpenAI API key not configured",
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Parse request body
    const { emailContent, clientLastName, loanNumber } = await req.json();

    if (!emailContent || emailContent.trim() === '') {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email content is empty",
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Processing email content (${emailContent.length} chars) for ${clientLastName}, loan #${loanNumber}`);

    // Use OpenAI to analyze the email content and extract loan conditions
    const prompt = `
You are an AI assistant specialized in analyzing mortgage approval emails and extracting loan conditions.

TASK:
Analyze the provided email content carefully and extract ALL loan conditions, categorizing them into the following groups:
1. "masterConditions" - The most important conditions that must be met
2. "generalConditions" - Standard or common conditions
3. "priorToFinalConditions" - Conditions that must be met before final approval
4. "complianceConditions" - Conditions related to regulatory compliance

FORMAT:
- For each condition, extract the exact text as written in the email
- Create JSON with these fields for each condition:
  - "text": The full condition text
  - "status": Always set to "pending"

RESPONSE FORMAT:
Return ONLY a JSON object with these arrays:
{
  "masterConditions": [
    {"text": "condition text", "status": "pending", "id": "unique-id-1"},
  ],
  "generalConditions": [
    {"text": "condition text", "status": "pending", "id": "unique-id-2"},
  ],
  "priorToFinalConditions": [
    {"text": "condition text", "status": "pending", "id": "unique-id-3"},
  ],
  "complianceConditions": [
    {"text": "condition text", "status": "pending", "id": "unique-id-4"},
  ]
}

EMAIL CONTENT:
${emailContent}

INSTRUCTIONS:
- If no conditions are found in a particular category, provide an empty array for that category
- Generate a unique random ID string for each condition
- Focus on extracting ONLY what appear to be actual loan conditions
- Do not invent or assume conditions that aren't clearly present in the email
- Include all text of the condition exactly as it appears in the email
    `;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a specialized AI for parsing mortgage approval emails.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error("OpenAI API error:", error);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to analyze email content",
          details: error
        }),
        { 
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const parsedContent = openaiData.choices[0].message.content;
    
    try {
      // Parse the JSON response
      const conditions = JSON.parse(parsedContent);
      
      // Check if the response has the expected structure
      const hasExpectedStructure = 
        conditions.masterConditions && Array.isArray(conditions.masterConditions) &&
        conditions.generalConditions && Array.isArray(conditions.generalConditions) &&
        conditions.priorToFinalConditions && Array.isArray(conditions.priorToFinalConditions) &&
        conditions.complianceConditions && Array.isArray(conditions.complianceConditions);
      
      if (!hasExpectedStructure) {
        throw new Error("Response does not have the expected structure");
      }
      
      // Count total conditions found
      const totalCount = 
        conditions.masterConditions.length +
        conditions.generalConditions.length +
        conditions.priorToFinalConditions.length +
        conditions.complianceConditions.length;
      
      console.log(`Successfully extracted ${totalCount} loan conditions`);
      
      return new Response(
        JSON.stringify({
          success: true,
          conditions,
          message: `Successfully extracted ${totalCount} loan conditions`
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      console.error("Raw response:", parsedContent);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to parse conditions from the email",
          details: error.message,
          rawResponse: parsedContent
        }),
        { 
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Error in parse-underwriting-email:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Server error",
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
