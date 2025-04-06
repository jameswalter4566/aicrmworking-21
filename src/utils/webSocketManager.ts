/**
 * WebSocket manager for Twilio audio streaming
 */

import { startCapturingMicrophone, stopCapturingMicrophone, playIncomingAudio } from './audioProcessing';
import { toast } from '@/components/ui/use-toast';

let webSocket: WebSocket | null = null;
let activeStreamSid: string | null = null;
let pingInterval: number | null = null;
let reconnectAttempts = 0;

export interface WebSocketStatus {
  connected: boolean;
  streamActive: boolean;
  streamSid: string | null;
  callSid: string | null;
}

/**
 * Connect to the WebSocket server for audio streaming
 * @returns Promise resolving to the WebSocket connection
 */
export function connectToStreamingWebSocket(): Promise<WebSocketStatus> {
  return new Promise((resolve, reject) => {
    // Close existing connection if any
    if (webSocket && webSocket.readyState !== WebSocket.CLOSED) {
      webSocket.close();
    }
    
    try {
      // Create new WebSocket connection
      webSocket = new WebSocket('wss://imrmboyczebjlbnkgjns.supabase.co/functions/v1/twilio-stream');
      console.log('Creating new WebSocket connection for audio streaming');
      
      // Set up connection timeout
      const connectionTimeout = setTimeout(() => {
        if (webSocket && webSocket.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timed out');
          reject(new Error('WebSocket connection timed out'));
          
          if (webSocket) {
            webSocket.close();
            webSocket = null;
          }
        }
      }, 10000);
      
      // Handle WebSocket opening
      webSocket.onopen = () => {
        console.log('WebSocket connection established');
        clearTimeout(connectionTimeout);
        reconnectAttempts = 0;
        
        // Send browser connect message
        webSocket?.send(JSON.stringify({
          event: 'browser_connect',
          timestamp: Date.now()
        }));
        
        // Set up ping interval to keep connection alive
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = window.setInterval(() => {
          if (webSocket && webSocket.readyState === WebSocket.OPEN) {
            webSocket.send(JSON.stringify({ event: 'ping', timestamp: Date.now() }));
          }
        }, 20000);
        
        // Resolve with connection status
        resolve({
          connected: true,
          streamActive: false,
          streamSid: null,
          callSid: null
        });
      };
      
      // Handle incoming WebSocket messages
      webSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // console.log('WebSocket received event:', data.event);
          
          switch (data.event) {
            case 'streamStart':
              console.log(`Stream started with SID: ${data.streamSid}, Call SID: ${data.callSid}`);
              activeStreamSid = data.streamSid;
              
              // Start capturing microphone audio
              startCapturingMicrophone(webSocket, activeStreamSid);
              
              toast({
                title: "Audio Stream Active",
                description: "Bidirectional audio stream connected successfully.",
              });
              break;
              
            case 'streamStop':
              console.log('Stream stopped');
              activeStreamSid = null;
              
              // Stop capturing microphone
              stopCapturingMicrophone();
              break;
              
            case 'audio':
              if (data.payload) {
                playIncomingAudio(data.payload);
              }
              break;
              
            case 'mark':
              // console.log('Mark event received:', data.name);
              break;
              
            case 'dtmf':
              console.log('DTMF digit received:', data.digit);
              break;
              
            case 'pong':
              // Received pong response from server
              break;
              
            case 'connection_established':
            case 'browser_connected':
              console.log('WebSocket connection confirmed by server:', data.event);
              break;
              
            default:
              // console.log('Received WebSocket event:', data.event);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      // Handle WebSocket errors
      webSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        clearTimeout(connectionTimeout);
        
        // Only show error toast if this wasn't a reconnect attempt
        if (reconnectAttempts === 0) {
          toast({
            title: "Connection Error",
            description: "Failed to establish audio stream connection.",
            variant: "destructive",
          });
        }
        
        reject(error);
      };
      
      // Handle WebSocket closing
      webSocket.onclose = () => {
        console.log('WebSocket connection closed');
        clearTimeout(connectionTimeout);
        
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
        
        // Clean up audio resources
        stopCapturingMicrophone();
        activeStreamSid = null;
        
        // Attempt to reconnect if closed unexpectedly
        if (reconnectAttempts < 3) {
          console.log(`Attempting to reconnect (${reconnectAttempts + 1}/3)...`);
          reconnectAttempts++;
          setTimeout(() => {
            connectToStreamingWebSocket().catch(() => {
              console.log('Reconnection attempt failed');
            });
          }, 2000 * reconnectAttempts);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      reject(error);
    }
  });
}

/**
 * Close the WebSocket connection
 */
export function closeWebSocketConnection(): void {
  if (webSocket && webSocket.readyState !== WebSocket.CLOSED) {
    webSocket.close();
    webSocket = null;
  }
  
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  
  activeStreamSid = null;
  stopCapturingMicrophone();
}

/**
 * Check if WebSocket connection is active
 * @returns WebSocket status object
 */
export function getWebSocketStatus(): WebSocketStatus {
  return {
    connected: webSocket !== null && webSocket.readyState === WebSocket.OPEN,
    streamActive: activeStreamSid !== null,
    streamSid: activeStreamSid,
    callSid: null // We don't track this here but in the call status
  };
}

/**
 * Get the active stream SID
 * @returns Current stream SID or null
 */
export function getActiveStreamSid(): string | null {
  return activeStreamSid;
}
