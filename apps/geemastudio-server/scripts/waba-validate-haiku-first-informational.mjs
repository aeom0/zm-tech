#!/usr/bin/env node
/**
 * Plan 13-sep "Haiku-primero informativo" — Batches 1–4.
 *
 * B1: dispatcher.ts (mentionsConflictingCatalogMidCart === true,
 * matchesMidAgendaBrowseOrAddIntent === false) — antes caía directo a boilerplate
 * ("Ahora tienes en tu selección... elige día u hora") sin intentar Haiku.
 * Carrito con Extensiones Clásicas, pregunta informativa sobre otra categoría
 * (manicure) que NO matchea agregar/ver/tienen/qué hay → debe responder Haiku,
 * no el boilerplate estático.
 *
 * B2: dispatcher.ts (matchesOpenHoursQuestion dentro de awaiting_datetime) —
 * antes siempre `horariosText` estático. Pregunta de horario con señal extra
 * (servicio) → `isMostlyOpenHoursQuestion` da false → Haiku primero,
 * `horariosText` solo de respaldo. Evitar palabras de fecha ("mañana") en el
 * mensaje de prueba: colisionan con tryCompleteBookingFromText (P0).
 *
 * B3a: remap a VER_SELECCION (matchesCartTotalQuestion) con pregunta extra
 * (lifting) → isMostlyCartInspectQuestion false → Haiku antes del dump.
 * B3b: matchesLocationQuestion mixto (dirección + lifting) en browsing →
 * Haiku antes de Maps+menú. Pregunta pura de ubicación sigue estática.
 *
 * B4: catch-all browsing — "reserva para pestañas" no remapea ni pasa
 * detectAITrigger (keyword "reserva") y antes caía al menú genérico.
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
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000981";
const EXT_CLASICAS_ID = "3d5d6ee4-b799-4b93-86eb-b974ec125439";

const BOILERPLATE_RE =
  /Ahora tienes en tu selecci[oó]n:[\s\S]*Si quieres \*agregar\* otro servicio/i;
const MENU_GENERIC_RE =
  /Men[uú] principal|ZM Lash & Nails Beauty.*Especialistas en extensiones, lifting, uñas/i;
const HORARIOS_ESTATICO_RE =
  /Horarios de Atenci[oó]n[\s\S]*Lunes a S[aá]bado[\s\S]*10:00 AM - 6:00 PM/i;
const MENU_TRAS_UBICACION_RE = /Te dejo el men[uú] de nuevo/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/** Carrito con Extensiones Clásicas (cat-extensiones), step awaiting_datetime. */
async function setupSessionContext(mode) {
  await ensureQaClient(supabase, TEST_PHONE, "QA HaikuFirst Sim");
  const cartItems = JSON.stringify([
    {
      item_type: "service",
      item_id: EXT_CLASICAS_ID,
      quantity: 1,
      price: 90,
    },
  ]);
  const withCart = mode !== "browsing";
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: mode === "browsing" ? "browsing" : "awaiting_datetime",
    cart_items: withCart ? cartItems : "[]",
    cart_service_ids: withCart
      ? JSON.stringify([EXT_CLASICAS_ID])
      : JSON.stringify([]),
    employee_assignments: "{}",
    selected_day: null,
    parsed_datetime: null,
    updated_at: new Date().toISOString(),
  });
}

async function pollHaikuReply(supabase, phone, sinceIso) {
  const deadline = Date.now() + 30_000;
  let outbound = [];
  let haiku = [];
  while (Date.now() < deadline) {
    outbound = await fetchOutboundSince(supabase, phone, sinceIso);
    haiku = await fetchHaikuSince(supabase, phone, sinceIso);
    const text = outbound
      .filter((m) => m.msg_type === "text")
      .map((m) => m.content ?? "")
      .join("\n");
    if (text.length > 20) {
      await sleep(2000);
      outbound = await fetchOutboundSince(supabase, phone, sinceIso);
      // logAIUsage es fire-and-forget DESPUÉS de las burbujas — reconsultar
      // o el assert "expectHaiku" falla con OUT de Haiku y 0 filas en el log.
      haiku = await fetchHaikuSince(supabase, phone, sinceIso);
      break;
    }
    await sleep(1500);
  }
  return { outbound, haiku };
}

async function runCase({
  id,
  label,
  message,
  mustMatch,
  mustNotMatch = [],
  mode = "mid-agenda",
}) {
  console.log(`\n── ${id}: ${label} ──`);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await sleep(2000);
  await setupSessionContext(mode);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, message, {
      wamid: newWamid(`wamid.qa.${id}`),
      contactName: "QA HaikuFirst",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);
  console.log(`  IN: "${message}"`);

  const { outbound, haiku } = await pollHaikuReply(supabase, TEST_PHONE, since);

  const result = assertOutbound(outbound, haiku, {
    mustMatch,
    mustNotMatch: [BOILERPLATE_RE, MENU_GENERIC_RE, ...mustNotMatch],
    expectHaiku: true,
    allowPartialWithoutOut: false,
  });

  logCaseResult(`${id} — ${label}`, result, outbound);

  return {
    name: `${id} (${label})`,
    pass: result.pass,
    note: result.pass
      ? "Haiku respondió — sin boilerplate estático"
      : result.fails.join("; "),
  };
}

async function main() {
  console.log("Validación Haiku-primero informativo — teléfono QA:", TEST_PHONE);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(
      await runCase({
        id: "B1",
        label: "pregunta manicure mid-agenda (sin match a browse/add)",
        message: "¿el manicure con rubber se despega rápido?",
        mustMatch: [/manicure|rubber|u[ñn]as/i],
      }),
    );
    results.push(
      await runCase({
        id: "B2",
        label: "horario con señal extra (servicio + día, no genérico)",
        message:
          "cierran temprano? necesito hacerme un lifting de pestañas y no sé si alcanzo",
        mustMatch: [/lifting|pesta[ñn]as/i],
        mustNotMatch: [HORARIOS_ESTATICO_RE],
      }),
    );
    results.push(
      await runCase({
        id: "B3a",
        label: "total del carrito + lifting (no dump estático)",
        message:
          "cuánto sería el total si le agrego lifting de pestañas",
        mustMatch: [/lifting/i],
      }),
    );
    results.push(
      await runCase({
        id: "B3b",
        label: "ubicación + lifting en browsing (no Maps+menú solo)",
        mode: "browsing",
        message:
          "dónde queda el local y atienden lifting de pestañas?",
        mustMatch: [/lifting/i],
        mustNotMatch: [MENU_TRAS_UBICACION_RE],
      }),
    );
    results.push(
      await runCase({
        id: "B4",
        label: "catch-all browsing: reserva + pestañas (no menú genérico)",
        mode: "browsing",
        message: "reserva para pestañas naturales?",
        mustMatch: [/pesta[ñn]as|extensi/i],
      }),
    );
  } finally {
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
    finishAndExit(results);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
