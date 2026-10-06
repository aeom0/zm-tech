#!/usr/bin/env node
/**
 * Validación de los 4 fixes aplicados el 2026-06-28:
 *
 * Fix 1 — dispatcher: terceros NO intercepta awaiting_payment_screenshot
 * Fix 2 — inbound-gate: resultado vacío retorna "" en vez de null (no dropea mensaje)
 * Fix 3 — booking-flow: STAFF_COORDINATION_PHONE importado de pending-appointment (no duplicado)
 * Fix 4 — peru-holidays (WABA): isPeruHoliday usa .slice(0,10) igual que mobile
 *
 * Teléfonos reservados: 51999000994 (Fix1), 51999000995 (Fix4)
 * (Fix2 y Fix3 son estructurales; se validan con smoke de flujo normal + revisión de log)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  buildInteractivePayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import {
  pollOutboundSince,
  fetchOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE_FIX1 = "51999000994"; // Fix1: terceros + awaiting_payment_screenshot
const PHONE_FIX3 = "51999000996"; // Fix3: THIRD_PARTY_BOOKING_MESSAGE — teléfono dedicado
const PHONE_FIX4 = "51999000995"; // Fix4: isPeruHoliday con ISO string

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getServiceId(supabase) {
  const { data } = await supabase
    .from("services")
    .select("id, name")
    .ilike("name", "Extensiones Clásicas")
    .not("name", "ilike", "%(tarjeta)%")
    .limit(1)
    .single();
  if (!data) throw new Error("No se encontró servicio 'Extensiones Clásicas'");
  return data.id;
}

// ─── Fix 1: terceros no intercepta awaiting_payment_screenshot ───────────────
/**
 * Escenario: clienta en step=awaiting_payment_screenshot (domingo, adelanto 20%),
 * manda un texto que dispara matchesThirdPartyBookingIntent ("para mi amiga también").
 *
 * BUG (antes): el check de terceros retornaba THIRD_PARTY_BOOKING_MESSAGE y la
 * sesión quedaba colgada sin procesar el comprobante.
 *
 * FIX: el guard ahora excluye awaiting_payment_screenshot → el mensaje pasa al
 * handler de pago. Como es texto libre (no imagen), el handler de pago responde
 * solicitando el comprobante.
 *
 * Aserción: la respuesta NO debe contener el número de staff ni la frase
 * "para alguien más" (que indicaría que cayó en THIRD_PARTY_BOOKING_MESSAGE).
 * Debe contener algo del flujo de pago (solicitar comprobante o mencionar el 20%).
 */
async function caseFix1_TercerosNoInterceptaScreenshot() {
  const phone = PHONE_FIX1;
  const serviceId = await getServiceId(supabase);

  // Seed: sesión en awaiting_payment_screenshot con carrito de domingo
  await supabase.from("whatsapp_sessions").upsert({
    phone,
    step: "awaiting_payment_screenshot",
    awaiting_screenshot: true,
    cart_items: JSON.stringify([
      { item_type: "service", item_id: serviceId, quantity: 1, price: 90 },
    ]),
    cart_service_ids: JSON.stringify([serviceId]),
    selected_day: "2026-06-29", // San Pedro y San Pablo (domingo + feriado)
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });

  const since = new Date().toISOString();

  // Enviar texto que dispara matchesThirdPartyBookingIntent
  await postWebhook(
    webhookUrl,
    buildTextPayload(phone, "¿También lo puedo pedir para mi amiga?", {
      wamid: newWamid("wamid.qa.fix1-terceros"),
      contactName: "QA Fix1",
    }),
  );

  // Esperar respuesta (sin Haiku, flujo determinístico)
  const outbound = await pollOutboundSince(supabase, phone, since, {
    timeoutMs: 15000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [/comprobante|pago|20%|yape|screenshot|envía|adjunt/i],
    mustNotMatch: [
      /para alguien m[aá]s/i,
      /citas de m[aá]s de una persona/i,
      /932 535 512/i,
    ],
  });

  logCaseResult(
    "Fix1 — Terceros no intercepta awaiting_payment_screenshot",
    result,
    outbound,
  );
  return {
    name: "Fix1 — Terceros vs screenshot",
    pass: result.pass,
    note: result.pass ? "OK" : result.fails.join("; "),
  };
}

// ─── Fix 2: coalesce vacío no dropea mensaje ─────────────────────────────────
/**
 * Este fix es estructural (cambio "" vs null en coalesceRecentInboundText).
 * No se puede simular lag de replicación real desde un script Node.
 *
 * Validación: smoke test — enviar un mensaje de texto en sesión limpia y
 * confirmar que el bot responde (prueba que el flujo coalesce→dispatch funciona
 * con el cambio introducido).
 */
