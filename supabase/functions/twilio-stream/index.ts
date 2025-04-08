
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
  'Access-Control-Max-Age': '86400',
};

interface StreamConnection {
  socket: WebSocket;
  streamSid: string | null;
  callSid: string | null;
  conferenceName: string | null; // Added to track conference name
  lastActivity: number;
  inboundAudioCount: number;
  outboundAudioCount: number;
  connectionId: string;
  clientType: 'browser' | 'twilio' | 'unknown';
  connected: boolean;
}

const activeConnections: Map<string, StreamConnection> = new Map();

function cleanupInactiveConnections() {
  const now = Date.now();
  let count = 0;
  
  activeConnections.forEach((conn, id) => {
    if (now - conn.lastActivity > 120000) {
      console.log(`Closing inactive WebSocket connection: ${id} (no activity for ${(now - conn.lastActivity)/1000}s)`);
      try {
        conn.socket.close(1000, "Connection timeout due to inactivity");
        activeConnections.delete(id);
        count++;
      } catch (err) {
        console.error(`Error closing inactive connection ${id}:`, err);
      }
    }
  });
  
  if (count > 0) {
    console.log(`Cleaned up ${count} inactive connection(s). Remaining: ${activeConnections.size}`);
  }
}

setInterval(cleanupInactiveConnections, 30000);

// Start a periodic diagnostics reporter
setInterval(() => {
  console.log(`🔄 Active WebSocket connections: ${activeConnections.size}`);
  
  if (activeConnections.size > 0) {
    const now = Date.now();
    activeConnections.forEach((conn, id) => {
      console.log(`🔌 Connection ${id}: streamSid=${conn.streamSid || 'none'}, callSid=${conn.callSid || 'none'}, conference=${conn.conferenceName || 'none'}, type=${conn.clientType}, connected=${conn.connected}, inbound=${conn.inboundAudioCount}, outbound=${conn.outboundAudioCount}, age=${((now - conn.lastActivity)/1000).toFixed(1)}s`);
    });
  }
}, 10000);

// Enhanced function to forward audio between connections
function forwardAudioToMatchingConnections(senderConnId: string, streamSid: string | null, conferenceName: string | null, audioData: any) {
  let forwardCount = 0;
  
  activeConnections.forEach((conn, connId) => {
    // Don't send back to the sender
    // Forward if: same streamSid OR same conferenceName (when conferenceName is available)
    if (connId !== senderConnId && conn.connected && 
        ((streamSid && conn.streamSid === streamSid) || 
         (conferenceName && conn.conferenceName === conferenceName))) {
      try {
        conn.socket.send(JSON.stringify({
          event: 'audio',
          track: 'inbound',  // Mark as inbound audio for the receiver
          payload: audioData.payload || audioData.media?.payload,
          timestamp: Date.now(),
          streamSid: streamSid,
          conferenceName: conferenceName,
          forwardedFrom: senderConnId
        }));
        forwardCount++;
      } catch (err) {
        console.error(`Error forwarding audio to connection ${connId}:`, err);
      }
    }
  });
  
  return forwardCount;
}

