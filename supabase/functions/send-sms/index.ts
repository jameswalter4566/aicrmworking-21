
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { addressbookId, message, campaignName } = await req.json();

    if (!addressbookId) {
      return new Response(
        JSON.stringify({ error: 'Address book ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const smsPrivateKey = Deno.env.get("VALORSMS_PRIVATE_KEY");
    const smsPublicKey = Deno.env.get("VALORSMS_PUBLIC_KEY");
    
    if (!smsPrivateKey || !smsPublicKey) {
      return new Response(
        JSON.stringify({ error: 'SMS API keys are not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const apiEndpoint = "https://api.valorsms.com/sms/";
    console.log("Using API Endpoint:", apiEndpoint);

    // Check account balance with proper error handling
    try {
      console.log("Checking account balance...");
      const balanceResponse = await fetch(`${apiEndpoint}userbalance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          private_key: smsPrivateKey,
          public_key: smsPublicKey
        })
      });

      if (!balanceResponse.ok) {
        const errorText = await balanceResponse.text();
        console.error("Balance check HTTP error:", balanceResponse.status, errorText);
        return new Response(
          JSON.stringify({ 
            error: `Failed to check account balance: HTTP ${balanceResponse.status}`,
            details: errorText
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const balanceData = await balanceResponse.json();
      console.log("Balance response:", JSON.stringify(balanceData));
      
      if (balanceData.result?.error) {
        console.error("Balance check error:", balanceData);
        return new Response(
          JSON.stringify({ error: 'Failed to check account balance' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Create and send SMS campaign with proper error handling
      console.log(`Creating campaign for addressbook: ${addressbookId}...`);
      const campaignResponse = await fetch(`${apiEndpoint}createcampaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          private_key: smsPrivateKey,
          public_key: smsPublicKey,
          sender: "ThoughtlyAI",
          body: message,
          addressbook_id: addressbookId,
          name: campaignName || `SMS Campaign ${new Date().toISOString()}`,
          date: "",
          run_at: 0,
          transliterate: 0,
          priority: 0
        })
      });

      if (!campaignResponse.ok) {
        const errorText = await campaignResponse.text();
        console.error("Campaign creation HTTP error:", campaignResponse.status, errorText);
        return new Response(
          JSON.stringify({ 
            error: `Failed to create SMS campaign: HTTP ${campaignResponse.status}`,
            details: errorText
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const campaignData = await campaignResponse.json();
      console.log("Campaign response:", JSON.stringify(campaignData));
      
      if (campaignData.result?.error) {
        console.error("Campaign creation error:", campaignData);
        return new Response(
          JSON.stringify({ error: 'Failed to create SMS campaign' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          campaignId: campaignData.result.id,
          contactsCount: campaignData.result.phones_count || 0,
          balance: balanceData.result.balance_currency,
          currency: balanceData.result.currency
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Network error when connecting to ValorSMS API',
          details: fetchError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error("Error in SMS function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