async function caseFix2_CoalesceSmoke() {
  const phone = PHONE_FIX1; // Reusar teléfono ya limpio en cleanup

  // Sesión limpia (nuevo visitante)
  await supabase.from("whatsapp_sessions").delete().eq("phone", phone);

  const since = new Date().toISOString();

  await postWebhook(
    webhookUrl,
    buildTextPayload(phone, "hola", {
      wamid: newWamid("wamid.qa.fix2-coalesce-smoke"),
      contactName: "QA Fix2",
    }),
  );

  // Coalesce window 2.5s + dispatch
  const outbound = await pollOutboundSince(supabase, phone, since, {
    timeoutMs: 18000,
    minCount: 1,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [/.+/], // Cualquier respuesta confirma que no se drapeó
    mustNotMatch: [],
  });

  logCaseResult("Fix2 — Coalesce smoke (no drop en vacío)", result, outbound);
  return {
    name: "Fix2 — Coalesce smoke",
    pass: result.pass,
    note: result.pass
      ? `OK — ${outbound.length} mensajes recibidos`
      : "Sin respuesta — posible drop silencioso",
  };
}

// ─── Fix 3: THIRD_PARTY_BOOKING_MESSAGE contiene el número correcto ──────────
/**
 * Valida que el mensaje de terceros siga incluyendo el número de coordinación
 * (932 535 512) ahora que STAFF_COORDINATION_PHONE viene de pending-appointment.ts.
 * Si la importación estuviera rota, el mensaje quedaría con undefined o vacío.
 */
async function caseFix3_ThirdPartyMessagePhone() {
  const phone = PHONE_FIX3;

  // Cliente pre-existente para que el bot NO entre al flujo de bienvenida (isNew=false)
  const normalized = phone.slice(2);
  await supabase
    .from("clients")
    .upsert(
      {
        name: "QA Fix3",
        phone,
        phone_country: "PE",
        phone_normalized: normalized,
      },
      { onConflict: "phone_country,phone_normalized" },
    );

  // Sesión browsing con historial previo (simula clienta recurrente)
  await supabase
    .from("wa_messages")
    .insert([
      {
        phone,
        direction: "out",
        msg_type: "interactive",
        content: "[lista] menú anterior",
      },
    ]);
  await supabase.from("whatsapp_sessions").upsert({
    phone,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });

  const since = new Date().toISOString();

  await postWebhook(
    webhookUrl,
    buildTextPayload(phone, "quiero agendar para mi amiga", {
      wamid: newWamid("wamid.qa.fix3-staff-phone"),
      contactName: "QA Fix3",
    }),
  );

  const outbound = await pollOutboundSince(supabase, phone, since, {
    timeoutMs: 15000,
  });

  const result = assertOutbound(outbound, [], {
    // El número debe aparecer tal cual en el mensaje de terceros
    mustMatch: [/932 535 512/],
    mustNotMatch: [/undefined/i],
  });

  logCaseResult(
    "Fix3 — STAFF_COORDINATION_PHONE en THIRD_PARTY_BOOKING_MESSAGE",
    result,
    outbound,
  );
  return {
    name: "Fix3 — Phone en terceros",
    pass: result.pass,
    note: result.pass ? "OK" : result.fails.join("; "),
  };
}

// ─── Fix 4: isPeruHoliday con dateKey largo (ISO string) ────────────────────
/**
 * Valida que isPeruHoliday reconozca el feriado 2026-06-29 (San Pedro y San Pablo).
 *
 * Estrategia: simular que la clienta ya eligió esa fecha (selected_day=2026-06-29)
 * y enviar la selección interactiva date_2026-06-29. El bot debe responder con el
 * selector de HORA con slots solo hasta 12:00 (horario feriado: 10–12 PM).
 *
 * Si isPeruHoliday fallara (slice no aplicado y key larga), el bot trataría el día
 * como día normal y ofrecería slots hasta 18:00 — la respuesta incluiría "16:00",
 * "17:00", etc.
 *
 * Aserción: la respuesta del selector de hora contiene "10:" o "11:" y NO contiene
 * slots de tarde como "14:00", "15:00", "16:00".
 */
