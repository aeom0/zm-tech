"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./clientes";

interface ConvertirLeadParams {
  /** ID del registro en `contacts` si el lead es del formulario de contacto */
  contactId?: string;
  /** ID del registro en `quote_leads` si el lead es del cotizador */
  quoteLeadId?: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export async function convertirLeadACliente(
  params: ConvertirLeadParams,
): Promise<ActionResult<{ clienteId: string }>> {
  if (!params.contactId && !params.quoteLeadId) {
    return { ok: false, error: "Se requiere contactId o quoteLeadId" };
  }

  const supabase = await createClient();

  const payload = {
    name: params.name,
    email: params.email,
    phone: params.phone,
    status: "activo" as const,
    source: params.contactId ? ("landing" as const) : ("cotizador" as const),
    source_contact_id: params.contactId ?? null,
    source_quote_lead_id: params.quoteLeadId ?? null,
    vertical: "otro" as const,
  };

  const { data, error } = await supabase
    .from("hub_clients")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/leads");
  revalidatePath("/clientes");
  revalidatePath("/dashboard");

  return { ok: true, data: { clienteId: data.id as string } };
}
