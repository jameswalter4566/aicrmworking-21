
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import twilio from 'https://esm.sh/twilio@4.18.1';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Twilio client
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

// Track active calls by user and session
interface ActiveCall {
  callSid: string;
  leadId: string | number;
  userId: string;
  sessionId?: string;
  phoneNumber: string;
  startTime: Date;
  status: string;
}

// In-memory store for active calls (would be replaced with database in production)
const activeCallsStore: Record<string, ActiveCall> = {};

// Session tracking for user-specific actions
interface SessionTracking {
  userId: string;
  activeCalls: Record<string, string>; // leadId -> callSid mapping
  lastAction: Date;
}

// Store of sessions by sessionId
const sessionStore: Record<string, SessionTracking> = {};

// Main function to handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing disposition panel request`);
    
    // Parse the request
    const requestData = await req.json();
    const { action, callSid, leadId, userId, sessionId = 'default-session' } = requestData;
    
    console.log(`[${requestId}] Action: ${action}, CallSID: ${callSid}, LeadID: ${leadId}, UserID: ${userId}, SessionID: ${sessionId}`);
    
    // Create or update session tracking
    if (!sessionStore[sessionId]) {
      console.log(`[${requestId}] Created new session tracking for session ${sessionId}`);
      sessionStore[sessionId] = {
        userId: userId || 'anonymous',
        activeCalls: {},
        lastAction: new Date()
      };
    }
    
    let response;
    
    // Switch on the action
    switch (action) {
      case 'hangup':
        response = await handleHangup(callSid, leadId, userId, sessionId, requestId);
        break;
      case 'hangupAll':
        response = await handleHangupAll(userId, sessionId, requestId);
        break;
      case 'registerCall':
        response = await handleRegisterCall(callSid, leadId, userId, sessionId, requestData, requestId);
        break;
      case 'getActiveCalls':
        response = await handleGetActiveCalls(userId, sessionId, requestId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    // Update session's last action timestamp
    if (sessionStore[sessionId]) {
      sessionStore[sessionId].lastAction = new Date();
    }
    
    console.log(`[${requestId}] Completed successfully`);
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in disposition-panel function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An error occurred processing the request',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/**
 * Handle hanging up a specific call
 */
async function handleHangup(callSid: string, leadId: string | number, userId: string, sessionId: string, requestId: string): Promise<any> {
  console.log(`[${requestId}] Attempting to hang up call ${callSid}`);
  
  if (!callSid) {
    // If no callSid provided but we have a leadId, try to find the call by leadId
    if (leadId && sessionStore[sessionId]) {
      callSid = sessionStore[sessionId].activeCalls[leadId.toString()];
      console.log(`[${requestId}] Found callSid ${callSid} for leadId ${leadId}`);
    }
    
    if (!callSid) {
      throw new Error('No callSid provided or found for the given leadId');
    }
  }
  
  try {
    // Check if this is a valid call for this user/session
    validateCallAccess(callSid, userId, sessionId);
    
    // Attempt to hang up the call via Twilio API
    await twilioClient.calls(callSid).update({ status: 'completed' });
    
    console.log(`[${requestId}] Successfully hung up call ${callSid}`);
    
    // Update our tracking
    if (leadId && sessionStore[sessionId]) {
      delete sessionStore[sessionId].activeCalls[leadId.toString()];
    }
    
    // Delete from active calls store
    Object.keys(activeCallsStore).forEach(key => {
      if (activeCallsStore[key].callSid === callSid) {
        delete activeCallsStore[key];
      }
    });
    
    // Log the action to the database
    try {
      if (leadId) {
        await supabase.from('lead_activities').insert({
          lead_id: Number(leadId),
          type: 'call_hangup',
          description: `Call ${callSid} hung up via disposition panel`
        });
      }
    } catch (dbError) {
      console.warn(`[${requestId}] Error logging call activity: ${dbError.message}`);
      // Non-fatal, continue
    }
    
    return {
      success: true,
      message: `Call ${callSid} has been hung up`,
      callSid
    };
  } catch (error) {
    console.error(`[${requestId}] Error hanging up call: ${error}`);
    
    if (error.code === 20404) {
      // Call not found - could be already completed
      console.log(`[${requestId}] Call ${callSid} not found, may already be completed`);
      
      // Clean up our tracking anyway
      if (leadId && sessionStore[sessionId]) {
        delete sessionStore[sessionId].activeCalls[leadId.toString()];
      }
      
      return {
        success: true,
        message: `Call ${callSid} not found or already completed`,
        callSid
      };
    }
    
    throw error;
  }
}

/**
 * Handle hanging up all calls for a user/session
 */
async function handleHangupAll(userId: string, sessionId: string, requestId: string): Promise<any> {
  console.log(`[${requestId}] Attempting to hang up all active calls`);
  
  const session = sessionStore[sessionId];
  if (!session) {
    console.log(`[${requestId}] No active session found for ${sessionId}`);
    return { success: true, hungUpCount: 0 };
  }
  
  const callsToHangup = Object.values(session.activeCalls);
  console.log(`[${requestId}] Found ${callsToHangup.length} active calls`);
  
  const results = [];
  let successCount = 0;
  
  for (const callSid of callsToHangup) {
    try {
      await twilioClient.calls(callSid).update({ status: 'completed' });
      results.push({ callSid, success: true });
      successCount++;
    } catch (error) {
      console.error(`[${requestId}] Error hanging up call ${callSid}: ${error}`);
      results.push({ callSid, success: false, error: error.message });
    }
  }
  
  // Clear session's active calls
  session.activeCalls = {};
  
  return {
    success: true,
    hungUpCount: successCount,
    results
  };
}

/**
 * Register an active call
 */
async function handleRegisterCall(
  callSid: string, 
  leadId: string | number, 
  userId: string, 
  sessionId: string, 
  data: any,
  requestId: string
): Promise<any> {
  console.log(`[${requestId}] Registering call ${callSid} for lead ${leadId}`);
  
  if (!callSid || !leadId) {
    throw new Error('CallSid and LeadId are required');
  }
  
  const phoneNumber = data.phoneNumber || 'unknown';
  const callStatus = data.status || 'in-progress';
  
  // Store in our active calls
  const callKey = `${userId}-${callSid}`;
  activeCallsStore[callKey] = {
    callSid,
    leadId,
    userId,
    sessionId,
    phoneNumber,
    startTime: new Date(),
    status: callStatus
  };
  
  // Register in session tracking
  if (sessionStore[sessionId]) {
    sessionStore[sessionId].activeCalls[leadId.toString()] = callSid;
  }
  
  console.log(`[${requestId}] Call registered successfully`);
  
  return {
    success: true,
    message: 'Call registered successfully'
  };
}

/**
 * Get active calls for a user/session
 */
async function handleGetActiveCalls(userId: string, sessionId: string, requestId: string): Promise<any> {
  console.log(`[${requestId}] Getting active calls for user ${userId}, session ${sessionId}`);
  
  const session = sessionStore[sessionId];
  if (!session) {
    return { success: true, activeCalls: {} };
  }
  
  // For each call in session, get the active call details
  const activeCalls: Record<string, any> = {};
  
  for (const [leadId, callSid] of Object.entries(session.activeCalls)) {
    const callKey = `${userId}-${callSid}`;
    if (activeCallsStore[callKey]) {
      activeCalls[leadId] = activeCallsStore[callKey];
    }
  }
  
  return {
    success: true,
    activeCalls
  };
}

/**
 * Validate that a user has access to control a specific call
 */
function validateCallAccess(callSid: string, userId: string, sessionId: string): boolean {
  // Simple validation based on session tracking
  const session = sessionStore[sessionId];
  if (!session) {
    throw new Error('Invalid session');
  }
  
  // Check if this call is in the session's active calls
  const callExists = Object.values(session.activeCalls).includes(callSid);
  
  if (!callExists) {
    // Secondary check directly in activeCallsStore
    let callFound = false;
    Object.keys(activeCallsStore).forEach(key => {
      if (key.startsWith(`${userId}-`) && activeCallsStore[key].callSid === callSid) {
        callFound = true;
      }
    });
    
    if (!callFound) {
      throw new Error('Not authorized to control this call');
    }
  }
  
  return true;
}

// Schedule periodic cleanup of stale sessions
setInterval(() => {
  const now = new Date();
  const staleThreshold = 3600000; // 1 hour in ms
  
  Object.keys(sessionStore).forEach(sessionId => {
    const session = sessionStore[sessionId];
    const timeSinceLastAction = now.getTime() - session.lastAction.getTime();
    
    if (timeSinceLastAction > staleThreshold) {
      console.log(`Cleaning up stale session: ${sessionId}`);
      delete sessionStore[sessionId];
    }
  });
}, 300000); // Run every 5 minutes
