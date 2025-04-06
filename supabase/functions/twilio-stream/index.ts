
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log(`WebSocket connection request received: ${new Date().toISOString()}`);
  
  const upgradeHeader = req.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    console.log("Not a WebSocket request, returning 400");
    return new Response('Expected WebSocket connection', { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    console.log('Upgrading connection to WebSocket for bidirectional audio...');
    const { socket, response } = Deno.upgradeWebSocket(req);
    const connId = crypto.randomUUID();
    
    console.log(`New WebSocket connection established: ${connId}`);

    let activeStreamSid = null;
    let callSid = null;
    let streamStarted = false;

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
        console.log(`Received message type: ${data.event} (${connId})`);

        if (data.event === 'start') {
          console.log('Stream started:', JSON.stringify(data).substring(0, 100) + '...');
          activeStreamSid = data.streamSid;
          callSid = data.callSid;
          streamStarted = true;
          
          socket.send(JSON.stringify({
            event: 'streamStart',
            streamSid: data.streamSid,
            callSid: data.callSid,
            timestamp: Date.now()
          }));
        }
        else if (data.event === 'media') {
          if (!streamStarted) {
            console.warn('Received media before stream start');
            return;
          }
          
          // Forward audio data in both directions
          socket.send(JSON.stringify({
            event: 'audio',
            track: data.track || 'inbound',
            payload: data.media?.payload || data.payload,
            streamSid: activeStreamSid,
            timestamp: Date.now()
          }));
        }
        else if (data.event === 'stop') {
          console.log('Stream stopped:', JSON.stringify(data));
          streamStarted = false;
          
          socket.send(JSON.stringify({
            event: 'streamStop',
            streamSid: data.streamSid,
            callSid: data.callSid || callSid,
            timestamp: Date.now()
          }));
          
          activeStreamSid = null;
          callSid = null;
        }
        else if (data.event === 'browser_audio' && activeStreamSid) {
          if (!streamStarted) {
            console.warn('Received browser audio before stream start');
            return;
          }
          
          // Send browser audio back to Twilio
          socket.send(JSON.stringify({
            event: 'media',
            streamSid: activeStreamSid,
            media: {
              payload: data.payload
            },
            track: 'outbound'
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
      activeStreamSid = null;
      callSid = null;
      streamStarted = false;
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
