
import { connect, NatsConnection, StringCodec, Subscription } from 'nats.ws';

// NATS connection singleton
let natsConnection: NatsConnection | null = null;

// String codec for encoding/decoding messages
const sc = StringCodec();

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
      
      // Enhanced logging for connection events
      console.group('NATS Connection');
      console.log('✅ Connected to NATS server');
      console.log('🔗 Server:', natsConnection.getServer());
      console.log('📊 Connection Stats:', natsConnection.stats);
      console.groupEnd();
      
      // Handle disconnect with more detailed logging
      natsConnection.closed().then((err) => {
        console.group('NATS Disconnection');
        console.warn('❌ NATS connection closed');
        if (err) {
          console.error('Disconnection Error:', err);
        }
        console.groupEnd();
        natsConnection = null;
      });
      
    } catch (error) {
      console.group('NATS Connection Error');
      console.error('🚨 Failed to connect to NATS:', error);
      console.groupEnd();
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (!natsConnection) return;
    
    console.group('NATS Disconnection');
    console.log('🧹 Cleaning up subscriptions');
    
    // Clean up subscriptions
    for (const [subject, sub] of this.subscriptions.entries()) {
      console.log(`🔇 Unsubscribing from: ${subject}`);
      sub.unsubscribe();
    }
    this.subscriptions.clear();
    
    await natsConnection.close();
    console.log('🛑 NATS connection closed');
    console.groupEnd();
    
    natsConnection = null;
  }
  
  async publishCallStatus(update: CallStatusUpdate): Promise<void> {
    if (!natsConnection) {
      await this.connect();
    }
    
    const data = JSON.stringify(update);
    const subject = `call.status.${update.leadId || 'unknown'}`;
    
    console.group('NATS Publish');
    console.log('📨 Publishing to subject:', subject);
    console.log('📦 Payload:', update);
    console.groupEnd();
    
    natsConnection?.publish(subject, sc.encode(data));
  }
  
  subscribeToCallStatus(sessionId: string, onMessage: (update: CallStatusUpdate) => void): () => void {
    if (!natsConnection) {
      this.connect().catch(console.error);
    }
    
    const subject = `call.status.${sessionId}`;
    console.group('NATS Subscribe');
    console.log('📡 Subscribing to subject:', subject);
    console.groupEnd();
    
    const sub = natsConnection?.subscribe(subject);
    
    if (sub) {
      this.subscriptions.set(subject, sub);
      
      // Enhanced logging for incoming messages
      (async () => {
        for await (const msg of sub) {
          try {
            const data = JSON.parse(sc.decode(msg.data));
            
            console.group('NATS Message Received');
            console.log('📬 Subject:', subject);
            console.log('📊 Message Data:', data);
            console.groupEnd();
            
            onMessage(data);
          } catch (error) {
            console.group('NATS Message Processing Error');
            console.error('🚨 Error processing NATS message:', error);
            console.groupEnd();
          }
        }
      })();
    }
    
    // Return unsubscribe function
    return () => {
      console.group('NATS Unsubscribe');
      console.log('🔇 Unsubscribing from:', subject);
      console.groupEnd();
      
      sub?.unsubscribe();
      this.subscriptions.delete(subject);
    };
  }
}

export const natsService = new NatsService();
