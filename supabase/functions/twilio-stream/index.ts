
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
    console.log('Upgrading connection to WebSocket for bidirectional audio...');
    const { socket, response } = Deno.upgradeWebSocket(req);
    const connId = crypto.randomUUID();
    
    console.log(`New WebSocket connection: ${connId}`);

    // Store the active streamSid to send audio back to Twilio
    let activeStreamSid = null;

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
          // Store the stream SID for sending audio back to Twilio
          activeStreamSid = data.streamSid;
          
          socket.send(JSON.stringify({
            event: 'streamStart',
            streamSid: data.streamSid,
            callSid: data.callSid,
            timestamp: Date.now()
          }));
        }
        else if (data.event === 'media') {
          // Forward audio data from Twilio to client
          socket.send(JSON.stringify({
            event: 'audio',
            track: data.track,
            payload: data.payload,
            streamSid: data.streamSid,
            timestamp: Date.now()
          }));
          
          // Add acknowledgment for media packets to ensure continuous flow
          if (Math.random() < 0.1) {  // Only ack about 10% of packets to avoid flooding
            socket.send(JSON.stringify({
              event: 'mediaAck',
              streamSid: data.streamSid,
              timestamp: Date.now()
            }));
          }
        }
        else if (data.event === 'stop') {
          console.log('Stream stopped:', data);
          activeStreamSid = null;
          
          socket.send(JSON.stringify({
            event: 'streamStop',
            streamSid: data.streamSid,
            callSid: data.callSid,
            timestamp: Date.now()
          }));
        }
        else if (data.event === 'ping') {
          // Respond to keep-alive pings
          socket.send(JSON.stringify({
            event: 'pong',
            timestamp: Date.now()
          }));
        }
        else if (data.event === 'browser_connect') {
          // Acknowledge browser client connection
          console.log('Browser client connected');
          socket.send(JSON.stringify({
            event: 'browser_connected',
            timestamp: Date.now()
          }));
        }
        // Handle browser audio to send back to Twilio for bidirectional streaming
        else if (data.event === 'browser_audio') {
          if (activeStreamSid) {
            // Format the message according to Twilio's WebSocket protocol
            // for sending audio data back to the call
            socket.send(JSON.stringify({
              event: 'media',
              streamSid: activeStreamSid,
              media: {
                payload: data.payload
              }
            }));
          }
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
