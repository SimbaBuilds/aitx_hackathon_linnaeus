import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Reads config from env; does NOT require real values to boot (falls back to
// empty strings so `next build` and dev can run before secrets are filled in).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Browser/anon client — safe for client components. Uses the public anon key.
 */
export function createBrowserClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Server-side client with the service-role key. NEVER import this into client
 * components — the service-role key bypasses RLS.
 */
export function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
