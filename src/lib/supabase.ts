import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a server-side Supabase client using the secret/service-role key.
 *
 * This must ONLY be used in server contexts (API routes / endpoints with
 * `export const prerender = false`). The secret key bypasses row-level
 * security and must never reach the browser.
 *
 * Credentials come from the Cloudflare runtime env (Astro.locals.runtime.env),
 * which is populated by `.dev.vars` locally and dashboard secrets in production.
 */
export function createSupabaseAdmin(env: Env): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase env vars missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .dev.vars (local) or Cloudflare secrets (production).",
    );
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
