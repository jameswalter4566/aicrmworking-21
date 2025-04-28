
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Twilio } from 'https://esm.sh/twilio@4.18.1';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Twilio client for API fallback
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const twilioClient = twilioAccountSid && twilioAuthToken 
  ? new Twilio(twilioAccountSid, twilioAuthToken)
  : null;

// Check if a call has recordings and fetch transcriptions
async function fetchTranscriptionsForCall(callSid: string): Promise<any[]> {
  if (!twilioClient) return [];
  
  try {
    console.log(`Attempting to fetch recordings for call ${callSid}`);
    
    // First get the recordings for this call
    const recordings = await twilioClient.recordings.list({callSid});
    console.log(`Found ${recordings.length} recordings for call ${callSid}`);
    
    if (recordings.length === 0) return [];
    
    // For each recording, fetch its transcriptions
    const transcriptions = [];
    for (const recording of recordings) {
      console.log(`Fetching transcriptions for recording ${recording.sid}`);
      const recordingTranscriptions = await twilioClient.transcriptions.list({
        recordingSid: recording.sid
      });
      
      console.log(`Found ${recordingTranscriptions.length} transcriptions for recording ${recording.sid}`);
      
      for (const transcription of recordingTranscriptions) {
        // Fetch the actual transcription text
        const transcriptionResource = await twilioClient.transcriptions(transcription.sid).fetch();
        
        // Add to our list with all details
        transcriptions.push({
          transcriptionSid: transcription.sid,
          recordingSid: recording.sid,
          status: transcription.status,
          text: transcriptionResource.transcriptionText || '',
          duration: recording.duration,
          created: transcription.dateCreated,
          uri: transcription.uri
        });
      }
    }
    
    return transcriptions;
  } catch (error) {
    console.error(`Error fetching transcriptions via API for call ${callSid}:`, error);
    return [];
  }
}

// Notify lead-connected function when call status changes
async function notifyLeadConnected(leadId: string, callSid: string, status: string, originalLeadId?: string, transcription?: any) {
  try {
    console.log(`Dialer Webhook: Notifying lead-connected for lead: ${leadId}, originalLeadId: ${originalLeadId}, status: ${status}`);
    
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
        originalLeadId: originalLeadId || leadId,
        callState
      }
    };
    
    // Add transcription data if available
    if (transcription) {
      payload.transcription = transcription;
    }
    
    await supabase.functions.invoke('lead-connected', {
      body: payload
    });
  } catch (err) {
    console.error('Error notifying lead-connected from dialer webhook:', err);
  }
}

