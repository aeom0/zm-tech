/**
 * Seed de historial wa_messages para simular contexto previo (saludo, menú, etc.).
 */

export async function seedOutboundAt(supabase, phone, rows, ageMsAgo) {
  const created_at = new Date(Date.now() - ageMsAgo).toISOString();
  const payload = rows.map((row) => ({
    phone,
    direction: "out",
    created_at,
    ...row,
  }));
  const { error } = await supabase.from("wa_messages").insert(payload);
  if (error) throw new Error(`seed outbound: ${error.message}`);
}

/** Simula flujo de bienvenida: texto Haiku + lista interactiva hace N ms. */
export async function seedWelcomeMenuSentAgo(supabase, phone, ageMsAgo) {
  await supabase.from("whatsapp_sessions").upsert({
    phone,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
  await seedOutboundAt(
    supabase,
    phone,
    [
      {
        msg_type: "text",
        content:
          "Hola, qué gusto tenerte por aquí 🦋 Es el momento perfecto para lucir al 100.",
      },
      {
        msg_type: "interactive",
        content:
          "[lista] ZM Lash & Nails Beauty: ZM Lash & Nails Beauty 💜 Especialistas en extensiones, lifting, uñas, cejas y más.",
      },
    ],
    ageMsAgo,
  );
}

const DEFAULT_EXT_CLASICAS_ID = "3d5d6ee4-b799-4b93-86eb-b974ec125439";

/** Cliente QA existente (isNew=false en webhook). */
export async function ensureQaClient(supabase, phone, name = "QA Sim") {
  const normalized = phone.slice(2);
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("phone_country", "PE")
    .eq("phone_normalized", normalized)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      name,
      phone,
      phone_country: "PE",
      phone_normalized: normalized,
    })
    .select("id")
    .single();
  if (error) throw new Error(`client: ${error.message}`);
  return created.id;
}

/** Cita scheduled para simular clienta con reserva activa (caso Luana). */
export async function seedScheduledAppointment(supabase, phone, opts = {}) {
  const {
    serviceId = DEFAULT_EXT_CLASICAS_ID,
    employeeId = "emp-sthefani",
    date = "2026-07-10 14:00:00",
    clientName = "QA Luana Sim",
    sessionStep = "completed",
  } = opts;

  const clientId = await ensureQaClient(supabase, phone, clientName);

  const { data: appt, error } = await supabase
    .from("appointments")
    .insert({
      client_id: clientId,
      client_name: clientName,
      client_phone: phone,
      whatsapp_phone: phone,
      service_id: serviceId,
      employee_id: employeeId,
      date,
      duration: 90,
      price: "70.00",
      status: "scheduled",
    })
    .select("id")
    .single();
  if (error) throw new Error(`appointment: ${error.message}`);

  await supabase.from("appointment_services").insert({
    appointment_id: appt.id,
    service_id: serviceId,
    employee_id: employeeId,
  });

  await supabase.from("whatsapp_sessions").upsert({
    phone,
    step: sessionStep,
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    selected_day: null,
    parsed_datetime: null,
    reschedule_appointment_id: null,
    updated_at: new Date().toISOString(),
  });

  return { appointmentId: appt.id, clientId };
}

/** Sesión con carrito listo para agendar (mismo teléfono con cita ya activa). */
export async function seedSessionWithCart(supabase, phone, serviceId, price) {
  const cartItems = JSON.stringify([
    { item_type: "service", item_id: serviceId, quantity: 1, price },
  ]);
  await supabase.from("whatsapp_sessions").upsert({
    phone,
    step: "browsing",
    cart_items: cartItems,
    cart_service_ids: JSON.stringify([serviceId]),
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

/** Sesión inactiva (>24h) para clienta recurrente desde Meta Ads (P4). */
export async function seedStaleReturningSession(
  supabase,
  phone,
  ageMsAgo = 4 * 24 * 60 * 60 * 1000,
) {
  await ensureQaClient(supabase, phone, "QA P4 Returning");
  const updated_at = new Date(Date.now() - ageMsAgo).toISOString();
  await supabase.from("whatsapp_sessions").upsert({
    phone,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at,
  });
}

/** Cuenta citas scheduled por sufijo de teléfono QA. */
export async function countScheduledAppointments(supabase, phone) {
  const last9 = phone.replace(/\D/g, "").slice(-9);
  const { count, error } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .ilike("client_phone", `%${last9}%`)
    .eq("status", "scheduled");
  if (error) throw new Error(`count appointments: ${error.message}`);
  return count ?? 0;
}
