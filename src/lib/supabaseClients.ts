import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * URL: always `NEXT_PUBLIC_SUPABASE_URL` (same in browser and server).
 *
 * Server API routes:
 * - Prefer `SUPABASE_SERVICE_ROLE` (or legacy `SUPABASE_SERVICE_ROLE_KEY`) so
 *   inserts/selects succeed under RLS (anon key often cannot INSERT or read rows back).
 * - Falls back to `NEXT_PUBLIC_SUPABASE_ANON` if service role is not set.
 *
 * Browser: only `NEXT_PUBLIC_SUPABASE_ANON` (never expose service role).
 */
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url?.trim()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }
  return url.trim();
}

function getServerSupabaseKey(): string {
  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON?.trim();

  if (serviceRole) {
    return serviceRole;
  }
  if (!anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON (or set SUPABASE_SERVICE_ROLE for server-side writes).",
    );
  }
  return anon;
}

export function createSupabaseServerClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getServerSupabaseKey();

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createSupabaseBrowserClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON?.trim();
  if (!anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON.");
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