serve(async (req) => {
  console.log(`⚡ WebSocket connection request received: ${new Date().toISOString()}`);
  console.log(`💡 Request URL: ${req.url}`);
  console.log(`💡 Request headers: ${[...req.headers.entries()].map(([k, v]) => `${k}=${v}`).join(', ')}`);
  
  const upgradeHeader = req.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    console.log("❌ Not a WebSocket request, returning 400");
    return new Response('Expected WebSocket connection', { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    console.log('🔄 Upgrading connection to WebSocket for bidirectional audio...');
    const { socket, response } = Deno.upgradeWebSocket(req);
    const connId = crypto.randomUUID();
    
    const connectionState: StreamConnection = {
      socket,
      streamSid: null,
      callSid: null,
      conferenceName: null,
      lastActivity: Date.now(),
      inboundAudioCount: 0,
      outboundAudioCount: 0,
      connectionId: connId,
      clientType: 'unknown',
      connected: false
    };
    
    activeConnections.set(connId, connectionState);
    console.log(`✅ New WebSocket connection established: ${connId} (total active: ${activeConnections.size})`);

    socket.onopen = () => {
      console.log(`🟢 WebSocket connection opened: ${connId}`);
      connectionState.connected = true;
      socket.send(JSON.stringify({
        event: 'connection_established',
        connId: connId,
        timestamp: Date.now()
      }));
    };

    socket.onmessage = (event) => {
      try {
        if (activeConnections.has(connId)) {
          activeConnections.get(connId)!.lastActivity = Date.now();
        }
        
        const data = JSON.parse(event.data);
        
        // Only log non-ping/pong events which happen frequently
        if (data.event !== 'ping' && data.event !== 'pong') {
          console.log(`📩 Connection ${connId} received ${data.event} event`);
        }
        
        switch (data.event) {
          case 'ping':
          case 'pong':
            // Don't log pings
            break;
          
          case 'media':
            connectionState.outboundAudioCount++;
            connectionState.clientType = 'twilio';
            if (data.media?.payload) {
              // Forward Twilio audio to all browser clients with matching streamSid or conferenceName
              const forwardCount = forwardAudioToMatchingConnections(
                connId, 
                data.streamSid, 
                connectionState.conferenceName,
                data.media
              );
              
              if (connectionState.outboundAudioCount % 100 === 0) {
                console.log(`📤 Forwarded Twilio audio chunk #${connectionState.outboundAudioCount} to ${forwardCount} recipients`);
              }
            }
            break;
            
          case 'browser_audio':
            connectionState.clientType = 'browser';
            connectionState.inboundAudioCount++;
            
            if (data.payload) {
              // Forward browser audio to Twilio connections with matching streamSid or conferenceName
              let twilioConn: StreamConnection | null = null;
              
              activeConnections.forEach((conn) => {
                if (conn.clientType === 'twilio' && 
                    ((connectionState.streamSid && conn.streamSid === connectionState.streamSid) ||
                     (connectionState.conferenceName && conn.conferenceName === connectionState.conferenceName))) {
                  twilioConn = conn;
                }
              });
              
              if (twilioConn && twilioConn.connected) {
                twilioConn.socket.send(JSON.stringify({
                  event: 'media',
                  streamSid: connectionState.streamSid,
                  conferenceName: connectionState.conferenceName,
                  media: {
                    payload: data.payload
                  }
                }));
                
                if (connectionState.inboundAudioCount % 100 === 0) {
                  console.log(`📤 Forwarded browser audio chunk #${connectionState.inboundAudioCount} to Twilio`);
                }
              } else {
                console.warn(`⚠️ No matching Twilio connection found for forwarding audio`);
              }
            }
            break;
            
          default:
            // For other events, just log that we received them
        }

        if (data.event === 'connected') {
          console.log(`✅ Twilio WebSocket protocol connected: ${JSON.stringify(data)}`);
          connectionState.clientType = 'twilio';
          
          socket.send(JSON.stringify({
            event: 'connected_ack',
            timestamp: Date.now()
          }));
        }
        else if (data.event === 'start') {
          console.log('🏁 Stream started:', JSON.stringify(data));
          if (activeConnections.has(connId)) {
            connectionState.streamSid = data.streamSid;
            connectionState.callSid = data.callSid;
            connectionState.inboundAudioCount = 0;
            connectionState.outboundAudioCount = 0;
            
            // Check if this is part of a conference call
            if (data.start?.friendlyName && data.start.friendlyName.includes('Conference')) {
              connectionState.conferenceName = data.start.friendlyName;
              console.log(`📞 Conference call detected: ${connectionState.conferenceName}`);
            }
          }
          
          // Broadcast to all connections that might be waiting for this stream
          activeConnections.forEach((conn, id) => {
            if (conn.connected && id !== connId) {
              conn.socket.send(JSON.stringify({
                event: 'streamStart',
                streamSid: data.streamSid,
                callSid: data.callSid,
                conferenceName: data.start?.friendlyName,
                timestamp: Date.now()
              }));
            }
          });

          socket.send(JSON.stringify({
            event: 'streamStart',
            streamSid: data.streamSid,
            callSid: data.callSid,
            conferenceName: data.start?.friendlyName,
            timestamp: Date.now()
          }));

          console.log(`
🔊 Stream details:
- Stream SID: ${data.streamSid}
- Call SID: ${data.callSid}
- Conference Name: ${data.start?.friendlyName || 'N/A'}
- Tracks: ${data.start?.tracks?.join(', ') || 'unknown'}
- Media Format: ${JSON.stringify(data.start?.mediaFormat || {})}
- Account SID: ${data.start?.accountSid || 'unknown'}
          `);
        }
        else if (data.event === 'media' && data.media?.payload) {
          if (!connectionState.streamSid && !connectionState.conferenceName) {
            console.warn('⚠️ Received media before stream start or conference identification');
            return;
          }

          const track = data.media.track || 'unknown';
          
          // Forward the audio to browser client
          socket.send(JSON.stringify({
            event: 'audio',
            track: track,
            payload: data.media.payload,
            timestamp: Date.now(),
            streamSid: connectionState.streamSid,
            conferenceName: connectionState.conferenceName,
            chunk: data.media.chunk || 0,
            sequence: data.sequenceNumber || 0
          }));
          
          // Also forward to all other connections with matching streamSid or conferenceName
          forwardAudioToMatchingConnections(
            connId, 
            connectionState.streamSid, 
            connectionState.conferenceName, 
            data.media
          );
          
          if (track === 'inbound') {
            connectionState.inboundAudioCount++;
            // Log periodically to confirm we're receiving audio
            if (connectionState.inboundAudioCount % 50 === 0) {
              console.log(`📥 Forwarded ${connectionState.inboundAudioCount} inbound audio chunks for stream ${connectionState.streamSid || ''} / conference ${connectionState.conferenceName || ''}`);
            }
          } else {
            connectionState.outboundAudioCount++;
            if (connectionState.outboundAudioCount % 50 === 0) {
              console.log(`📤 Forwarded ${connectionState.outboundAudioCount} outbound audio chunks for stream ${connectionState.streamSid || ''} / conference ${connectionState.conferenceName || ''}`);
            }
          }
        }
        else if (data.event === 'stop') {
          console.log('🛑 Stream stopped:', JSON.stringify(data));
          
          // Notify all connections about stream stop
          activeConnections.forEach((conn, id) => {
            if ((conn.streamSid === connectionState.streamSid || 
                conn.conferenceName === connectionState.conferenceName) && 
                conn.connected) {
              conn.socket.send(JSON.stringify({
                event: 'streamStop',
                streamSid: data.streamSid,
                callSid: data.callSid || connectionState.callSid,
                conferenceName: connectionState.conferenceName,
                timestamp: Date.now()
              }));
            }
          });
          
          console.log(`🔢 Stream ${data.streamSid} stats: inbound=${connectionState.inboundAudioCount}, outbound=${connectionState.outboundAudioCount}`);
          
          if (activeConnections.has(connId)) {
            connectionState.streamSid = null;
            connectionState.callSid = null;
            connectionState.conferenceName = null;
          }
        }
        else if (data.event === 'mark') {
          console.log('🔖 Mark received:', JSON.stringify(data));
          
          socket.send(JSON.stringify({
            event: 'mark',
            name: data.mark?.name || '',
            streamSid: data.streamSid,
            conferenceName: connectionState.conferenceName,
            timestamp: Date.now()
          }));
        }
        else if (data.event === 'dtmf') {
          console.log('🔢 DTMF received:', JSON.stringify(data));
          
          socket.send(JSON.stringify({
            event: 'dtmf',
            digit: data.dtmf?.digit || '',
            streamSid: data.streamSid,
            conferenceName: connectionState.conferenceName,
            timestamp: Date.now()
          }));
        }
        else if (data.event === 'browser_audio' && data.payload) {
          if (!connectionState.streamSid && !connectionState.conferenceName) {
            // If we don't have a streamSid or conferenceName yet for this browser connection,
            // see if there's an active Twilio stream we can attach to
            let foundTwilioStream = false;
            activeConnections.forEach((conn) => {
              if (conn.clientType === 'twilio' && (conn.streamSid || conn.conferenceName)) {
                connectionState.streamSid = conn.streamSid;
                connectionState.callSid = conn.callSid;
                connectionState.conferenceName = conn.conferenceName;
                foundTwilioStream = true;
                
                console.log(`🔗 Auto-associated browser connection ${connId} with existing stream/conference`);
                
                // Notify the browser client about the stream/conference
                socket.send(JSON.stringify({
                  event: 'streamStart',
                  streamSid: conn.streamSid,
                  callSid: conn.callSid,
                  conferenceName: conn.conferenceName,
                  timestamp: Date.now(),
                  autoAssociated: true
                }));
              }
            });
            
            if (!foundTwilioStream) {
              console.warn('⚠️ Received browser audio before stream/conference assignment and no active streams available');
              return;
            }
          }
          
          // Forward browser audio to Twilio stream
          socket.send(JSON.stringify({
            event: 'media',
            streamSid: connectionState.streamSid,
            conferenceName: connectionState.conferenceName,
            media: {
              payload: data.payload
            }
          }));
          
          // Send a mark to confirm audio was sent
          const markId = `browser-audio-${Date.now()}`;
          socket.send(JSON.stringify({
            event: 'mark',
            streamSid: connectionState.streamSid,
            conferenceName: connectionState.conferenceName,
            mark: {
              name: markId
            }
          }));
          
          connectionState.outboundAudioCount++;
          if (connectionState.outboundAudioCount % 50 === 0) {
            console.log(`📤 Forwarded ${connectionState.outboundAudioCount} browser audio chunks to Twilio`);
          }
        }
        else if (data.event === 'ping') {
          socket.send(JSON.stringify({
            event: 'pong',
            timestamp: Date.now()
          }));
        }
        else if (data.event === 'browser_connect') {
          console.log(`🖥️ Browser client connected: ${connId}`);
          connectionState.clientType = 'browser';
          
          // Get existing active streams and conferences to send to the browser
          const activeStreams = Array.from(activeConnections.values())
            .filter(conn => conn.clientType === 'twilio' && (conn.streamSid || conn.conferenceName))
            .map(conn => ({ 
              streamSid: conn.streamSid, 
              callSid: conn.callSid,
              conferenceName: conn.conferenceName
            }));
          
          socket.send(JSON.stringify({
            event: 'browser_connected',
            connId: connId,
            timestamp: Date.now(),
            activeStreams: activeStreams
          }));
        }
        else if (data.event === 'conference_join') {
          // Browser client wants to join a specific conference
          console.log(`🎙️ Browser client ${connId} joining conference: ${data.conferenceName}`);
          connectionState.conferenceName = data.conferenceName;
          
          socket.send(JSON.stringify({
            event: 'conference_joined',
            conferenceName: data.conferenceName,
            timestamp: Date.now()
          }));
        }
      } catch (err) {
        console.error('❌ Error processing WebSocket message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error(`❌ WebSocket error on connection ${connId}:`, error);
    };

    socket.onclose = () => {
      console.log(`🔴 WebSocket connection closed: ${connId}`);
      if (activeConnections.has(connId)) {
        const conn = activeConnections.get(connId)!;
        conn.connected = false;
        // Only remove from active connections after a delay to allow for reconnects
        setTimeout(() => {
          if (activeConnections.has(connId) && !activeConnections.get(connId)!.connected) {
            activeConnections.delete(connId);
            console.log(`🗑️ Connection removed after grace period. Total active: ${activeConnections.size}`);
          }
        }, 5000);
      }
    };

    return response;
  } catch (err) {
    console.error('❌ Error handling WebSocket connection:', err);
    return new Response('Error handling WebSocket connection', { 
      status: 500,
      headers: corsHeaders
    });
  }
});
