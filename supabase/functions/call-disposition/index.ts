
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Twilio client at the top level
let twilioClient: any = null;
let twilioInitError: Error | null = null;
let initializationPromise: Promise<void> | null = null;

async function initializeTwilioClient() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const twilioModule = await import('npm:twilio@4.10.0');
      const twilio = twilioModule.default;
      
      twilioClient = twilio(
        Deno.env.get('TWILIO_ACCOUNT_SID'),
        Deno.env.get('TWILIO_AUTH_TOKEN')
      );
      
      console.log('[call-disposition] ✅ Twilio client initialized successfully');
    } catch (error) {
      twilioInitError = error;
      console.error('[call-disposition] ❌ Failed to initialize Twilio client:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

// Initialize Twilio client immediately
initializeTwilioClient().catch(err => {
  console.error('[call-disposition] Initial Twilio client initialization failed:', err);
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Determine request type early by checking content type
  const contentType = req.headers.get('content-type') || '';
  const isTwilioWebhook = contentType.includes('application/x-www-form-urlencoded');
  const isApiRequest = contentType.includes('application/json');

  console.log(`[call-disposition] Request type: ${isTwilioWebhook ? 'Twilio webhook' : isApiRequest ? 'API request' : 'Unknown'}`);
  console.log(`[call-disposition] Content-Type: ${contentType}`);

  // Ensure Twilio client is initialized before processing requests
  if (!twilioClient) {
    try {
      await initializeTwilioClient();
    } catch (error) {
      console.error('[call-disposition] Failed to initialize Twilio client during request:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Twilio service temporarily unavailable'
        }), 
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // If initialization has failed and we still don't have a client
  if (!twilioClient) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Twilio service unavailable'
      }), 
      { 
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Route based on content type
    if (isTwilioWebhook) {
      // Process as Twilio webhook (form data)
      console.log('[call-disposition] Processing Twilio webhook (form data)');
      return await handleTwilioWebhook(req);
    } else if (isApiRequest) {
      // Process as API request (JSON)
      console.log('[call-disposition] Processing API request (JSON)');
      return await handleApiRequest(req, twilioClient);
    } else {
      // Unknown content type
      console.warn(`[call-disposition] Unsupported content type: ${contentType}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Unsupported content type: ${contentType}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error(`[call-disposition] Unhandled error:`, error);
    
    // Return appropriate format based on request type
    if (isTwilioWebhook) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  }
});

async function handleTwilioWebhook(req: Request) {
  try {
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const twilioData: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      twilioData[key] = value.toString();
    }
    
    console.log('[call-disposition] Received Twilio webhook data:', JSON.stringify(twilioData, null, 2));
    
    // Log and store call status information if available
    if (twilioData.CallSid && twilioData.CallStatus) {
      console.log(`[call-disposition] Call ${twilioData.CallSid} status: ${twilioData.CallStatus}`);
      console.log(`[call-disposition] From: ${twilioData.From} To: ${twilioData.To}`);
      console.log(`[call-disposition] Duration: ${twilioData.CallDuration || 0}s`);
      
      // Store call status update in Supabase
      const { error: dbError } = await supabase
        .from('call_status_updates')
        .insert({
          call_sid: twilioData.CallSid,
          status: twilioData.CallStatus,
          data: twilioData,
        });
      
      if (dbError) {
        console.error('[call-disposition] Error storing call status:', dbError);
      } else {
        console.log(`[call-disposition] ✅ Stored call status for SID ${twilioData.CallSid}`);
      }
      
      // Broadcast status update for real-time UI updates
      try {
        const channelName = `call-${twilioData.CallSid}`;
        await supabase.channel(channelName).send({
          type: 'broadcast',
          event: 'call_status_update',
          payload: {
            callSid: twilioData.CallSid,
            status: twilioData.CallStatus,
            duration: twilioData.CallDuration,
            timestamp: new Date().toISOString(),
          }
        });
        console.log(`[call-disposition] ✅ Broadcast call status update for ${twilioData.CallSid}`);
      } catch (broadcastError) {
        console.error('[call-disposition] Broadcast error:', broadcastError);
      }
    }
    
    // Return TwiML response for Twilio - empty response is fine for status callbacks
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 
      { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );
  } catch (error) {
    console.error('[call-disposition] Error handling Twilio webhook:', error);
    
    // Even on error, return a valid TwiML response to Twilio
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 
      { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );
  }
}

async function handleApiRequest(req: Request, twilioClient: any) {
  try {
    // Parse JSON from API request
    const requestData = await req.json();
    const { action, callSid, leadId, disposition, sessionId, userId } = requestData;
    
    console.log(`[call-disposition] Received API action: ${action} for call ${callSid}`);

    // Validate required parameters based on action
    if (!action) {
      throw new Error('Action is required');
    }
    
    // Track the action in the database for analytics
    try {
      if (leadId) {
        await supabase.from('lead_activities').insert({
          lead_id: Number(leadId),
          type: `call_${action}`,
          description: `Call ${action} via disposition panel`,
        });
        console.log(`✅ Activity logged for lead ${leadId}: call_${action}`);
      }
    } catch (activityError) {
      console.warn(`⚠️ Failed to log activity: ${activityError.message}`);
      // Continue with the operation even if logging fails
    }
    
    // Handle different call actions
    switch(action) {
      case 'end':
        if (!callSid) {
          throw new Error('Call SID is required for ending a call');
        }
        return await handleEndCall(callSid, leadId, twilioClient);
        
      case 'disposition':
        if (!leadId || !disposition) {
          throw new Error('Lead ID and disposition are required');
        }
        return await handleDisposition(leadId, disposition, callSid, twilioClient);
        
      case 'next':
        if (!sessionId) {
          throw new Error('Session ID is required for fetching next lead');
        }
        return await handleNextLead(sessionId, userId);
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`[call-disposition] API request error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
}

async function handleEndCall(callSid: string, leadId?: string | number, twilioClient?: any) {
  console.log(`📞 Ending call ${callSid}`);
  
  try {
    // End the call via Twilio API
    try {
      if (twilioClient) {
        await twilioClient.calls(callSid).update({ status: 'completed' });
        console.log(`✅ Successfully ended call ${callSid} via Twilio API`);
      } else {
        console.warn('⚠️ Twilio client not initialized, cannot end call via API');
      }
    } catch (twilioError) {
      console.error(`⚠️ Twilio API error: ${twilioError.message}`);
      
      // If Twilio API fails, try to update call status in our database anyway
      if (leadId) {
        try {
          await supabase.from('call_mappings')
            .update({ status: 'completed' })
            .eq('call_sid', callSid);
          console.log(`✅ Updated call mapping status to completed for ${callSid}`);
        } catch (dbError) {
          console.warn(`⚠️ Failed to update call mapping: ${dbError.message}`);
        }
      }
      
      // Even if Twilio API fails, we still report success to the client
      // since the user intends to end the call anyway
    }
    
    // Broadcast call ended event to any listeners for real-time updates
    try {
      if (leadId) {
        const channelName = `lead-data-${leadId}`;
        await supabase.channel(channelName).send({
          type: 'broadcast',
          event: 'lead_data_update',
          payload: {
            callStatus: 'completed',
            callSid: callSid,
            timestamp: new Date().toISOString(),
          }
        });
        console.log(`✅ Broadcast call ended event to ${channelName}`);
      }
    } catch (broadcastError) {
      console.warn(`⚠️ Failed to broadcast call status: ${broadcastError.message}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Call ended successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`❌ Error ending call: ${error.message}`);
    throw error;
  }
}

async function handleDisposition(leadId: string | number, disposition: string, callSid?: string, twilioClient?: any) {
  console.log(`📝 Setting disposition for lead ${leadId} to ${disposition}`);
  
  try {
    // Update lead disposition in database
    const { error: updateError } = await supabase.from('leads')
      .update({ 
        disposition: disposition,
        last_contacted: new Date().toISOString()
      })
      .eq('id', Number(leadId));
    
    if (updateError) {
      throw new Error(`Failed to update lead disposition: ${updateError.message}`);
    }
    
    console.log(`✅ Updated disposition for lead ${leadId} to ${disposition}`);
    
    // Log disposition as an activity
    const { error: activityError } = await supabase.from('lead_activities').insert({
      lead_id: Number(leadId),
      type: "disposition",
      description: disposition
    });
    
    if (activityError) {
      console.warn(`⚠️ Failed to log disposition activity: ${activityError.message}`);
    } else {
      console.log(`✅ Logged disposition activity for lead ${leadId}`);
    }
    
    // If call SID is provided, end the call as well
    if (callSid && twilioClient) {
      try {
        await twilioClient.calls(callSid).update({ status: 'completed' });
        console.log(`✅ Ended call ${callSid} after disposition`);
      } catch (twilioError) {
        console.warn(`⚠️ Failed to end call via Twilio API: ${twilioError.message}`);
      }
    }
    
    // Broadcast disposition update
    try {
      const channelName = `lead-data-${leadId}`;
      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'lead_data_update',
        payload: {
          lead: {
            id: leadId,
            disposition: disposition,
            last_contacted: new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
        }
      });
      console.log(`✅ Broadcast disposition update to ${channelName}`);
    } catch (broadcastError) {
      console.warn(`⚠️ Failed to broadcast disposition: ${broadcastError.message}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `Lead disposition set to ${disposition}`,
      disposition: disposition,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`❌ Error setting disposition: ${error.message}`);
    throw error;
  }
}

async function handleNextLead(sessionId: string, userId?: string) {
  console.log(`📞 Getting next lead for session ${sessionId}`);
  
  try {
    // Get the next lead from the session
    const { data: nextLead, error: nextLeadError } = await supabase.functions.invoke('get-next-lead', {
      body: { sessionId }
    });
    
    if (nextLeadError) {
      throw new Error(`Failed to get next lead: ${nextLeadError}`);
    }
    
    if (!nextLead || !nextLead.leadId) {
      return new Response(JSON.stringify({
        success: true,
        message: "No more leads available in this session.",
        hasMoreLeads: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`✅ Retrieved next lead: ${nextLead.leadId}, ${nextLead.phoneNumber}`);
    
    // Log this as an activity
    try {
      await supabase.from('lead_activities').insert({
        lead_id: Number(nextLead.leadId),
        type: "call_initiated",
        description: `Call initiated by ${userId || 'user'} via next lead button`
      });
    } catch (activityError) {
      console.warn(`⚠️ Failed to log call activity: ${activityError}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "Next lead retrieved successfully",
      leadId: nextLead.leadId,
      phoneNumber: nextLead.phoneNumber,
      name: nextLead.name,
      hasMoreLeads: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`❌ Error getting next lead: ${error.message}`);
    throw error;
  }
}
