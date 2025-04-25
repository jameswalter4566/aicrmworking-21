
export interface CallLog {
  id: string;
  sid: string;
  status: string;
  from_number: string | null;
  to_number: string | null;
  duration: number;
  timestamp: string;
  line_number: number;
}
