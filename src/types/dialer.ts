
export type CallStatus = 'connecting' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';

export interface LineCallData {
  phoneNumber?: string;
  leadName?: string;
  status?: CallStatus;
  startTime?: Date;
  company?: string;
}

export interface LineDisplayData {
  lineNumber: number;
  currentCall?: LineCallData;
}

export interface ActiveCallData extends LineCallData {
  callSid: string;
  leadId: string | number;
  audioActive?: boolean;
  audioStreaming?: boolean;
}
