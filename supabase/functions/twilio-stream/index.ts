
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  const upgradeHeader = req.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket connection', { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    console.log('Upgrading connection to WebSocket...');
    const { socket, response } = Deno.upgradeWebSocket(req);
    const connId = crypto.randomUUID();
    
    console.log(`New WebSocket connection: ${connId}`);

    socket.onopen = () => {
      console.log(`WebSocket connection opened: ${connId}`);
      socket.send(JSON.stringify({
        event: 'connection_established',
        connId: connId,
        timestamp: Date.now()
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`Received message type: ${data.event}`);

        // Handle different Twilio WebSocket message types
        if (data.event === 'start') {
          console.log('Stream started:', data);
          socket.send(JSON.stringify({
            event: 'streamStart',
            streamSid: data.streamSid,
            callSid: data.callSid,
            timestamp: Date.now()
          }));
        }
        else if (data.event === 'media') {
          // Forward audio data to client
          socket.send(JSON.stringify({
            event: 'audio',
            track: data.track,
            payload: data.payload,
            streamSid: data.streamSid,
            timestamp: Date.now()
          }));
        }
        else if (data.event === 'stop') {
          console.log('Stream stopped:', data);
          socket.send(JSON.stringify({
            event: 'streamStop',
            streamSid: data.streamSid,
            callSid: data.callSid,
            timestamp: Date.now()
          }));
        }
        else if (data.event === 'ping') {
          socket.send(JSON.stringify({
            event: 'pong',
            timestamp: Date.now()
          }));
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error(`WebSocket error on connection ${connId}:`, error);
    };

    socket.onclose = () => {
      console.log(`WebSocket connection closed: ${connId}`);
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
