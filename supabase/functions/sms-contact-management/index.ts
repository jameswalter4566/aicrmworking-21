
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
    const { 
      action, 
      listID, 
      number, 
      name,
      resubscribe = false
    } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required (add, unsubscribe, getContacts)' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!listID) {
      return new Response(
        JSON.stringify({ error: 'Contact list ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if ((action === 'add' || action === 'unsubscribe') && !number) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required for add/unsubscribe actions' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const smsApiKey = Deno.env.get("SMS_API_KEY");
    const smsServerUrl = Deno.env.get("SMS_SERVER_URL");
    
    if (!smsApiKey || !smsServerUrl) {
      return new Response(
        JSON.stringify({ error: 'SMS API credentials are not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Prepare the base request payload
    const payload: Record<string, any> = {
      key: smsApiKey,
      listID
    };

    // Add action-specific parameters
    switch (action) {
      case 'add':
        payload.number = number;
        payload.name = name || '';
        payload.resubscribe = resubscribe ? '1' : '0';
        break;
      case 'unsubscribe':
        payload.number = number;
        payload.unsubscribe = '1';
        break;
      case 'getContacts':
        // No additional parameters needed for getContacts
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Must be add, unsubscribe, or getContacts' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

    console.log(`SMS Contact action: ${action} for list: ${listID}`);

    try {
      const endpoint = action === 'getContacts' 
        ? 'read-contacts.php' 
        : 'manage-contacts.php';

      const response = await fetch(`${smsServerUrl}/services/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(
          Object.entries(payload)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)])
        ).toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("SMS API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ 
            error: `SMS Gateway API error: ${response.status}`,
            details: errorText
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const responseData = await response.json();
      console.log(`SMS API response for ${action} action received`);

      if (!responseData.success) {
        return new Response(
          JSON.stringify({ 
            error: `Failed to perform ${action} action`, 
            details: responseData.error?.message || 'Unknown error'
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Return appropriate data based on action
      let resultData;
      if (action === 'getContacts') {
        resultData = {
          success: true,
          contacts: responseData.data.contacts,
          count: responseData.data.contacts?.length || 0,
        };
      } else {
        resultData = {
          success: true,
          contact: responseData.data.contact,
        };
      }

      return new Response(
        JSON.stringify(resultData),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Network error when connecting to SMS Gateway API',
          details: fetchError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error("Error in SMS contact management function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
