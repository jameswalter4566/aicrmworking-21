
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import twilio from "npm:twilio@4.19.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  // Log request information for debugging
  console.log("Request method:", req.method);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));
  
  try {
    // Parse the request body
    const requestData = await req.json();
    console.log("Request body:", requestData);
    
    const { phoneNumber, leadId, agentId } = requestData;

    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    console.log(`Initiating Twilio call to ${phoneNumber} for lead ${leadId}`);

    // Get Twilio credentials from environment variables
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const apiKey = Deno.env.get("TWILIO_API_KEY");
    const apiSecret = Deno.env.get("TWILIO_API_SECRET");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    const twimlAppSid = Deno.env.get("TWILIO_TWIML_APP_SID");

    // Log environment variable status (not values) for debugging
    console.log("Environment variables check:", {
      accountSid: !!accountSid,
      apiKey: !!apiKey,
      apiSecret: !!apiSecret,
      twilioPhoneNumber: !!twilioPhoneNumber,
      twimlAppSid: !!twimlAppSid
    });

    if (!accountSid || !apiKey || !apiSecret) {
      throw new Error("Missing required Twilio credentials");
    }

    if (!twilioPhoneNumber) {
      throw new Error("Missing Twilio phone number");
    }

    // Initialize Twilio client with API Key authentication
    const client = twilio(apiKey, apiSecret, { accountSid });

    // Make the call using Twilio's API
    const call = await client.calls.create({
      to: phoneNumber, // The lead's phone number
      from: twilioPhoneNumber, // Your Twilio phone number
      twiml: `<Response><Say>Hello, this is a call from your CRM system. We are connecting you with an agent.</Say></Response>`,
      statusCallback: Deno.env.get("CALL_STATUS_WEBHOOK_URL") || "",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });

    console.log("Twilio call initiated:", call.sid);

    // Return a success response with the call details
    return new Response(
      JSON.stringify({
        success: true,
        callId: call.sid,
        leadId,
        status: call.status,
        message: `Started call to ${phoneNumber}`,
      }),
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("Error processing call request:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to initiate call",
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
