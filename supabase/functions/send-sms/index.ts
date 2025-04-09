
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contacts, message } = await req.json();

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Valid contacts are required' }),
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
    const apiEndpoint = "http://api.valorsms.com/sms/";

    if (!smsPrivateKey || !smsPublicKey) {
      return new Response(
        JSON.stringify({ error: 'SMS API keys are not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create an addressbook
    const addressbookResponse = await fetch(`${apiEndpoint}addaddressbook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        private_key: smsPrivateKey,
        public_key: smsPublicKey,
        name: `Campaign ${new Date().toISOString()}`
      })
    });

    const addressbookData = await addressbookResponse.json();
    
    if (addressbookData.result.error) {
      return new Response(
        JSON.stringify({ error: 'Failed to create address book' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const addressbookId = addressbookData.result.addressbook_id;

    // Add contacts to addressbook
    const addContactPromises = contacts.map(async (contact) => {
      const phoneNumber = contact.phone1 || contact.phone_number;
      
      if (!phoneNumber) return { success: false, error: 'No phone number' };

      const response = await fetch(`${apiEndpoint}addphone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          private_key: smsPrivateKey,
          public_key: smsPublicKey,
          addressbook_id: addressbookId,
          phone: phoneNumber,
          variables: `${contact.firstName || ''};${contact.lastName || ''};`
        })
      });

      return response.json();
    });

    const addContactResults = await Promise.all(addContactPromises);

    // Check account balance
    const balanceResponse = await fetch(`${apiEndpoint}userbalance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        private_key: smsPrivateKey,
        public_key: smsPublicKey
      })
    });

    const balanceData = await balanceResponse.json();
    
    // Create and send SMS campaign
    const campaignResponse = await fetch(`${apiEndpoint}createcampaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        private_key: smsPrivateKey,
        public_key: smsPublicKey,
        sender: "ThoughtlyAI",
        body: message,
        addressbook_id: addressbookId,
        date: "",
        run_at: 0,
        transliterate: 0,
        priority: 0
      })
    });

    const campaignData = await campaignResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        campaignId: campaignData.result.id,
        contactsCount: contacts.length,
        balance: balanceData.result.balance_currency
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
