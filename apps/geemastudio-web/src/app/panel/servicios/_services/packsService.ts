import { supabase } from "@/lib/supabase";

export type Pack = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  service_ids: string[];
  is_active: boolean;
};

export type PackInput = Omit<Pack, "id">;

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local",
    );
  }
  return supabase;
}

function normalizePack(row: Record<string, unknown>): Pack {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    price: Number(row.price),
    service_ids: Array.isArray(row.service_ids)
      ? (row.service_ids as string[])
      : [],
    is_active: Boolean(row.is_active),
  };
}

export async function fetchPacks(): Promise<Pack[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("packs").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map((row) =>
    normalizePack(row as Record<string, unknown>),
  );
}

export async function createPack(input: PackInput): Promise<Pack> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("packs")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return normalizePack(data as Record<string, unknown>);
}

export async function updatePack(
  id: string,
  input: Partial<PackInput>,
): Promise<Pack> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("packs")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return normalizePack(data as Record<string, unknown>);
}

export async function deletePack(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("packs").delete().eq("id", id);
  if (error) throw error;
}

export async function togglePackActive(
  id: string,
  is_active: boolean,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("packs").update({ is_active }).eq("id", id);
  if (error) throw error;
}
