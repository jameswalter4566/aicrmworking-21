
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  try {
    const { headers, columnData } = await req.json();
    
    if (!headers || !columnData || headers.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid data. Please provide headers and column data." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare sample data for analysis
    const sampleData = [];
    for (let i = 0; i < Math.min(5, columnData.length); i++) {
      const row = {};
      headers.forEach((header, index) => {
        if (columnData[i] && columnData[i][index]) {
          row[header] = columnData[i][index];
        } else {
          row[header] = "";
        }
      });
      sampleData.push(row);
    }

    console.log("Sample data prepared:", JSON.stringify(sampleData).substring(0, 200) + "...");

    // Prepare the prompt for OpenAI
    const systemPrompt = `
      You are an expert at analyzing CSV data for lead management systems. 
      Analyze the provided sample data and map each column to the most appropriate field in our lead system.
      
      Available lead fields:
      - firstName: The person's first name
      - lastName: The person's last name  
      - email: Email address
      - mailingAddress: Primary mailing address
      - propertyAddress: Property address (real estate)
      - phone1: Primary phone number
      - phone2: Secondary phone number
      
      Return ONLY a JSON object with keys being our lead field names and values being the original column names from the data.
      The response must be valid JSON that can be parsed with JSON.parse().
      If you can't confidently map a column, don't include it.
    `;

    const userPrompt = `Here's the sample data to analyze: ${JSON.stringify(sampleData)}`;

    console.log("Calling OpenAI API...");
    
    // Call the OpenAI API
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error("OpenAI API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to analyze data with AI." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await openAIResponse.json();
    console.log("OpenAI API response received");
    
    // Debug log the response content
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      console.log("OpenAI response content:", data.choices[0].message.content);
    } else {
      console.error("Unexpected OpenAI response format:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Invalid response format from AI service." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    let mapping;
    
    try {
      // Extract the mapping from the OpenAI response
      const content = data.choices[0].message.content;
      
      // Try to find and extract just the JSON part if there's any text wrapping it
      let jsonContent = content;
      
      // Look for JSON content within markdown code blocks or text
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                        content.match(/\{[\s\S]*?\}/);
      
      if (jsonMatch) {
        jsonContent = jsonMatch[1] || jsonMatch[0];
      }
      
      console.log("Attempting to parse JSON:", jsonContent);
      mapping = JSON.parse(jsonContent);
      console.log("Successfully parsed mapping:", mapping);
    } catch (e) {
      console.error("Error parsing OpenAI response:", e, "Content:", data.choices[0].message.content);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse AI analysis results.", 
          details: e.message,
          rawContent: data.choices[0].message.content 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert the mapping to header indices
    const headerIndices = {};
    for (const [fieldName, headerName] of Object.entries(mapping)) {
      const index = headers.findIndex(h => 
        h.toLowerCase() === headerName.toLowerCase() || 
        headerName.toLowerCase().includes(h.toLowerCase())
      );
      
      if (index !== -1) {
        headerIndices[fieldName] = index;
      }
    }

    console.log("Final mapping indices:", headerIndices);

    return new Response(
      JSON.stringify({ 
        mapping: headerIndices,
        aiSuggestions: mapping 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-csv-data function:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
