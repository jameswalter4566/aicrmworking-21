
export interface PowerDialerContact {
  id: string;
  name: string;
  phone_number: string;
  status: string;
  notes?: string | null;
  last_call_timestamp?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PowerDialerAgent {
  id: string;
  user_id: string;
  name: string;
  status: string;
  current_call_id?: string | null;
  last_status_change?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PowerDialerCall {
  id: string;
  contact_id?: string | null;
  agent_id?: string | null;
  twilio_call_sid?: string | null;
  start_timestamp?: string | null;
  end_timestamp?: string | null;
  duration?: number | null;
  machine_detection_result?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PowerDialerCallQueue {
  id: string;
  call_id: string;
  priority?: number | null;
  created_timestamp?: string | null;
  assigned_to_agent_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  calls?: PowerDialerCall & { contacts?: PowerDialerContact };
}
