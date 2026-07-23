import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** Singleton para hooks/components cliente. Requiere NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local */
export const supabase = supabaseUrl && supabaseAnonKey ? createClient() : null;

export type SupabaseClient = NonNullable<typeof supabase>;
