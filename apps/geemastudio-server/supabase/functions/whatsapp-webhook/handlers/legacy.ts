// legacy.ts — Formato n8n/Make: crear cita desde payload JSON (no desde webhook Meta)

import { getSupabase, getOrCreateClient } from "../lib/supabase.ts";
import { toLimaLocalTimestamp } from "../format.ts";
import { checkAvailability } from "./agenda.ts";

export async function handleLegacyPayload(
  body: Record<string, string>,
): Promise<Response> {
  const { clientName, clientPhone, serviceName, employeeName, date, notes } =
    body;
  const supabase = getSupabase();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true);
  const service = (services ?? []).find((s: { name: string }) =>
    s.name.toLowerCase().includes((serviceName ?? "").toLowerCase()),
  );
  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .eq("is_active", true);
  const employee =
    (employees ?? []).find((e: { name: string }) =>
      e.name.toLowerCase().includes((employeeName ?? "").toLowerCase()),
    ) ?? (employees ?? [])[0];

  if (!service || !employee) {
    return new Response(
      JSON.stringify({ error: "Servicio o chica no encontrada" }),
      { status: 400 },
    );
  }

  const { client } = await getOrCreateClient(
    supabase,
    clientPhone,
    clientName ?? "Cliente WhatsApp",
  );
  const appointmentDate = new Date(date);
  const available = await checkAvailability(
    supabase,
    employee.id,
    appointmentDate,
    service.duration,
    undefined,
    service.category_id,
  );
  if (!available) {
    return new Response(JSON.stringify({ error: "Horario no disponible" }), {
      status: 400,
    });
  }

  const { data: appt } = await supabase
    .from("appointments")
    .insert({
      client_id: client?.id,
      client_name: clientName ?? "Cliente WhatsApp",
      employee_id: employee.id,
      service_id: service.id,
      date: toLimaLocalTimestamp(appointmentDate),
      duration: service.duration,
      price: service.price,
      notes: notes ?? "Cita creada desde WhatsApp",
      status: "scheduled",
    })
    .select()
    .single();

  return new Response(JSON.stringify({ success: true, appointment: appt }), {
    status: 200,
  });
}
