#!/usr/bin/env node
/**
 * Efectos extensiones — Haiku explica estilos y muestra cat-extensiones (no menú genérico).
 * Origen: lib/extension-effects-guide.ts + análisis WABA 2026-06-23 / 2026-07-02
 *
 * E1: efecto ardilla → explicación visual + Baby Vol; NO add_to_cart Efect Mojado
 * E2: ojo pequeño natural → Clásicas/Rímel u ojo abierto + lista extensiones
 * E3: mojado vs ojo de gato → diferencia clara entre ambos looks
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient, seedOutboundAt } from "./lib/waba-sim-seed.mjs";
import {
  fetchOutboundSince,
  fetchHaikuSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000993";

const MENU_GENERIC_RE =
  /Men[uú] principal|ZM Lash & Nails Beauty.*Especialistas en extensiones, lifting, uñas/i;
const WRONG_ADD_MOJADO_RE =
  /agregu[eé].*Efect Mojado|Listo.*Efect Mojado|add_to_cart.*mojado/i;
const SELF_REDIRECT_RE = /escr[ií]benos al.*932|llama al.*932/i;
/** Lista interactiva O collage de campaña (post CTWA — ya no manda lista subcategoría). */
const EXT_LIST_RE =
  /Extensiones de Pestañas|subcategor[ií]a|\[lista\].*Extensiones|Mirada de Impacto|Mirada Espectacular|\[imagen\].*Rimel|\[imagen\].*Ardilla|Efecto:\s*(Ojo|Mu[nñ]eca|Ardilla)/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/** Contexto: clienta recurrente en browsing tras ver creativo de extensiones. */
async function setupBrowsingExtensionsContext() {
  await ensureQaClient(supabase, TEST_PHONE, "QA Effects Sim");
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
  await seedOutboundAt(
    supabase,
    TEST_PHONE,
    [
      {
        msg_type: "text",
        content:
          "✨ ¡Hola! ZM Lash and Nails Beauty — ¿Cuál servicio te llama más la atención? Escríbenos 💜",
      },
    ],
    45_000,
  );
}

/** Poll Haiku (~5–20s) + posible lista show_category. */
async function pollHaikuEffects(supabase, phone, sinceIso) {
  const deadline = Date.now() + 35_000;
  let outbound = [];
  let haiku = [];
  while (Date.now() < deadline) {
    outbound = await fetchOutboundSince(supabase, phone, sinceIso);
    haiku = await fetchHaikuSince(supabase, phone, sinceIso);
    const haikuText = outbound
      .filter((m) => m.msg_type === "text")
      .map((m) => m.content ?? "")
      .join("\n");
    const hasHaikuReply =
      haiku.length > 0 &&
      haikuText.length > 40 &&
      !/^CTA meta ads|¿Cuál servicio te llama/.test(haikuText.trim());
    if (hasHaikuReply) {
      await sleep(2500);
      outbound = await fetchOutboundSince(supabase, phone, sinceIso);
      break;
    }
    await sleep(1500);
  }
  return { outbound, haiku };
}

async function runEffectsCase({
  id,
  label,
  message,
  mustMatch,
  mustNotMatch = [],
}) {
  console.log(`\n── ${id}: ${label} ──`);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await sleep(2000);
  await setupBrowsingExtensionsContext();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, message, {
      wamid: newWamid(`wamid.qa.${id}`),
      contactName: "QA Effects",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);
  console.log(`  IN: "${message}"`);

  const { outbound, haiku } = await pollHaikuEffects(
    supabase,
    TEST_PHONE,
    since,
  );

  const result = assertOutbound(outbound, haiku, {
    mustMatch,
    mustNotMatch: [
      MENU_GENERIC_RE,
      WRONG_ADD_MOJADO_RE,
      SELF_REDIRECT_RE,
      ...mustNotMatch,
    ],
    expectHaiku: true,
    allowPartialWithoutOut: false,
  });

  logCaseResult(`${id} — ${label}`, result, outbound);

  return {
    name: `${id} (${label})`,
    pass: result.pass,
    note: result.pass
      ? "Haiku explicó + sin anti-patrones"
      : result.fails.join("; "),
  };
}

async function main() {
  console.log("Validación efectos extensiones — teléfono QA:", TEST_PHONE);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(
      await runEffectsCase({
        id: "E1",
        label: "efecto ardilla",
        message: "Qué es el efecto ardilla?",
        mustMatch: [
          /ardilla|esquina externa|rabillo|externo/i,
          /Baby Vol|volumen.*3D|3D/i,
          EXT_LIST_RE,
        ],
        mustNotMatch: [/Efect Mojado.*ardilla|ardilla.*Efect Mojado/i],
      }),
    );

    await sleep(8000);

    results.push(
      await runEffectsCase({
        id: "E2",
        label: "ojo pequeño natural",
        message: "Tengo ojo pequeño, quiero natural pero que se note",
        mustMatch: [
          /Cl[aá]sicas|R[ií]mel|natural/i,
          /ojo peque[nñ]o|Baby Vol|ojo abierto/i,
          EXT_LIST_RE,
        ],
      }),
    );

    await sleep(8000);

    results.push(
      await runEffectsCase({
        id: "E3",
        label: "mojado vs ojo de gato",
        message: "Cuál es la diferencia entre mojado y ojo de gato?",
        mustMatch: [/mojado|h[uú]medo|brillante/i, /gato|rabillo|almendra/i],
        mustNotMatch: [
          /es el mismo|son lo mismo|mismo servicio|misma t[eé]cnica/i,
        ],
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
