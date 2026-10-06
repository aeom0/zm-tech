#!/usr/bin/env node
/**
 * Quick Win #2 (docs/waba/analysis/2026-07-09-analysis.md): el fallback
 * "No pude procesar la opción" en dispatcher.ts solo cubría msgType
 * "interactive". Un botón de plantilla (quick-reply, msgType "button") con
 * button.text/payload vacíos quedaba con userInput="" y messageText="" pero
 * NO se le respondía nada — mensaje descartado en silencio.
 * Fix: dispatcher.ts ahora también dispara el fallback para msgType "button".
 *
 * Casos:
 *  A: botón de plantilla con texto/payload vacíos → antes silencio, ahora
 *     responde "No pude procesar la opción. Escribe *menu* para ver el menú."
 *  B (control): botón de plantilla "Confirmo mi cita" (texto normal, ya
 *     arreglado en commit 82c8d18) sigue confirmando la cita sin regresión.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildButtonPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  pollResponseSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000986";

const FALLBACK_RE = /No pude procesar la opción/i;
const CONFIRM_RE = /Tu cita está confirmada/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedBrowsingSession() {
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function validateFallbackBotonVacio() {
  console.log(
    "\n── Caso A: botón de plantilla con texto/payload vacíos → fallback ──",
  );
  // Cliente ya existente (no nueva) — un botón de plantilla vacío suele llegar de
  // una clienta con cita previa (recordatorio_cita_zm), no de un contacto nuevo.
  // Si el cliente fuera nuevo, showWelcome se activa antes de llegar al fallback
  // (isNew=true + mensaje sin intención específica), lo cual es un flujo distinto
  // y no el que este caso busca validar.
  await ensureQaClient(supabase, PHONE, "QA Button Vacío");
  await seedBrowsingSession();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "", {
      payload: "",
      wamid: newWamid("wamid.qa.button.a"),
      contactName: "QA Button Vacío",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(supabase, PHONE, since);

  const result = assertOutbound(outbound, haiku, {
    mustMatch: [FALLBACK_RE],
    expectHaiku: false,
  });

  logCaseResult("Button-A texto/payload vacíos", result, outbound);

  return {
    name: "Caso A (botón de plantilla vacío)",
    pass: result.pass,
    note: result.pass
      ? "Responde fallback en vez de descartar el mensaje en silencio"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateConfirmBotonControl() {
  console.log(
    "\n── Caso B (control): botón 'Confirmo mi cita' → sigue confirmando ──",
  );
  await cleanupQaPhone(supabase, PHONE, { deleteClient: false });
  await seedBrowsingSession();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Confirmo mi cita", {
      wamid: newWamid("wamid.qa.button.b"),
      contactName: "QA Button Confirmo",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(supabase, PHONE, since);

  const result = assertOutbound(outbound, haiku, {
    mustMatch: [CONFIRM_RE],
    mustNotMatch: [FALLBACK_RE],
    expectHaiku: false,
  });

  logCaseResult("Button-B Confirmo mi cita (control)", result, outbound);

  return {
    name: "Caso B (control, botón con texto normal)",
    pass: result.pass,
    note: result.pass
      ? "Sin regresión: botón de plantilla con texto normal sigue funcionando"
      : result.fails.join("; ") || "Falló",
  };
}

async function main() {
  console.log("Validación fallback botón vacío — teléfono QA:", PHONE);
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);
  // deleteClient:false a partir de aquí — Caso A crea el cliente (ensureQaClient)
  // para que isNew=false y no dispare el flujo de bienvenida en su lugar.

  const results = [];
  try {
    results.push(await validateFallbackBotonVacio());
    await sleep(4000);
    results.push(await validateConfirmBotonControl());
  } finally {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
