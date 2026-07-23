// legacy.ts — Payload plano (n8n/Make): crear cita; requiere tenant_id (UUID del negocio)

import { getSupabase, getOrCreateClient } from "../lib/supabase.ts";
import { toZonedLocalTimestamp } from "../format.ts";
import { checkAvailability } from "./agenda.ts";

export async function handleLegacyPayload(
  body: Record<string, string>,
): Promise<Response> {
  const tenantId = body.tenant_id?.trim();
  if (!tenantId) {
    return new Response(
      JSON.stringify({
        error: "tenant_id es obligatorio (UUID de tenant_settings)",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { clientName, clientPhone, serviceName, employeeName, date, notes } =
    body;
  if (!clientPhone?.trim() || !date?.trim()) {
    return new Response(
      JSON.stringify({ error: "clientPhone y date son obligatorios" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  const supabase = getSupabase();

  const { data: tenantRow, error: tenantErr } = await supabase
    .from("tenant_settings")
    .select("id, timezone")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantErr || !tenantRow) {
    return new Response(JSON.stringify({ error: "tenant_id no encontrado" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const timezone = String(
    (tenantRow as { timezone?: string }).timezone ?? "America/Caracas",
  );

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);
  const service = (services ?? []).find((s: { name: string }) =>
    s.name.toLowerCase().includes((serviceName ?? "").toLowerCase()),
  );

  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);
  const employee =
    (employees ?? []).find((e: { name: string }) =>
      e.name.toLowerCase().includes((employeeName ?? "").toLowerCase()),
    ) ?? (employees ?? [])[0];

  if (!service || !employee) {
    return new Response(
      JSON.stringify({
        error: "Servicio o profesional no encontrado en este negocio",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { client } = await getOrCreateClient(
    supabase,
    tenantId,
    clientPhone.trim(),
    clientName ?? "Cliente WhatsApp",
  );

  const appointmentDate = new Date(date);
  if (Number.isNaN(appointmentDate.getTime())) {
    return new Response(JSON.stringify({ error: "Fecha inválida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const available = await checkAvailability(
    supabase,
    tenantId,
    employee.id,
    appointmentDate,
    Number(service.duration) || 60,
    undefined,
    timezone,
  );
  if (!available) {
    return new Response(JSON.stringify({ error: "Horario no disponible" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const dateLocal = toZonedLocalTimestamp(appointmentDate, timezone);
  const priceStr = String(service.price ?? "0");

  const { data: appt, error: insertErr } = await supabase
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      client_id: client?.id ?? null,
      client_name: clientName ?? "Cliente WhatsApp",
      client_phone: clientPhone ?? null,
      employee_id: employee.id,
      service_id: service.id,
      service_ids: [service.id],
      date: dateLocal,
      duration: Number(service.duration) || 60,
      price: priceStr,
      notes: notes ?? "Cita creada vía integración legacy (WABA)",
      status: "scheduled",
      source: "legacy_waba",
      whatsapp_phone: clientPhone ?? null,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("[legacy] insert appointment:", insertErr);
    return new Response(
      JSON.stringify({
        error: "No se pudo crear la cita",
        detail: insertErr.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  await supabase.from("appointment_services").insert({
    appointment_id: appt.id,
    service_id: service.id,
    employee_id: employee.id,
    price: priceStr,
    duration: Number(service.duration) || 60,
  });

  return new Response(JSON.stringify({ success: true, appointment: appt }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
