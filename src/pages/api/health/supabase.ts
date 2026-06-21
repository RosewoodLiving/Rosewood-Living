import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createSupabaseAdmin } from "../../../lib/supabase";

// Server-rendered (runs in the Cloudflare Worker), not prerendered.
export const prerender = false;

/**
 * Temporary connection check. Confirms SUPABASE_URL + service-role key are
 * valid by making an authenticated admin call. Safe to delete once the real
 * enquiry pipeline is in place. Returns no secrets.
 */
export const GET: APIRoute = async () => {
  try {
    const supabase = createSupabaseAdmin(env);
    const { error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      return Response.json(
        { ok: false, stage: "auth", message: error.message },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      message: "Supabase connection and service-role key are valid.",
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        stage: "config",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};
