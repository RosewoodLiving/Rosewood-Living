import { createSupabaseAdmin } from "./supabase";

export interface LeadRow {
  lead_type: "general_enquiry" | "letter_of_intent";
  name: string;
  company: string;
  email: string;
  source: string;
  role?: string | null;
  phone?: string | null;
  project_location?: string | null;
  /** Comma-joined list of selected development types (LOI only). */
  development_types?: string | null;
  dwellings?: string | null;
  project_stage?: string | null;
  // Structured project breakdown (LOI only) — whole numbers, null when not provided.
  total_apartments?: number | null;
  affordable_apartments?: number | null;
  boarding_rooms?: number | null;
  co_living_rooms?: number | null;
  serviced_apartments?: number | null;
  retail_area_sqm?: number | null;
  commercial_area_sqm?: number | null;
  message?: string | null;
}

/**
 * Best-effort lead persistence. Never throws — if Supabase isn't configured
 * yet (no env), it simply reports `stored: false` so the form still succeeds.
 */
export async function storeLead(
  env: Env,
  row: LeadRow,
): Promise<{ stored: boolean; error?: string }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { stored: false };
  }
  try {
    const supabase = createSupabaseAdmin(env);
    const { error } = await supabase.from("leads").insert(row);
    if (error) return { stored: false, error: error.message };
    return { stored: true };
  } catch (err) {
    return { stored: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
