#!/usr/bin/env node
/**
 * QW [P1] análisis 13-ago (Loren …4648):
 * matchesNaturalClosingIntent no debe enviar «¡Nos vemos!» si hay OUT
 * reciente con pregunta (?) o lista interactiva pendiente.
 *
 * Casos:
 *  A (Loren): OUT con "?" + lista hace ~2s → inbound "Gracias" → NO «¡Nos vemos!»
 *  B (Gabriela): OUT confirmación sin "?" → inbound "Gracias!!" → sí «¡Nos vemos!»
 *
 * Teléfonos separados (evita debounce Map / contaminación entre casos):
 *  A 51999000997 · B 51999000996
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import { buildTextPayload, postWebhook, newWamid } from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient, seedOutboundAt } from "./lib/waba-sim-seed.mjs";
import {
  pollResponseSince,
  pollOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE_A = "51999000997"; // Loren
const PHONE_B = "51999000996"; // Gabriela (luana/fixes — cleanup al inicio)

const NOS_VEMOS_RE = /¡?\s*Nos vemos/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedBrowsingSession(phone) {
  const { error } = await supabase.from("whatsapp_sessions").upsert({
    phone,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`session: ${error.message}`);
}

async function caseLorenNoClosingOverPrompt() {
  console.log(
    "\n── Caso A (Loren): pregunta+lista reciente → Gracias NO cierra ──",
  );
  await ensureQaClient(supabase, PHONE_A, "QA Natural Closing A");
  await seedBrowsingSession(PHONE_A);
  await seedOutboundAt(
    supabase,
    PHONE_A,
    [
      {
        msg_type: "text",
        content:
          "Srta. Loren, qué bueno saberlo 💜 ¿Qué servicio te gustaría agendar para el viernes?",
      },
      {
        msg_type: "interactive",
        content: "[lista] Cejas y Rostro: elige un servicio",
      },
    ],
    2_000,
  );

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_A, "Gracias", {
      wamid: newWamid("wamid.qa.closing.a"),
      contactName: "QA Natural Closing A",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_A, since, {
    timeoutMs: 28000,
  });

  const result = assertOutbound(outbound, haiku, {
    mustNotMatch: [NOS_VEMOS_RE],
  });

  logCaseResult("Closing-A Loren (no Nos vemos)", result, outbound);

  return {
    name: "Caso A (Loren — no cerrar sobre prompt)",
    pass: result.pass,
    note: result.pass
      ? "No envió «¡Nos vemos!» con pregunta/lista pendiente"
      : result.fails.join("; ") || "Falló",
  };
}

async function caseGabrielaNaturalClose() {
  console.log(
    "\n── Caso B (Gabriela): sin pregunta pendiente → Gracias!! sí cierra ──",
  );
  await ensureQaClient(supabase, PHONE_B, "QA Natural Closing B");
  await seedBrowsingSession(PHONE_B);
  await seedOutboundAt(
    supabase,
    PHONE_B,
    [
      {
        msg_type: "text",
        content:
          "Listo, gracias — ya actualice tu ficha. Tu cita quedo confirmada para el sabado.",
      },
    ],
    4_000,
  );

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_B, "Gracias!!", {
      wamid: newWamid("wamid.qa.closing.b"),
      contactName: "QA Natural Closing B",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  // No usar pollResponseSince: intent_shadow escribe ai_usage antes del OUT
  // (coalesce ~4.5s) y el poll cortaba con OUT=0 / Haiku=1.
  const outbound = await pollOutboundSince(supabase, PHONE_B, since, {
    timeoutMs: 22000,
    minCount: 1,
  });
  const result = assertOutbound(outbound, [], {
    mustMatch: [NOS_VEMOS_RE],
    expectHaiku: false,
  });

  logCaseResult("Closing-B Gabriela (sí Nos vemos)", result, outbound);

  return {
    name: "Caso B (Gabriela — cierre natural OK)",
    pass: result.pass,
    note: result.pass
      ? "Atajo «¡Nos vemos!» sigue activo sin prompt pendiente"
      : result.fails.join("; ") ||
        `Falló OUT=${outbound.length} Haiku=${haiku.length} text=${result.text?.slice(0, 120)}`,
  };
}

async function main() {
  console.log(
    "Validación cierre natural + prompt pendiente — tel A/B:",
    PHONE_A,
    PHONE_B,
  );
  await cleanupQaPhone(supabase, PHONE_A, { deleteClient: true });
  await cleanupQaPhone(supabase, PHONE_B, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await caseLorenNoClosingOverPrompt());
    await sleep(3000);
    results.push(await caseGabrielaNaturalClose());
  } finally {
    await cleanupQaPhone(supabase, PHONE_A, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_B, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
