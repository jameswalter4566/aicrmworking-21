
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://imrmboyczebjlbnkgjns.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltcm1ib3ljemViamxibmtnam5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2Njg1MDQsImV4cCI6MjA1OTI0NDUwNH0.scafe8itFDyN5mFcCiyS1uugV5-7s9xhaKoqYuXGJwQ";

// Create a custom instance of the supabase client to bypass typed schema constraints
export const customSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
