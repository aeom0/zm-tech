import { createClient } from "@supabase/supabase-js";

// Cliente service_role -- solo para Route Handlers (crons), nunca en cliente/browser.
// Bypasea RLS: usarlo únicamente para escrituras controladas por el propio servidor.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
