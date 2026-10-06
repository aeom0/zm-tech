#!/usr/bin/env node
/**
 * P4 — Clienta recurrente que vuelve por anuncio Meta Ads (sesión stale).
 * Origen: docs/waba/analysis/2026-06-27-analysis.md (hilo …7421)
 *
 * Caso A: isNew=false + referral CTWA + sesión >24h → imágenes/texto Meta Ads,
 * no Haiku genérico "hola de nuevo". También escribe from_ad_at.
 *
 * Caso B (Camino A con intención): CTWA con texto específico (precio/servicio)
 * → entra por el bloque temprano fromAd (no showWelcome) y aun así debe
 * poblar whatsapp_sessions.from_ad_at (requisito ads-bounce-nudge).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { seedStaleReturningSession } from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000995";
const META_CTA = "¡Hola! Quiero más información";
/** Texto CTWA real típico: intención específica → Camino A (no showWelcome). */
const CTWA_INTENT = "Hola, precio de lifting de pestañas";
const REFERRAL = {
  source_type: "ad",
  headline: "ZM Lash QA Test",
  ctwa_clid: "qa.ctwa.test.clid",
};

const META_ADS_TEXT_RE = /ZM Lash|Lifting de Pestañas|servicios perfectos/i;
const META_ADS_CTA_RE = /te llama m[aá]s la atenci[oó]n|Escr[ií]benos/i;
const HAIKU_RETURNING_RE = /hola de nuevo|¿hay algún servicio específico/i;
const META_ADS_MENU_DUMP_RE = /Men[uú] principal|Elegir categor[ií]a/i;
const LIFTING_RE = /lifting|pestañ|S\/\s*\d+/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function assertFromAdAt(label) {
  const { data: sess, error } = await supabase
    .from("whatsapp_sessions")
    .select("from_ad_at, ads_bounce_nudge_sent_at")
    .eq("phone", TEST_PHONE)
    .maybeSingle();
  if (error) {
    return { pass: false, detail: `session query: ${error.message}` };
  }
  if (!sess?.from_ad_at) {
    return {
      pass: false,
      detail: `${label}: from_ad_at null (Camino A no marcó CTWA)`,
    };
  }
  const ageMs = Date.now() - new Date(sess.from_ad_at).getTime();
  if (ageMs < 0 || ageMs > 5 * 60 * 1000) {
    return {
      pass: false,
      detail: `${label}: from_ad_at fuera de ventana reciente (${sess.from_ad_at})`,
    };
  }
  return { pass: true, detail: `from_ad_at=${sess.from_ad_at}` };
}

async function validateReturningFromAd() {
  console.log("\n── P4: recurrente stale + CTWA → welcome Meta Ads ──");
  await seedStaleReturningSession(supabase, TEST_PHONE);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, META_CTA, {
      wamid: newWamid("wamid.qa.p4"),
      contactName: "QA P4 Returning",
      referral: REFERRAL,
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 5,
    timeoutMs: 28000,
  });

  const hasImage = outbound.some((m) => m.msg_type === "image");
  const result = assertOutbound(outbound, [], {
    mustMatch: [META_ADS_TEXT_RE, META_ADS_CTA_RE],
    mustNotMatch: [HAIKU_RETURNING_RE, META_ADS_MENU_DUMP_RE],
    expectHaiku: false,
  });

  const fromAd = await assertFromAdAt("P4-A");
  const pass = result.pass && (hasImage || outbound.length >= 2) && fromAd.pass;
  if (!hasImage && pass) {
    console.log(
      "  ⚠ Sin OUT tipo image (puede ser log parcial); texto Meta Ads OK",
    );
  }
  if (!fromAd.pass) console.log(`  ✗ ${fromAd.detail}`);
  else console.log(`  ✓ ${fromAd.detail}`);

  logCaseResult("P4 returning Meta Ads", { ...result, pass }, outbound);

  return {
    name: "P4 (returning from ad)",
    pass,
    note: pass
      ? "Welcome Meta Ads + from_ad_at"
      : [...result.fails, fromAd.pass ? null : fromAd.detail]
          .filter(Boolean)
          .join("; ") || "Falló",
  };
}

/**
 * Camino A con intención específica: el bug histórico era que from_ad_at
 * solo se escribía en showWelcome (saludo ≤20 chars), nunca aquí.
 */
async function validateCtwaIntentMarksFromAdAt() {
  console.log(
    "\n── P4-B: CTWA + intención específica → from_ad_at (Camino A) ──",
  );
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await seedStaleReturningSession(supabase, TEST_PHONE);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, CTWA_INTENT, {
      wamid: newWamid("wamid.qa.p4b"),
      contactName: "QA P4 Intent",
      referral: { ...REFERRAL, ctwa_clid: "qa.ctwa.p4b.clid" },
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 2,
    timeoutMs: 32000,
  });

  const fromAd = await assertFromAdAt("P4-B");
  // Respuesta puede ser Haiku (precio lifting) o CTA Meta Ads; lo crítico es from_ad_at.
  const hasReply = outbound.length >= 1;
  const hasLiftingOrAds = outbound.some(
    (m) =>
      typeof m.content === "string" &&
      (LIFTING_RE.test(m.content) || META_ADS_TEXT_RE.test(m.content)),
  );

  const pass = fromAd.pass && hasReply;
  const fails = [];
  if (!fromAd.pass) fails.push(fromAd.detail);
  if (!hasReply) fails.push("sin outbound");
  if (!hasLiftingOrAds && pass) {
    console.log("  ⚠ Outbound sin lifting/Meta Ads explícito; from_ad_at OK");
  }

  logCaseResult("P4-B CTWA intención → from_ad_at", { pass, fails }, outbound);
  if (fromAd.pass) console.log(`  ✓ ${fromAd.detail}`);

  return {
    name: "P4-B (CTWA intent from_ad_at)",
    pass,
    note: pass ? "Camino A escribe from_ad_at" : fails.join("; ") || "Falló",
  };
}

async function main() {
  console.log("Validación P4 — teléfono QA:", TEST_PHONE);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  try {
    const a = await validateReturningFromAd();
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
    if (process.env.WABA_VALIDATE_SUITE) await sleep(2000);
    const b = await validateCtwaIntentMarksFromAdAt();
    finishAndExit([a, b]);
  } finally {
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
