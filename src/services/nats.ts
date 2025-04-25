
import { connect, NatsConnection, StringCodec, Subscription } from 'nats.ws';

// NATS connection singleton
let natsConnection: NatsConnection | null = null;

// String codec for encoding/decoding messages
const sc = StringCodec();

// Define call status update message type
export interface CallStatusUpdate {
  callSid: string;
  status: string;
  timestamp: number;
  agentId?: string;
  leadId?: string;
  phoneNumber?: string;
  duration?: number;
}

class NatsService {
  private subscriptions: Map<string, Subscription> = new Map();
  
  async connect(): Promise<void> {
    if (natsConnection) return;
    
    try {
      natsConnection = await connect({
        servers: 'wss://nats.yourdomain.com:443', // You'll need to set up a NATS server
        timeout: 5000
      });
      
      console.log('Connected to NATS server');
      
      // Handle disconnect
      natsConnection.closed().then(() => {
        console.log('NATS connection closed');
        natsConnection = null;
      });
      
    } catch (error) {
      console.error('Failed to connect to NATS:', error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (!natsConnection) return;
    
    // Clean up subscriptions
    for (const sub of this.subscriptions.values()) {
      sub.unsubscribe();
    }
    this.subscriptions.clear();
    
    await natsConnection.close();
    natsConnection = null;
  }
  
  async publishCallStatus(update: CallStatusUpdate): Promise<void> {
    if (!natsConnection) {
      await this.connect();
    }
    
    const data = JSON.stringify(update);
    natsConnection?.publish('call.status', sc.encode(data));
  }
  
  subscribeToCallStatus(sessionId: string, onMessage: (update: CallStatusUpdate) => void): () => void {
    if (!natsConnection) {
      this.connect().catch(console.error);
    }
    
    const subject = `call.status.${sessionId}`;
    const sub = natsConnection?.subscribe(subject);
    
    if (sub) {
      this.subscriptions.set(subject, sub);
      
      // Handle incoming messages
      (async () => {
        for await (const msg of sub) {
          try {
            const data = JSON.parse(sc.decode(msg.data));
            onMessage(data);
          } catch (error) {
            console.error('Error processing NATS message:', error);
          }
        }
      })();
    }
    
    // Return unsubscribe function
    return () => {
      sub?.unsubscribe();
      this.subscriptions.delete(subject);
    };
  }
}

export const natsService = new NatsService();
