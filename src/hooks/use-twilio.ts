import { useState, useEffect, useCallback, useRef } from 'react';
import { twilioService } from '@/services/twilio';
import { toast } from '@/components/ui/use-toast';

export interface ActiveCall {
  callSid: string;
  phoneNumber: string;
  status: 'connecting' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  leadId: string | number;
  isMuted?: boolean;
  speakerOn?: boolean;
  usingBrowser?: boolean;
  audioActive?: boolean;
  audioStreaming?: boolean;
  conferenceName?: string;
  leadName?: string;
  company?: string;
}

interface AudioChunk {
  track: string;
  timestamp: number;
  payload: string;
  conferenceName?: string;
}

export const useTwilio = () => {
  // ... keep existing code (rest of the file)
};
