
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// We're creating this custom client to type our predictive dialer tables
// since they're not yet added to the auto-generated types

const SUPABASE_URL = "https://imrmboyczebjlbnkgjns.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltcm1ib3ljemViamxibmtnam5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2Njg1MDQsImV4cCI6MjA1OTI0NDUwNH0.scafe8itFDyN5mFcCiyS1uugV5-7s9xhaKoqYuXGJwQ";

export const customSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Extension of Supabase client with predictive dialer table access
export const predictiveDialer = {
  // These methods are for direct table access
  getAgents: () => customSupabase.from('predictive_dialer_agents'),
  getCalls: () => customSupabase.from('predictive_dialer_calls'),
  getContacts: () => customSupabase.from('predictive_dialer_contacts'),
  getCallQueue: () => customSupabase.from('predictive_dialer_call_queue'),
  
  // Typed methods for getting data
  async fetchAgents(): Promise<PredictiveDialerAgent[]> {
    const { data, error } = await customSupabase.from('predictive_dialer_agents').select('*');
    if (error) throw error;
    return data as unknown as PredictiveDialerAgent[];
  },
  
  async fetchCalls(): Promise<PredictiveDialerCall[]> {
    const { data, error } = await customSupabase.from('predictive_dialer_calls').select('*');
    if (error) throw error;
    return data as unknown as PredictiveDialerCall[];
  },
  
  async fetchContacts(): Promise<PredictiveDialerContact[]> {
    const { data, error } = await customSupabase.from('predictive_dialer_contacts').select('*');
    if (error) throw error;
    return data as unknown as PredictiveDialerContact[];
  },
  
  async fetchCallQueue(): Promise<PredictiveDialerQueueItem[]> {
    const { data, error } = await customSupabase.from('predictive_dialer_call_queue').select('*');
    if (error) throw error;
    return data as unknown as PredictiveDialerQueueItem[];
  },
};

// Import these types to ensure proper typing 
import { 
  PredictiveDialerAgent, 
  PredictiveDialerCall, 
  PredictiveDialerContact, 
  PredictiveDialerQueueItem 
} from '@/types/predictive-dialer';
