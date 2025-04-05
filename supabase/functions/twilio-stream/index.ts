import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// CORS headers for initial requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
  'Access-Control-Max-Age': '86400',
};

// Function to decode base64 audio data
function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Mapping of connection IDs to sockets
const connections = new Map();

// WebSocket handler
serve(async (req) => {
  // Handle standard CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }
  
  // Check for WebSocket request
  const upgradeHeader = req.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket connection', { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    console.log('Upgrading connection to WebSocket...');
    // Upgrade the connection to a WebSocket
    const { socket, response } = Deno.upgradeWebSocket(req);
    const connId = crypto.randomUUID();
    
    console.log(`New WebSocket connection: ${connId}`);

    // Store the websocket object
    connections.set(connId, socket);

    socket.onopen = () => {
      console.log(`WebSocket connection opened: ${connId}`);
      
      // Send an initial message to confirm connection
      try {
        socket.send(JSON.stringify({
          event: 'connection_established',
          connId: connId,
          timestamp: Date.now(),
          message: 'WebSocket connection established and ready for audio streaming'
        }));
      } catch (e) {
        console.error('Error sending initial message:', e);
      }
    };

    socket.onmessage = (event) => {
      try {
        // Parse the incoming message
        const data = JSON.parse(event.data);
        console.log(`Received message type: ${data.event}`);

        // Handle media stream start event
        if (data.event === 'start') {
          console.log('Stream started:', data);
          
          // Relay connection opened to any browser clients
          const streamStartEvent = {
            event: 'streamStart',
            streamSid: data.streamSid,
            callSid: data.callSid,
            timestamp: Date.now(),
            message: 'Audio stream started and connected'
          };
          
          // Broadcast to all connected clients
          for (const client of connections.values()) {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(streamStartEvent));
            }
          }
        }
        // Handle media chunk events
        else if (data.event === 'media') {
          // Process incoming audio tracks
          if (data.track === 'inbound' || data.track === 'outbound') {
            // Convert audio data and broadcast to all browser clients
            const audioEvent = {
              event: 'audio',
              track: data.track,
              payload: data.payload, // Keep original base64 payload
              streamSid: data.streamSid,
              timestamp: Date.now()
            };
            
            // Broadcast to all connected clients except the sender
            for (const client of connections.values()) {
              if (client !== socket && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(audioEvent));
              }
            }
          }
        }
        // Handle stream stop event
        else if (data.event === 'stop') {
          console.log('Stream stopped:', data);
          
          // Relay stream stopped to browser clients
          const streamStopEvent = {
            event: 'streamStop',
            streamSid: data.streamSid,
            callSid: data.callSid,
            timestamp: Date.now(),
            message: 'Audio stream has ended'
          };
          
          // Broadcast to all connected clients
          for (const client of connections.values()) {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(streamStopEvent));
            }
          }
        }
        // Handle browser client events (e.g., connection, stream request)
        else if (data.event === 'browser_connect') {
          console.log('Browser client connected:', data);
          socket.send(JSON.stringify({
            event: 'browser_connected',
            status: 'ready',
            clientId: connId,
            timestamp: Date.now(),
            message: 'Browser client registered for audio streaming'
          }));
        }
        // Handle ping/keep alive messages
        else if (data.event === 'ping') {
          socket.send(JSON.stringify({
            event: 'pong',
            timestamp: Date.now(),
            echo: data.timestamp || null
          }));
        }
      } catch (err) {
        console.error('Error processing message:', err);
        try {
          socket.send(JSON.stringify({
            event: 'error',
            error: 'Failed to process message',
            timestamp: Date.now()
          }));
        } catch (e) {
          console.error('Error sending error response:', e);
        }
      }
    };

    socket.onerror = (error) => {
      console.error(`WebSocket error on connection ${connId}:`, error);
    };

    socket.onclose = () => {
      console.log(`WebSocket connection closed: ${connId}`);
      connections.delete(connId);
    };

    return response;
  } catch (err) {
    console.error('Error handling WebSocket connection:', err);
    return new Response('Error handling WebSocket connection', { 
      status: 500,
      headers: corsHeaders
    });
  }
});