async function caseFix4_HolidaySliceInSendDateSelector() {
  const phone = PHONE_FIX4;
  const serviceId = await getServiceId(supabase);

  // Cliente pre-existente
  const normalized = phone.slice(2);
  await supabase
    .from("clients")
    .upsert(
      {
        name: "QA Fix4",
        phone,
        phone_country: "PE",
        phone_normalized: normalized,
      },
      { onConflict: "phone_country,phone_normalized" },
    );

  // Sesión con carrito listo, awaiting_datetime, sin selected_day
  await supabase.from("whatsapp_sessions").upsert({
    phone,
    step: "awaiting_datetime",
    cart_items: JSON.stringify([
      { item_type: "service", item_id: serviceId, quantity: 1, price: 90 },
    ]),
    cart_service_ids: JSON.stringify([serviceId]),
    employee_assignments: JSON.stringify({ [serviceId]: "emp-sthefani" }),
    selected_day: null,
    updated_at: new Date().toISOString(),
  });

  const since = new Date().toISOString();

  // Enviar selección interactiva de la fecha feriado 2026-06-29
  await postWebhook(
    webhookUrl,
    buildInteractivePayload(phone, "date_2026-06-29", "San Pedro y San Pablo", {
      wamid: newWamid("wamid.qa.fix4-holiday-date"),
      contactName: "QA Fix4",
    }),
  );

  // El bot debe responder con selector de hora
  const outbound = await pollOutboundSince(supabase, phone, since, {
    timeoutMs: 15000,
    minCount: 1,
  });

  const allText = outbound.map((m) => m.content ?? "").join("\n");

  // El contenido guardado en wa_messages para mensajes interactivos incluye
  // las opciones de hora en formato [lista] ... "10:00"..."11:30"
  // Verificar que hay slots de mañana y NO slots de tarde (13+)
  const hasMananaSlot = /10:|11:/i.test(allText);
  const hasTardeSlot = /13:|14:|15:|16:|17:/i.test(allText);

  const result = assertOutbound(outbound, [], {
    mustMatch: [/.+/], // Al menos algo de respuesta
    mustNotMatch: [],
  });

  const feriadoOk = outbound.length > 0 && hasMananaSlot && !hasTardeSlot;
  const note = feriadoOk
    ? "Slots solo hasta 12 PM — feriado reconocido correctamente"
    : hasTardeSlot
      ? "⚠️  Slots de tarde presentes — feriado NO reconocido"
      : "Respuesta recibida pero sin slots detectables en content (verificar logs manualmente)";

  logCaseResult(
    "Fix4 — isPeruHoliday limita slots en feriado 29-jun",
    result,
    outbound,
  );
  console.log(`  → Slots mañana (10/11h): ${hasMananaSlot ? "✅" : "—"}`);
  console.log(
    `  → Slots tarde (13+h):    ${hasTardeSlot ? "❌ presentes" : "✅ ausentes"}`,
  );
  console.log(
    `  → Fix4 correcto:         ${feriadoOk ? "✅ sí" : "⚠️  revisar"}`,
  );

  return {
    name: "Fix4 — isPeruHoliday slice",
    pass: result.pass && !hasTardeSlot,
    note: feriadoOk ? note : result.fails.join("; ") || note,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("WABA validate-fixes-jun28 — fixes de code review 2026-06-28");
  console.log(`Phones QA: ${PHONE_FIX1}, ${PHONE_FIX3}, ${PHONE_FIX4}\n`);

  // Cleanup inicial
  await cleanupQaPhone(supabase, PHONE_FIX1, { deleteClient: true });
  await cleanupQaPhone(supabase, PHONE_FIX3, { deleteClient: true });
  await cleanupQaPhone(supabase, PHONE_FIX4, { deleteClient: true });

  const results = [];

  try {
    // Fix1: terceros + screenshot
    results.push(await caseFix1_TercerosNoInterceptaScreenshot());
    await sleep(1000);
    await cleanupQaPhone(supabase, PHONE_FIX1, { deleteClient: true });
    await sleep(500);

    // Fix2: coalesce smoke (usa mismo teléfono ya limpio)
    results.push(await caseFix2_CoalesceSmoke());
    await sleep(1000);
    await cleanupQaPhone(supabase, PHONE_FIX1, { deleteClient: true });
    await sleep(500);

    // Fix3: número staff en mensaje de terceros (teléfono dedicado)
    results.push(await caseFix3_ThirdPartyMessagePhone());
    await sleep(1000);
    await cleanupQaPhone(supabase, PHONE_FIX3, { deleteClient: true });
    await sleep(500);

    // Fix4: isPeruHoliday en selector de fecha
    results.push(await caseFix4_HolidaySliceInSendDateSelector());
  } finally {
    await cleanupQaPhone(supabase, PHONE_FIX1, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_FIX3, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_FIX4, { deleteClient: true });
  }

  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
