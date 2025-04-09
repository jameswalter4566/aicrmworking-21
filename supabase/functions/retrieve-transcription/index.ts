
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionResponse {
  account_sid: string;
  call_sid: string;
  sid: string;
  name: string | null;
  status: string;
  date_updated: string;
  uri: string;
}

interface TranscriptionRequest {
  action: 'start' | 'stop' | 'status' | 'simulate';
  callSid: string;
  transcriptionSid?: string;
  options?: {
    track?: 'inbound_track' | 'outbound_track' | 'both_tracks';
    partialResults?: boolean;
    languageCode?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Ensure we have auth credentials
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return new Response(
      JSON.stringify({ 
        error: "Missing Twilio credentials. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables." 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const requestData: TranscriptionRequest = await req.json();
    
    if (requestData.action === 'simulate') {
      // Return mock transcription data for simulation/testing
      return simulateTranscription(requestData.callSid);
    }

    // Authorization for Twilio API
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    if (requestData.action === 'start') {
      // Start real-time transcription
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${requestData.callSid}/Transcriptions.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            Track: requestData.options?.track || 'both_tracks',
            PartialResults: (requestData.options?.partialResults === true).toString(),
            LanguageCode: requestData.options?.languageCode || 'en-US'
          }).toString()
        }
      );
      
      const data = await response.json();
      
      return new Response(
        JSON.stringify({ success: true, transcription: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (requestData.action === 'stop' && requestData.transcriptionSid) {
      // Stop real-time transcription
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${requestData.callSid}/Transcriptions/${requestData.transcriptionSid}.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            Status: 'stopped'
          }).toString()
        }
      );
      
      const data = await response.json();
      
      return new Response(
        JSON.stringify({ success: true, transcription: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (requestData.action === 'status') {
      // Get transcription status (this is simplified - in production, you'd need to implement 
      // a webhook to receive real-time transcription results)
      return simulateTranscription(requestData.callSid);
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid action specified" }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Function to simulate transcription for development/testing
function simulateTranscription(callSid: string) {
  const mockTranscripts = [
    { speaker: "Customer", text: "I'm not convinced this is worth the investment right now." },
    { speaker: "Customer", text: "We have budget constraints this quarter." },
    { speaker: "Agent", text: "I understand your concern about the price. Let me explain the ROI." },
    { speaker: "Customer", text: "How long would it take to see results?" },
    { speaker: "Customer", text: "And how difficult is it to integrate with our current systems?" },
    { speaker: "Agent", text: "Our implementation team will handle the entire process." },
    { speaker: "Customer", text: "I need to discuss this with my team first." },
    { speaker: "Agent", text: "I completely understand. When would be a good time for a follow-up?" }
  ];
  
  // Select a random subset of the transcript to simulate progression
  const currentTime = new Date().getTime();
  const callTimeHash = parseInt(callSid.substring(0, 8), 16) || currentTime;
  const transcriptProgress = Math.min(
    mockTranscripts.length,
    Math.floor((currentTime - callTimeHash) / 5000) + 1
  );
  
  const currentTranscript = mockTranscripts.slice(0, transcriptProgress);
  
  const transcriptionSid = `GT${callSid.substring(2)}`;
  
  const response: TranscriptionResponse = {
    account_sid: TWILIO_ACCOUNT_SID || "AC00000000000000000000000000000000",
    call_sid: callSid,
    sid: transcriptionSid,
    name: "SimulatedTranscription",
    status: transcriptProgress < mockTranscripts.length ? "in-progress" : "completed",
    date_updated: new Date().toUTCString(),
    uri: `/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}/Transcriptions/${transcriptionSid}.json`
  };
  
  return new Response(
    JSON.stringify({
      success: true,
      transcription: response,
      transcript: currentTranscript,
      progress: transcriptProgress,
      total: mockTranscripts.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
