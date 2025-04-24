
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
};

serve((req) => {
  console.log('📞 Received WebSocket request');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }

  try {
    const upgrade = req.headers.get('upgrade')?.toLowerCase();
    if (upgrade !== 'websocket') {
      return new Response('WebSocket upgrade required', { 
        status: 400,
        headers: corsHeaders 
      });
    }
    
    console.log('⚙️ Upgrading connection to WebSocket');
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    // Set up WebSocket event handlers
    socket.onopen = () => {
      console.log('🔌 WebSocket opened');
      socket.send(JSON.stringify({ event: 'connected', timestamp: Date.now() }));
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Log incoming messages except audio frames which would spam logs
        if (data.event !== 'audio' && data.event !== 'browser_audio') {
          console.log('📩 Received message:', data.event);
        }
        
        // Send simple acknowledgment for now
        socket.send(JSON.stringify({ 
          event: 'ack', 
          receivedEvent: data.event,
          timestamp: Date.now() 
        }));
      } catch (err) {
        console.error('❌ Error processing WebSocket message:', err);
      }
    };
    
    socket.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
    };
    
    socket.onclose = () => {
      console.log('🔌 WebSocket closed');
    };
    
    return response;
  } catch (err) {
    console.error('❌ Error handling WebSocket request:', err);
    return new Response('WebSocket error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
