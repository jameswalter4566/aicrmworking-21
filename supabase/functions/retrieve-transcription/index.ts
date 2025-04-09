
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@twilio/twilio-verify@1.0.0";

// CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    
    if (!accountSid || !authToken) {
      throw new Error("Missing Twilio credentials");
    }

    const { action, callSid, transcriptionSid } = await req.json();
    
    if (!callSid && action !== 'simulate') {
      throw new Error("Missing callSid parameter");
    }
    
    // Create Twilio client
    const client = createClient(accountSid, authToken);
    
    // Process different actions
    switch (action) {
      case 'start':
        // Start a new real-time transcription
        const options = {
          track: 'both_tracks',
          partialResults: true,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true
        };
        
        try {
          const result = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}/Transcriptions.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(options)
          });
          
          if (!result.ok) {
            const errorText = await result.text();
            throw new Error(`Failed to start transcription: ${errorText}`);
          }
          
          const transcription = await result.json();
          return new Response(JSON.stringify({ success: true, data: transcription }), {
            headers: corsHeaders
          });
        } catch (error) {
          console.error("Error starting transcription:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: corsHeaders
          });
        }
      
      case 'stop':
        // Stop an existing transcription
        if (!transcriptionSid) {
          throw new Error("Missing transcriptionSid parameter");
        }
        
        try {
          const result = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}/Transcriptions/${transcriptionSid}.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ status: 'stopped' })
          });
          
          if (!result.ok) {
            const errorText = await result.text();
            throw new Error(`Failed to stop transcription: ${errorText}`);
          }
          
          const transcription = await result.json();
          return new Response(JSON.stringify({ success: true, data: transcription }), {
            headers: corsHeaders
          });
        } catch (error) {
          console.error("Error stopping transcription:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: corsHeaders
          });
        }
      
      case 'simulate':
        // Simulate transcription for testing or when real transcription is not available
        const mockTranscriptions = [
          { text: "Hello, I'm calling about your software solution.", speaker: "customer", timestamp: Date.now() },
          { text: "I'm not sure if the price point works for our budget right now.", speaker: "customer", timestamp: Date.now() + 5000 },
          { text: "We already use a competitor's product and switching seems complicated.", speaker: "customer", timestamp: Date.now() + 10000 },
          { text: "I understand your concern about the pricing. Many clients initially feel that way.", speaker: "agent", timestamp: Date.now() + 15000 },
          { text: "Our solution actually integrates seamlessly with your existing systems.", speaker: "agent", timestamp: Date.now() + 20000 },
          { text: "But I need to discuss this with my team before making any decisions.", speaker: "customer", timestamp: Date.now() + 25000 }
        ];
        
        return new Response(JSON.stringify({ 
          success: true, 
          data: {
            transcriptions: mockTranscriptions,
            simulation: true
          }
        }), { headers: corsHeaders });
      
      default:
        throw new Error("Invalid action specified");
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: corsHeaders
    });
  }
});
