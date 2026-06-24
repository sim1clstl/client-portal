import { createClient } from '@supabase/supabase-js';

let client = null;

// Server-only Supabase client using the service role key.
// The service role bypasses RLS, so the database is only reachable from our
// server-side API routes — never from the browser.
export function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
