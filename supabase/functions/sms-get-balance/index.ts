
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createTwilioClient } from "../_shared/twilio-sms.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] SMS Get Balance invoked`);

    // With Twilio, there's no specific API for getting balance
    // Instead, we'll provide account details including the current account balance
    
    // Create Twilio client
    const twilioClient = await createTwilioClient();
    if (!twilioClient) {
      throw new Error("Failed to initialize Twilio client");
    }
    
    // Get account details
    const account = await twilioClient.api.accounts(Deno.env.get("TWILIO_ACCOUNT_SID")).fetch();
    
    // Format response
    const response = {
      accountSid: account.sid,
      accountName: account.friendlyName,
      accountStatus: account.status,
      accountType: account.type,
      balance: account.balance || "Unknown", // Balance in $ as a string
      currency: "USD",
      createdAt: account.dateCreated,
      lastUpdated: account.dateUpdated,
      owner: account.ownerAccountSid,
      // Some additional properties for historical compatibility
      units: "credits",
      unlimited: false,
      provider: "twilio",
      requestId
    };
    
    console.log(`[${requestId}] Retrieved account details for Twilio account`);
    
    return new Response(
      JSON.stringify({
        success: true,
        balance: response,
        requestId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error getting SMS balance:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
