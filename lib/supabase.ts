import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Config is read LAZILY (inside the factories), not at module load — so a script
// that populates process.env (e.g. a .env.local loader) before calling these
// still works. Falls back to empty strings so `next build`/dev boot without
// secrets.

/**
 * Browser/anon client — safe for client components. Uses the public anon key.
 */
export function createBrowserClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}

/**
 * Server-side client with the service-role key. NEVER import this into client
 * components — the service-role key bypasses RLS.
 */
export function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
