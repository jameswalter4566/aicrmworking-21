import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Notify lead-connected function when call status changes
async function notifyLeadConnected(leadId: string, callSid: string, status: string, transcription?: any) {
  try {
    console.log(`Webhook: Notifying lead-connected for lead: ${leadId}, status: ${status}`);
    
    // Map Twilio call status to more UI-friendly call states
    const callState = status === 'in-progress' ? 'connected' : 
                      status === 'completed' || status === 'busy' || 
                      status === 'no-answer' || status === 'failed' || 
                      status === 'canceled' ? 'disconnected' :
                      status === 'ringing' || status === 'queued' ? 'dialing' : 'unknown';
    
    const payload: any = { 
      leadId,
      callData: {
        callSid,
        status,
        timestamp: new Date().toISOString(),
        callState
      }
    };
    
    // Add transcription data if available
    if (transcription) {
      payload.transcription = transcription;
    }
    
    await supabase.functions.invoke('lead-connected', { body: payload });
  } catch (err) {
    console.error('Error notifying lead-connected from webhook:', err);
  }
}

// Process transcription data from Twilio
async function processTranscription(formData: FormData, callId: string, leadId: string, callSid: string) {
  try {
    const transcriptionText = formData.get('TranscriptionText')?.toString();
    const transcriptionStatus = formData.get('TranscriptionStatus')?.toString();
    const transcriptionSid = formData.get('TranscriptionSid')?.toString();
    
    if (!transcriptionText) {
      console.log('No transcription text available');
      return;
    }
    
    console.log(`Received transcription for call ${callId}: ${transcriptionText}`);
    
    const transcription = {
      segment_text: transcriptionText,
      is_final: transcriptionStatus === 'completed',
      confidence: parseFloat(formData.get('Confidence')?.toString() || '0.8'),
      speaker: formData.get('From')?.toString() || 'Unknown',
      timestamp: new Date().toISOString(),
      call_sid: callSid
    };
    
    // Forward the transcription to lead-connected
    await notifyLeadConnected(leadId, callSid, 'transcription', transcription);
    
  } catch (error) {
    console.error('Error processing transcription:', error);
  }
}

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get callId from URL parameters
    const url = new URL(req.url);
    const callId = url.searchParams.get('callId');
    
    if (!callId) {
      throw new Error('Call ID is required');
    }
    
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const callStatus = formData.get('CallStatus')?.toString();
    const callSid = formData.get('CallSid')?.toString();
    const callDuration = formData.get('CallDuration')?.toString();
    const errorCode = formData.get('ErrorCode')?.toString();
    const errorMessage = formData.get('ErrorMessage')?.toString();
    
    // Check if this is a transcription event
    const isTranscription = formData.has('TranscriptionText') || formData.has('TranscriptionSid');
    
    console.log(`Webhook received for call ${callId} with status: ${callStatus} ${isTranscription ? '(includes transcription)' : ''}`);
    if (errorCode || errorMessage) {
      console.log(`Error information: Code=${errorCode}, Message=${errorMessage}`);
    }
    
    // Get the call record
    const { data: call, error: callError } = await supabase
      .from('predictive_dialer_calls')
      .select('*, contact:contact_id(*), agent:agent_id(*)')
      .eq('id', callId)
      .single();
      
    if (callError || !call) {
      throw new Error(`Call not found: ${callError?.message}`);
    }
    
    // If we have a contact_id and this is a transcription, process it
    if (call.contact_id && callSid && isTranscription) {
      await processTranscription(formData, callId, call.contact_id, callSid);
    }
    // Otherwise, if we have a contact_id and callSid, notify the lead-connected function
    else if (call.contact_id && callSid) {
      await notifyLeadConnected(call.contact_id, callSid, callStatus || 'unknown');
    }
    
    // Update call status based on Twilio webhook
    switch(callStatus) {
      case 'completed':
      case 'busy':
      case 'no-answer':
      case 'failed':
      case 'canceled':
        // Call ended, update the record
        await supabase
          .from('predictive_dialer_calls')
          .update({
            status: 'completed',
            end_timestamp: new Date().toISOString(),
            duration: callDuration ? parseInt(callDuration) : null,
            // Store error information if available
            error_code: errorCode,
            error_message: errorMessage
          })
          .eq('id', callId);
          
        // If there was an agent assigned, update their status
        if (call.agent_id) {
          await supabase
            .from('predictive_dialer_agents')
            .update({
              status: 'available',
              current_call_id: null
            })
            .eq('id', call.agent_id);
        }
        
        // Update contact status if needed
        if (call.contact_id) {
          let contactStatus = 'contacted';
          
          if (callStatus === 'no-answer') {
            contactStatus = 'no_answer';
          } else if (callStatus === 'busy' || callStatus === 'failed') {
            contactStatus = 'not_contacted'; // Could retry later
          }
          
          await supabase
            .from('predictive_dialer_contacts')
            .update({
              status: contactStatus,
              last_call_timestamp: new Date().toISOString()
            })
            .eq('id', call.contact_id);
        }
        
        // Remove from queue if it was there
        await supabase
          .from('predictive_dialer_call_queue')
          .delete()
          .eq('call_id', callId);
          
        break;
        
      case 'in-progress':
        // Call is connected
        await supabase
          .from('predictive_dialer_calls')
          .update({
            status: 'in_progress'
          })
          .eq('id', callId);
        break;
        
      default:
        // For other statuses (ringing, queued, etc.), log and update
        console.log(`Received status update: ${callStatus} for call ${callId}`);
        
        await supabase
          .from('predictive_dialer_calls')
          .update({
            status: callStatus || call.status
          })
          .eq('id', callId);
    }
    
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in predictive-dialer-webhook function:', error);
    
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200, // Return 200 even for errors to avoid Twilio retries
    });
  }
});
