
// Supabase Edge Function to send SMS using ValorSMS API
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contacts, message, campaignName } = await req.json();

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

    // Get API keys from environment variables
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

    // Create an addressbook for this campaign
    const addressbookName = `Campaign: ${campaignName || 'Unnamed'} - ${new Date().toISOString()}`;
    const addressbookResponse = await fetch(`${apiEndpoint}addaddressbook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        private_key: smsPrivateKey,
        public_key: smsPublicKey,
        name: addressbookName
      })
    });

    const addressbookData = await addressbookResponse.json();
    
    if (addressbookData.result.error) {
      console.error('Error creating addressbook:', addressbookData);
      throw new Error(`Failed to create addressbook: ${addressbookData.result.code}`);
    }

    const addressbookId = addressbookData.result.addressbook_id;
    console.log(`Created addressbook with ID: ${addressbookId}`);

    // Add contacts to the addressbook
    const addContactPromises = contacts.map(async (contact) => {
      const firstName = contact.firstName || contact.attributes?.firstName || '';
      const lastName = contact.lastName || contact.attributes?.lastName || '';
      const phoneNumber = contact.phone_number || contact.phone1 || '';

      if (!phoneNumber) return { success: false, error: 'No phone number' };

      try {
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
            variables: `${firstName};${lastName};`
          })
        });

        const data = await response.json();
        return {
          success: !data.result.error,
          phone: phoneNumber,
          result: data.result
        };
      } catch (error) {
        console.error(`Error adding phone ${phoneNumber}:`, error);
        return { success: false, phone: phoneNumber, error: error.message };
      }
    });

    const addContactResults = await Promise.all(addContactPromises);
    const successfulContacts = addContactResults.filter(result => result.success);

    if (successfulContacts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to add any contacts to address book' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
    
    if (balanceData.result.error) {
      console.error('Error checking balance:', balanceData);
      throw new Error(`Failed to check balance: ${balanceData.result.code}`);
    }

    const balance = parseFloat(balanceData.result.balance_currency);
    console.log(`Account balance: ${balance} ${balanceData.result.currency}`);

    // Check campaign price
    const priceResponse = await fetch(`${apiEndpoint}checkcampaignprice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        private_key: smsPrivateKey,
        public_key: smsPublicKey,
        sender: "ThoughtlyAI", // Default sender name, can be customized
        body: message,
        addressbook_id: addressbookId
      })
    });

    const priceData = await priceResponse.json();
    
    if (priceData.result.error) {
      console.error('Error checking campaign price:', priceData);
      throw new Error(`Failed to check campaign price: ${priceData.result.code}`);
    }

    const cost = parseFloat(priceData.result.price);
    console.log(`Campaign cost: ${cost}`);

    if (balance < cost) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance for SMS campaign', balance, cost }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create and send the SMS campaign
    const campaignResponse = await fetch(`${apiEndpoint}createcampaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        private_key: smsPrivateKey,
        public_key: smsPublicKey,
        sender: "ThoughtlyAI", // Default sender name, can be customized
        body: message,
        addressbook_id: addressbookId,
        date: "", // Send immediately
        run_at: 0,
        transliterate: 0,
        priority: 0,
        callback_url: "" // Optional callback URL for delivery status
      })
    });

    const campaignData = await campaignResponse.json();
    
    if (campaignData.result.error) {
      console.error('Error creating campaign:', campaignData);
      throw new Error(`Failed to create campaign: ${campaignData.result.code}`);
    }

    const campaignId = campaignData.result.id;
    console.log(`Created campaign with ID: ${campaignId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS campaign created successfully',
        campaignId,
        contactsCount: successfulContacts.length,
        addressbookId,
        balance: balance - cost,
        cost
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error sending SMS campaign:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