// Process transcription data from Twilio
async function processTranscription(formData: FormData, callId: string, leadId: string, callSid: string, originalLeadId?: string) {
  try {
    const transcriptionText = formData.get('TranscriptionText')?.toString();
    const transcriptionStatus = formData.get('TranscriptionStatus')?.toString();
    const transcriptionSid = formData.get('TranscriptionSid')?.toString();
    const recordingSid = formData.get('RecordingSid')?.toString();
    
    console.log(`Received transcription for call ${callId}: SID=${transcriptionSid}, RecordingSid=${recordingSid}`);
    console.log(`Transcription details - Status: ${transcriptionStatus}, Text available: ${!!transcriptionText}`);
    
    // Log all form data for debugging
    console.log('All transcription form data:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    if (!transcriptionText) {
      console.log('No transcription text available in webhook, checking API...');
      
      // If no text in webhook but we have a callSid, try to fetch from API
      if (callSid) {
        const apiTranscriptions = await fetchTranscriptionsForCall(callSid);
        
        if (apiTranscriptions.length > 0) {
          console.log(`Successfully retrieved ${apiTranscriptions.length} transcriptions via API`);
          
          // Save each transcription to the database
          for (const apiTranscription of apiTranscriptions) {
            const { data, error } = await supabase
              .from('call_transcriptions')
              .insert({
                lead_id: originalLeadId || String(leadId),
                call_sid: callSid,
                segment_text: apiTranscription.text,
                is_final: true,
                confidence: 0.8, // Not provided by API so use default
                speaker: 'API Retrieved',
                recording_sid: apiTranscription.recordingSid,
                transcription_sid: apiTranscription.transcriptionSid,
                timestamp: new Date(apiTranscription.created).toISOString()
              })
              .select();
            
            if (error) {
              console.error('Error storing API transcription:', error);
            } else {
              console.log('Successfully stored API transcription:', data);
              
              // Forward the transcription to lead-connected
              await notifyLeadConnected(leadId, callSid, 'transcription', originalLeadId, {
                segment_text: apiTranscription.text,
                is_final: true,
                confidence: 0.8,
                speaker: 'API Retrieved',
                timestamp: new Date(apiTranscription.created).toISOString(),
                call_sid: callSid
              });
            }
          }
        } else {
          console.log('No transcriptions found via API call');
        }
      }
      
      return; // Exit if no webhook transcription text
    }
    
    const transcription = {
      segment_text: transcriptionText,
      is_final: transcriptionStatus === 'completed',
      confidence: parseFloat(formData.get('Confidence')?.toString() || '0.8'),
      speaker: formData.get('From')?.toString() || 'Unknown',
      timestamp: new Date().toISOString(),
      call_sid: callSid,
      recording_sid: recordingSid,
      transcription_sid: transcriptionSid
    };
    
    // Store the transcription in the database
    const { data, error } = await supabase
      .from('call_transcriptions')
      .insert({
        lead_id: originalLeadId || String(leadId),
        call_sid: callSid,
        segment_text: transcriptionText,
        is_final: transcriptionStatus === 'completed',
        confidence: parseFloat(formData.get('Confidence')?.toString() || '0.8'),
        speaker: formData.get('From')?.toString() || 'Unknown',
        recording_sid: recordingSid,
        transcription_sid: transcriptionSid,
        timestamp: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.error('Error storing transcription:', error);
    } else {
      console.log('Successfully stored transcription:', data);
    }
    
    // Forward the transcription to lead-connected
    await notifyLeadConnected(leadId, callSid, 'transcription', originalLeadId, transcription);
    
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
    // Get parameters from URL
    const url = new URL(req.url);
    const callId = url.searchParams.get('callId');
    const originalLeadId = url.searchParams.get('originalLeadId');
    
    console.log(`Dialer webhook received request with URL: ${req.url}`);
    console.log(`Parameters: callId=${callId}, originalLeadId=${originalLeadId}`);
    
    if (!callId) {
      throw new Error('Call ID is required');
    }
    
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const callStatus = formData.get('CallStatus')?.toString();
    const callSid = formData.get('CallSid')?.toString();
    const callDuration = formData.get('CallDuration')?.toString();
    const customParams = formData.get('CustomParameters')?.toString();
    const recordingSid = formData.get('RecordingSid')?.toString();
    
    // Check if this is a transcription event
    const isTranscription = formData.has('TranscriptionText') || formData.has('TranscriptionSid');
    
    console.log(`Dialer webhook received for call ${callId} with status: ${callStatus} ${isTranscription ? '(includes transcription)' : ''}`);
    console.log(`Call SID: ${callSid}, Recording SID: ${recordingSid || 'none'}`);
    console.log('URL originalLeadId:', originalLeadId);
    console.log('Custom parameters:', customParams);
    
    // Log all form data for debugging
    console.log('All form data:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    // Get the call record with expanded contact and session data
    const { data: call, error: callError } = await supabase
      .from('dialing_session_leads')
      .select(`
        *,
        contact:contact_id(*),
        agent:agent_id(*),
        dialing_session:session_id(*)
      `)
      .eq('id', callId)
      .single();
      
    if (callError || !call) {
      console.log(`Call not found in dialing_session_leads. Error: ${callError?.message}`);
      console.log('Attempting to use leadId directly from URL parameters...');
      
      // Process transcription directly if we have a leadId from URL params
      if (isTranscription && callSid && (callId || originalLeadId)) {
        await processTranscription(
          formData,
          callId || '',
          originalLeadId || callId || '',
          callSid,
          originalLeadId
        );
        
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200,
        });
      }
      
      throw new Error(`Call not found: ${callError?.message}`);
    }

    // Extract the original lead ID from notes if available
    let originalLeadIdFromNotes = null;
    if (call.notes) {
      try {
        const notesData = JSON.parse(call.notes);
        originalLeadIdFromNotes = notesData.originalLeadId;
      } catch (e) {
        console.warn('Could not parse notes JSON:', e);
      }
    }
    
    // Process transcription if available
    if (isTranscription && callSid && call.contact_id) {
      await processTranscription(
        formData,
        callId,
        call.contact_id,
        callSid,
        originalLeadId || originalLeadIdFromNotes
      );
    } 
    // If call is completed, check for transcriptions via API
    else if (callStatus === 'completed' && callSid && call.contact_id) {
      console.log(`Call ${callSid} completed. Checking for transcriptions via API...`);
      setTimeout(async () => {
        try {
          const apiTranscriptions = await fetchTranscriptionsForCall(callSid);
          if (apiTranscriptions.length > 0) {
            console.log(`Found ${apiTranscriptions.length} transcriptions via API for completed call`);
            
            for (const apiTranscription of apiTranscriptions) {
              // Store in database
              await supabase
                .from('call_transcriptions')
                .insert({
                  lead_id: originalLeadId || originalLeadIdFromNotes || String(call.contact_id),
                  call_sid: callSid,
                  segment_text: apiTranscription.text,
                  is_final: true,
                  confidence: 0.8,
                  speaker: 'API Retrieved',
                  recording_sid: apiTranscription.recordingSid,
                  transcription_sid: apiTranscription.transcriptionSid,
                  timestamp: new Date().toISOString()
                });
              
              // Notify lead-connected
              await notifyLeadConnected(
                call.contact_id,
                callSid,
                'transcription',
                originalLeadId || originalLeadIdFromNotes,
                {
                  segment_text: apiTranscription.text,
                  is_final: true,
                  confidence: 0.8,
                  speaker: 'API Retrieved',
                  timestamp: new Date().toISOString(),
                  call_sid: callSid
                }
              );
            }
          } else {
            console.log('No API transcriptions found for completed call');
          }
        } catch (error) {
          console.error('Error fetching API transcriptions after call completion:', error);
        }
      }, 5000); // Wait 5 seconds after call completion to check for transcriptions
    }
    // Pass both IDs to lead-connected function
    else if ((call.contact_id || originalLeadIdFromNotes) && callSid) {
      await notifyLeadConnected(
        originalLeadIdFromNotes || call.contact_id, 
        callSid, 
        callStatus || 'unknown',
        originalLeadId || call.contact_id
      );
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
            duration: callDuration ? parseInt(callDuration) : null
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
        // For other statuses (ringing, queued, etc.), just log
        console.log(`Received status update: ${callStatus} for call ${callId}`);
    }
    
    // If this is a status callback with a recording URL, try to process it
    if (formData.has('RecordingUrl') && callSid) {
      console.log(`Recording URL available for call ${callSid}: ${formData.get('RecordingUrl')}`);
      
      // If we have Twilio credentials, check for transcriptions
      if (twilioClient) {
        setTimeout(async () => {
          console.log(`Checking for transcriptions for recording ${formData.get('RecordingSid')}`);
          try {
            const transcriptions = await twilioClient.transcriptions.list({
              recordingSid: formData.get('RecordingSid')?.toString() || ''
            });
            
            console.log(`Found ${transcriptions.length} transcriptions for recording`);
            
            // Process transcriptions if found
            for (const transcription of transcriptions) {
              console.log(`Processing transcription ${transcription.sid}`);
              
              try {
                // Fetch the actual transcription text
                const transcriptionResource = await twilioClient.transcriptions(transcription.sid).fetch();
                
                console.log(`Transcription text: "${transcriptionResource.transcriptionText}"`);
                
                if (transcriptionResource.transcriptionText) {
                  // Store in database
                  const { data, error } = await supabase
                    .from('call_transcriptions')
                    .insert({
                      lead_id: originalLeadId || originalLeadIdFromNotes || String(call.contact_id),
                      call_sid: callSid,
                      segment_text: transcriptionResource.transcriptionText,
                      is_final: true,
                      confidence: 0.8,
                      speaker: 'API Retrieved',
                      recording_sid: formData.get('RecordingSid')?.toString(),
                      transcription_sid: transcription.sid,
                      timestamp: new Date().toISOString()
                    })
                    .select();
                  
                  if (error) {
                    console.error('Error storing recording transcription:', error);
                  } else {
                    console.log('Successfully stored recording transcription:', data);
                    
                    // Notify lead-connected
                    await notifyLeadConnected(
                      call.contact_id,
                      callSid,
                      'transcription',
                      originalLeadId || originalLeadIdFromNotes,
                      {
                        segment_text: transcriptionResource.transcriptionText,
                        is_final: true,
                        confidence: 0.8,
                        speaker: 'API Retrieved',
                        timestamp: new Date().toISOString(),
                        call_sid: callSid
                      }
                    );
                  }
                }
              } catch (transcriptionError) {
                console.error(`Error processing transcription ${transcription.sid}:`, transcriptionError);
              }
            }
          } catch (error) {
            console.error(`Error checking for transcriptions for recording:`, error);
          }
        }, 5000); // Wait 5 seconds to check for transcriptions
      }
    }
    
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in dialer-webhook function:', error);
    
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200, // Return 200 even for errors to avoid Twilio retries
    });
  }
});
