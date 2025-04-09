
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
const TWILIO_API_SECRET = Deno.env.get('TWILIO_API_SECRET');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { callSid, action } = await req.json();

    if (!callSid) {
      throw new Error("CallSid is required");
    }

    // Encode credentials for Basic Auth
    const authToken = btoa(`${TWILIO_API_KEY}:${TWILIO_API_SECRET}`);

    if (action === 'start') {
      // Start a new real-time transcription
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}/Transcriptions.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'Track': 'both_tracks',
            'PartialResults': 'true',
            'EnableAutomaticPunctuation': 'true',
          }).toString(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Twilio error starting transcription:", errorText);
        throw new Error(`Twilio API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Transcription started:", result);
      
      return new Response(JSON.stringify({ 
        success: true, 
        transcriptionSid: result.sid,
        status: result.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } 
    else if (action === 'stop') {
      const { transcriptionSid } = await req.json();
      
      if (!transcriptionSid) {
        throw new Error("TranscriptionSid is required to stop a transcription");
      }

      // Stop an existing real-time transcription
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}/Transcriptions/${transcriptionSid}.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'Status': 'stopped'
          }).toString(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Twilio error stopping transcription:", errorText);
        throw new Error(`Twilio API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Transcription stopped:", result);

      return new Response(JSON.stringify({
        success: true,
        status: result.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    else if (action === 'simulate') {
      // For testing purposes - simulate some transcription data
      const simulatedData = {
        type: 'transcription',
        callSid: callSid,
        tracks: [
          {
            label: "customer",
            content: "I'm not sure if this is worth the investment right now..."
          },
          {
            label: "agent", 
            content: "I understand your concern about the price."
          }
        ]
      };
      
      return new Response(JSON.stringify({
        success: true,
        transcriptionData: simulatedData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    throw new Error("Invalid action specified");
  } catch (error) {
    console.error("Error in retrieve-transcription function:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
