
// Follow Deno syntax
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { contactId } = await req.json();
    
    if (!contactId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Contact ID is required"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }
    
    // In a real implementation, this would fetch from a database
    // For now, generate some mock activities based on the contact ID
    
    const mockActivities = [
      {
        id: 1,
        contactId: contactId,
        type: "email",
        description: "Sent welcome email",
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        performer: "System"
      },
      {
        id: 2,
        contactId: contactId,
        type: "call",
        description: "Initial consultation call - 15 minutes",
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        performer: "Michelle Agent"
      },
      {
        id: 3,
        contactId: contactId,
        type: "email",
        description: "Sent property listings",
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        performer: "System"
      },
      {
        id: 4,
        contactId: contactId,
        type: "email_opened",
        description: "Opened property listings email",
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        performer: "Contact"
      },
      {
        id: 5,
        contactId: contactId,
        type: "call",
        description: "Follow-up call - 8 minutes",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        performer: "Michelle Agent"
      },
      {
        id: 6,
        contactId: contactId,
        type: "meeting",
        description: "Property viewing scheduled",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        performer: "System"
      }
    ];
    
    return new Response(
      JSON.stringify({
        success: true,
        activities: mockActivities
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to get activities"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
