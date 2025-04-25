
export type CallStatus = 'connecting' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';

export interface LineCallData {
  phoneNumber?: string;
  leadName?: string;
  status?: CallStatus;
  startTime?: Date;
  company?: string;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface LineDisplayData {
  lineNumber: number;
  currentCall?: LineCallData;
}

export interface CallStatusUpdate {
  callSid: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  timestamp: number;
  agentId?: string;
  leadId?: string;
  phoneNumber?: string;
  leadName?: string;
  duration?: number;
  company?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface ActiveCallData extends LineCallData {
  callSid: string;
  leadId: string | number;
  audioActive?: boolean;
  audioStreaming?: boolean;
}
