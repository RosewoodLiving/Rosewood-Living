import { createSupabaseAdmin } from "./supabase";

export interface LeadRow {
  lead_type: "general_enquiry" | "letter_of_intent";
  name: string;
  company: string;
  role: string | null;
  email: string;
  phone: string | null;
  project_location: string | null;
  project_type: string | null;
  dwellings: string | null;
  project_stage: string | null;
  message: string | null;
  source: string;
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
