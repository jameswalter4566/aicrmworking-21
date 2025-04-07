
// Global TypeScript definitions
declare global {
  interface Window {
    Twilio?: any;
    twilioAudioPlayer?: {
      addAudioData: (base64Audio: string) => void;
      streamSid?: string | null;
    };
  }
}

export {};
