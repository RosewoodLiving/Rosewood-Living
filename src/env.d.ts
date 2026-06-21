/// <reference types="astro/client" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}

// Server-side secrets/bindings available via Astro.locals.runtime.env.
// Set real values in .dev.vars (local) and the Cloudflare Pages dashboard (prod).
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  PUBLIC_TURNSTILE_SITE_KEY: string;
  // Optional email routing (fall back to sensible defaults when unset).
  EMAIL_FROM?: string;
  LEADS_NOTIFY_TO?: string;
}
