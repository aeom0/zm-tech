#!/usr/bin/env node
/**
 * Réplica del incidente real de la clienta Fanny Vera (2026-07-10, 10:55 a. m. Lima):
 * en step "awaiting_datetime" (día ya elegido), la clienta mandó 3 mensajes de texto
 * en ráfaga muy junta — "2:30 pm" (t+0), "Por favor" (t+3s), "Cuál es la dirección?"
 * (t+9s) — y el bot quedó 19 min en silencio total, hasta que el equipo intervino
 * manualmente (cita creada a mano, a las 2:00 PM en vez de las 2:30 PM pedidas).
 *
 * No se encontró un bug de lógica obvio revisando el código (parseTimeSlot,
 * TIME_PREFIX, finalizeBookingAfterDatetimeSelection parecen correctos para "2:30 pm"
 * aislado) ni se pudo recuperar el error real de Meta/Graph API (get_logs no alcanza
 * esa ventana horas atrás). Este script reproduce el mismo patrón de timing para
 * observar el comportamiento real y, si algo falla, quede capturado en wa_error_log
 * (agregado en este mismo fix) para diagnóstico.
 *
 * No es un test de pass/fail estricto de una causa ya conocida — es diagnóstico:
 * reporta la transcripción completa de OUT + Haiku + cualquier fila nueva en
 * wa_error_log para este teléfono.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  fetchOutboundSince,
  fetchHaikuSince,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000985";
const SERVICE_ID = "f6b62575-6515-4fd8-997e-1ab4bf9271ca"; // Manicure en Gel S/35
const SELECTED_DAY = "2026-07-13"; // próximo lunes hábil (no feriado, no domingo)

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function setupAwaitingDatetime() {
  await ensureQaClient(supabase, PHONE, "QA Fanny Burst");
  const cartItems = JSON.stringify([
    { item_type: "service", item_id: SERVICE_ID, quantity: 1, price: 35 },
  ]);
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "awaiting_datetime",
    selected_day: SELECTED_DAY,
    cart_items: cartItems,
    cart_service_ids: JSON.stringify([SERVICE_ID]),
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function fetchErrorLogSince(sinceIso) {
  const { data, error } = await supabase
    .from("wa_error_log")
    .select("created_at, step, msg_type, error_message, fallback_sent")
    .eq("phone", PHONE)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`wa_error_log: ${error.message}`);
  return data ?? [];
}

async function sendBurst() {
  console.log("\n── Ráfaga real (timing de Fanny Vera) ──");
  const since = new Date().toISOString();

  const messages = [
    { text: "2:30 pm", delayMs: 0 },
    { text: "Por favor", delayMs: 3000 },
    { text: "Cuál es la dirección?", delayMs: 9000 },
  ];

  for (const m of messages) {
    if (m.delayMs > 0) await sleep(m.delayMs);
    const status = await postWebhook(
      webhookUrl,
      buildTextPayload(PHONE, m.text, {
        wamid: newWamid("wamid.qa.fanny"),
        contactName: "QA Fanny Burst",
      }),
    );
    console.log(`  [t+${m.delayMs}ms] "${m.text}" → HTTP ${status}`);
  }

  // Ventana amplia: coalesce (2.5s) puede encadenarse por cada mensaje + Haiku (~5s)
  // + creación de cita. Esperar hasta 45s en total tras el último mensaje.
  console.log("  Esperando respuestas (hasta 45s tras el último mensaje)...");
  await sleep(45000);

  const outbound = await fetchOutboundSince(supabase, PHONE, since);
  const haiku = await fetchHaikuSince(supabase, PHONE, since);
  const errors = await fetchErrorLogSince(since);

  console.log(`\n  OUT (${outbound.length}):`);
  for (const m of outbound) {
    console.log(`    [${m.created_at}] ${(m.content ?? "").slice(0, 160)}`);
  }
  console.log(`\n  Haiku usage (${haiku.length}):`);
  for (const h of haiku) {
    console.log(`    [${h.created_at}] trigger=${h.trigger_type}`);
  }
  console.log(`\n  wa_error_log (${errors.length}):`);
  for (const e of errors) {
    console.log(
      `    [${e.created_at}] step=${e.step} msg_type=${e.msg_type} fallback_sent=${e.fallback_sent}\n      ${e.error_message}`,
    );
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("date, status, created_at")
    .ilike("client_phone", `%${PHONE.slice(-9)}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  console.log(`\n  Cita creada: ${appt ? JSON.stringify(appt) : "ninguna"}`);

  const silence = outbound.length === 0 && errors.length === 0;
  console.log(
    `\n  ${silence ? "⚠️  SILENCIO TOTAL reproducido (igual que el incidente real)" : "Hubo actividad (OUT y/o error registrado) — no fue silencio total"}`,
  );

  return { outbound, haiku, errors, appt, silence };
}

async function main() {
  console.log("Diagnóstico ráfaga Fanny Vera — teléfono QA:", PHONE);
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  try {
    await setupAwaitingDatetime();
    const result = await sendBurst();

    console.log("\n── Resumen ──");
    console.log(
      `  OUT: ${result.outbound.length} · Haiku: ${result.haiku.length} · Errores: ${result.errors.length}`,
    );
    console.log(
      `  Silencio total reproducido: ${result.silence ? "sí" : "no"}`,
    );

    process.exit(result.silence ? 1 : 0);
  } finally {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
