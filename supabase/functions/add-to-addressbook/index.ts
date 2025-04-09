
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
    const { contacts, bookName } = await req.json();

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Valid contacts are required' }),
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
    
    console.log("Creating addressbook with endpoint:", apiEndpoint + "addaddressbook");

    // Create an addressbook with proper headers and error handling
    try {
      const addressbookResponse = await fetch(`${apiEndpoint}addaddressbook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          private_key: smsPrivateKey,
          public_key: smsPublicKey,
          name: bookName || `Campaign ${new Date().toISOString()}`
        })
      });

      // Log the status and text from the response for debugging
      console.log("Addressbook response status:", addressbookResponse.status);
      
      // If addressbook request fails, provide detailed error information
      if (!addressbookResponse.ok) {
        const errorText = await addressbookResponse.text();
        console.error("Error response text:", errorText);
        
        return new Response(
          JSON.stringify({ 
            error: `Failed to create address book: HTTP ${addressbookResponse.status}`,
            details: errorText
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const addressbookData = await addressbookResponse.json();
      console.log("Addressbook creation response:", JSON.stringify(addressbookData));
      
      if (addressbookData.result?.error) {
        console.error("Addressbook creation error:", addressbookData);
        return new Response(
          JSON.stringify({ 
            error: `Failed to create address book: ${addressbookData.result?.error || 'Unknown error'}` 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const addressbookId = addressbookData.result.addressbook_id;
      console.log("Successfully created addressbook with ID:", addressbookId);

      // Add contacts to addressbook with proper error handling
      const addContactPromises = contacts.map(async (contact) => {
        // Extract phone number from different possible formats
        const phoneNumber = contact.phone_number || contact.phone1 || contact.phoneNumber;
        
        // Extract name data from different possible formats
        const firstName = contact.firstName || 
                        (contact.attributes && contact.attributes.firstName) || 
                        '';
        
        const lastName = contact.lastName || 
                       (contact.attributes && contact.attributes.lastName) || 
                       '';
        
        if (!phoneNumber) return { success: false, error: 'No phone number' };

        try {
          console.log(`Adding phone: ${phoneNumber} to addressbook: ${addressbookId}`);
          
          const response = await fetch(`${apiEndpoint}addphone`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              private_key: smsPrivateKey,
              public_key: smsPublicKey,
              addressbook_id: addressbookId,
              phone: phoneNumber,
              variables: `${firstName};${lastName};`
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error adding phone ${phoneNumber}:`, errorText);
            return { success: false, error: `HTTP ${response.status}: ${errorText}` };
          }

          const data = await response.json();
          console.log(`Response for adding phone ${phoneNumber}:`, JSON.stringify(data));
          return data;
        } catch (error) {
          console.error(`Error adding phone ${phoneNumber}:`, error);
          return { success: false, error: error.message };
        }
      });

      const addContactResults = await Promise.all(addContactPromises);
      console.log("All add contact results:", JSON.stringify(addContactResults));
      
      const successfulContacts = addContactResults.filter(result => !result.result?.error).length;

      if (successfulContacts === 0) {
        return new Response(
          JSON.stringify({ error: 'Failed to add any contacts to the address book' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          addressbookId: addressbookId,
          contactsCount: successfulContacts,
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
    console.error("Error in add-to-addressbook function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
