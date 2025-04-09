
export interface PredictiveDialerContact {
  id: string;
  phone_number: string;
  name: string;
  status: 'not_contacted' | 'in_progress' | 'contacted' | 'voicemail' | 'no_answer';
  notes?: string;
  last_call_timestamp?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PredictiveDialerAgent {
  id: string;
  user_id: string;
  name: string;
  status: 'available' | 'busy' | 'offline';
  current_call_id?: string;
  last_status_change?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PredictiveDialerCall {
  id: string;
  contact_id?: string;
  agent_id?: string;
  twilio_call_sid?: string;
  start_timestamp?: string;
  end_timestamp?: string;
  duration?: number;
  machine_detection_result?: 'human' | 'machine' | 'unknown';
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  created_at?: string;
  updated_at?: string;
  contact?: PredictiveDialerContact;
}

export interface PredictiveDialerQueueItem {
  id: string;
  call_id: string;
  priority: number;
  created_timestamp?: string;
  assigned_to_agent_id?: string;
  created_at?: string;
  updated_at?: string;
  call?: PredictiveDialerCall;
}

export interface DialerStatus {
  isRunning: boolean;
  activeCallsCount: number;
  availableAgentsCount: number;
  queuedCallsCount: number;
  totalCallsPlaced: number;
  humanDetectedCount: number;
  voicemailDetectedCount: number;
  failedCallsCount: number;
}
