
export interface CallStatus {
  status: 'connecting' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  
  // Call metadata
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  
  // Call identification
  callSid?: string;
  sessionId?: string;
  
  // Contact information
  phoneNumber?: string;
  leadName?: string;
  leadId?: string;
}

export interface ActiveCall {
  contact: {
    phone1: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    id?: string;
  };
  status: 'connecting' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  callSid?: string;
}
