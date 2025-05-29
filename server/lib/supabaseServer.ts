import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client initialization
// Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables for server-side client');
  // Depending on your setup, you might want to throw an error or handle this differently
  // throw new Error('Missing Supabase environment variables for server-side client');
}

export const supabase = createClient(
  supabaseUrl || '', // Provide empty string as fallback for type safety if not throwing
  supabaseServiceRoleKey || '', // Provide empty string as fallback for type safety if not throwing
  {
    auth: {
      // IMPORTANT: Set storage to undefined to prevent the client from trying to use browser storage
      storage: undefined,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
); 