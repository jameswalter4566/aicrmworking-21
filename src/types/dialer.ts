
export type CallStatus = 'connecting' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';

export interface LineCallData {
  phoneNumber?: string;
  leadName?: string;
  status?: CallStatus;
  startTime?: Date;
  company?: string;
  duration?: number;  // Added this missing property
}

export interface LineDisplayData {
  lineNumber: number;
  currentCall?: LineCallData;
}

export interface CallStatusUpdate {
  callSid: string;
  status: string;
  timestamp: number;
  agentId?: string;
  leadId?: string;
  phoneNumber?: string;
  duration?: number;
  leadName?: string;  // Added this missing property
}

export interface ActiveCallData extends LineCallData {
  callSid: string;
  leadId: string | number;
  audioActive?: boolean;
  audioStreaming?: boolean;
}
