"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { contratoFormSchema, type ContratoFormValues } from "@/lib/validation/contratos";
import type { ActionResult } from "./clientes";

export async function crearContrato(
  values: ContratoFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = contratoFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hub_contracts")
    .insert({
      client_id: parsed.data.clientId,
      project_id: parsed.data.projectId ?? null,
      amount_usd: parsed.data.amountUsd?.toString() ?? null,
      payment_model: parsed.data.paymentModel,
      monthly_support_usd: parsed.data.monthlySupportUsd?.toString() ?? null,
      support_active: parsed.data.supportActive,
      start_date: parsed.data.startDate ?? null,
      delivered_at: parsed.data.deliveredAt ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/clientes/${parsed.data.clientId}`);
  return { ok: true, data: { id: data.id as string } };
}

export async function actualizarContrato(
  id: string,
  clientId: string,
  values: ContratoFormValues,
): Promise<ActionResult> {
  const parsed = contratoFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("hub_contracts")
    .update({
      project_id: parsed.data.projectId ?? null,
      amount_usd: parsed.data.amountUsd?.toString() ?? null,
      payment_model: parsed.data.paymentModel,
      monthly_support_usd: parsed.data.monthlySupportUsd?.toString() ?? null,
      support_active: parsed.data.supportActive,
      start_date: parsed.data.startDate ?? null,
      delivered_at: parsed.data.deliveredAt ?? null,
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, data: null };
}

export async function eliminarContrato(
  id: string,
  clientId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("hub_contracts").delete().eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, data: null };
}
