#!/usr/bin/env node
/**
 * P2 — CTWA con intención extra → Haiku mismo turno (sin solo welcome).
 * Origen: docs/waba/analysis/2026-07-03-analysis.md (…9072 Alexandra)
 *
 * P2-B — CTWA + precio ~5s después (Yesenia 2026-07-11): coalesce/retry +
 * releer inbound tras imágenes Meta Ads → Haiku responde Builder/precio.
 *
 * P2-C — CTWA «quiero agendar mi cita» → Haiku/lista (no dead-end).
 * P2-D — mismo copy SIN referral → Haiku + from_ad_at por copy (Milagros).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import {
  pollOutboundSince,
  fetchHaikuSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000992";
const CTWA_INTENT = "¡Hola! Quiero más información extenciones de pestañas";
const CTWA_FIESTAS =
  "¡Hola! 👋 Vi tu promo de Fiestas Patrias en Instagram y quiero más info 💜";
/** CTA real de campaña manos/pies — antes caía a texto estático (DETERMINISTIC "agendar"). */
const CTWA_AGENDAR =
  "Hola, vi el 15% de descuento en manos y pies y quiero agendar mi cita 💅";
const PRICE_FOLLOWUP = "Precio del builder gel retoque";
const REFERRAL = {
  source_type: "ad",
  headline: "ZM Lash QA P2",
  ctwa_clid: "qa.ctwa.p2.clid",
};

const EXTENSION_RE = /extension|pestañ|r[ií]mel|cl[aá]sic|volumen/i;
const BUILDER_RE = /builder(\s+gel)?|retiro\s+otro|S\/\s*60|S\/\s*80/i;
const RIGID_BOTONES_RE = /usa los \*?botones\*?/i;
const META_ADS_MENU_DUMP_RE = /Men[uú] principal|Elegir categor[ií]a/i;
const AGENDAR_DEADEND_ONLY_TEXT_RE =
  /¿Cuál servicio te llama|llamo la atenci[oó]n|Escr[ií]benos y te contamos/i;
/** Dead-end skipSaludoForBooking sin carrito (orgánico / sin referral). */
const SKIP_SALUDO_STATIC_RE =
  /Para agendar, primero elige el servicio o pack/i;
const HANDS_FEET_OR_PROMO_RE =
  /manos|pies|uñas|gel|rubber|promo|S\/\s*\d+|pack/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function waitHaiku(since, minOut = 5) {
  let outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: minOut,
    timeoutMs: 32000,
  });
  let haiku = [];
  const deadline = Date.now() + 14000;
  while (Date.now() < deadline) {
    haiku = await fetchHaikuSince(supabase, TEST_PHONE, since);
    if (haiku.length > 0) break;
    await sleep(1500);
    outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
      minCount: minOut,
      timeoutMs: 3000,
    });
  }
  return { outbound, haiku };
}

async function validateCtwaExtraIntent() {
  console.log("\n── P2: CTWA con intención extra → Haiku mismo turno ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, CTWA_INTENT, {
      wamid: newWamid("wamid.qa.p2"),
      contactName: "QA P2 Alexandra",
      referral: REFERRAL,
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await waitHaiku(since, 5);
  const hasImage = outbound.some((m) => m.msg_type === "image");
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [EXTENSION_RE],
    mustNotMatch: [META_ADS_MENU_DUMP_RE],
    expectHaiku: true,
  });

  const pass = result.pass && hasImage;
  if (!hasImage && result.pass) {
    console.log("  ⚠ Sin OUT tipo image; Haiku OK");
  }

  logCaseResult("P2 CTWA intención extra", { ...result, pass }, outbound);

  return {
    name: "P2 CTWA intención extra",
    pass,
    note: pass ? "imágenes + Haiku" : result.fails.join("; ") || "falló",
  };
}

/** Yesenia: CTWA Fiestas Patrias + precio Builder ~5s después. */
async function validateCtwaPriceBurst() {
  console.log("\n── P2-B: CTWA + precio ~5s → Haiku Builder (no silencio) ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  const since = new Date().toISOString();
  const status1 = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, CTWA_FIESTAS, {
      wamid: newWamid("wamid.qa.p2b.1"),
      contactName: "QA P2 Yesenia",
      referral: { ...REFERRAL, ctwa_clid: "qa.ctwa.p2b.clid" },
    }),
  );
  console.log(`  Webhook1 HTTP ${status1}`);

  await sleep(5000);

  const status2 = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, PRICE_FOLLOWUP, {
      wamid: newWamid("wamid.qa.p2b.2"),
      contactName: "QA P2 Yesenia",
    }),
  );
  console.log(`  Webhook2 HTTP ${status2} (+5s)`);

  // Coalesce base 4.5s + trailing hasta 9s + imágenes + Haiku — no cortar en 4 imgs
  const deadline = Date.now() + 45000;
  let outbound = [];
  let haiku = [];
  while (Date.now() < deadline) {
    outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
      minCount: 1,
      timeoutMs: 3000,
    });
    haiku = await fetchHaikuSince(supabase, TEST_PHONE, since);
    const allText = outbound.map((m) => m.content ?? "").join("\n");
    if (BUILDER_RE.test(allText)) break;
    await sleep(2000);
  }
  const allText = outbound.map((m) => m.content ?? "").join("\n");

  const result = assertOutbound(outbound, haiku, {
    mustMatch: [BUILDER_RE],
    mustNotMatch: [RIGID_BOTONES_RE],
  });

  const hasBuilderAnswer = BUILDER_RE.test(allText);
  const pass = result.pass && hasBuilderAnswer && outbound.length >= 2;

  logCaseResult(
    "P2-B CTWA + precio burst",
    {
      ...result,
      pass,
      fails: pass
        ? []
        : [
            ...result.fails,
            !hasBuilderAnswer ? "sin mención Builder/precio/uñas" : "",
            outbound.length < 2 ? "pocos OUT" : "",
          ].filter(Boolean),
    },
    outbound,
  );

  return {
    name: "P2-B CTWA+precio ~5s",
    pass,
    note: pass
      ? "Haiku respondió precio/Builder"
      : result.fails.join("; ") || "sin respuesta Builder",
  };
}

/**
 * P2-C — CTWA "quiero agendar mi cita" (Stefy/Eli): no dead-end de solo texto.
 * Debe haber Haiku y/o lista interactiva con contenido de uñas/promo.
 */
async function validateCtwaAgendarNoDeadend() {
  console.log(
    "\n── P2-C: CTWA «quiero agendar mi cita» → Haiku o lista (no solo texto) ──",
  );
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, CTWA_AGENDAR, {
      wamid: newWamid("wamid.qa.p2c"),
      contactName: "QA P2 Stefy",
      referral: { ...REFERRAL, ctwa_clid: "qa.ctwa.p2c.clid" },
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await waitHaiku(since, 4);
  const hasInteractive = outbound.some(
    (m) =>
      m.msg_type === "interactive" ||
      /\[lista\]|promos|categor/i.test(m.content ?? ""),
  );
  const hasHaikuOrUseful =
    haiku.length > 0 ||
    outbound.some((m) => HANDS_FEET_OR_PROMO_RE.test(m.content ?? ""));
  const onlyStaticCta =
    outbound.filter((m) => m.msg_type === "text" || !m.msg_type).length >= 1 &&
    !hasInteractive &&
    haiku.length === 0 &&
    outbound.every(
      (m) =>
        m.msg_type === "image" ||
        AGENDAR_DEADEND_ONLY_TEXT_RE.test(m.content ?? "") ||
        !(m.content ?? "").trim(),
    );

  const fails = [];
  if (onlyStaticCta) fails.push("solo texto estático Meta Ads (dead-end)");
  if (!hasHaikuOrUseful && !hasInteractive) {
    fails.push("sin Haiku ni lista/contenido uñas-promo");
  }
  if (RIGID_BOTONES_RE.test(outbound.map((m) => m.content).join(" "))) {
    fails.push("respuesta rígida usa los botones");
  }

  const pass = fails.length === 0;
  logCaseResult(
    "P2-C CTWA agendar sin dead-end",
    { pass, fails },
    outbound,
  );

  return {
    name: "P2-C CTWA agendar",
    pass,
    note: pass
      ? hasInteractive
        ? "lista/Haiku (no dead-end)"
        : "Haiku mismo turno"
      : fails.join("; "),
  };
}

/**
 * P2-D — mismo copy de campaña SIN referral Meta.
 * Antes: skipSaludoForBooking → "Para agendar, primero elige…" sin Haiku.
 * Ahora: Haiku + from_ad_at por heurística de copy (Milagros 13-ago).
 */
async function validateOrganicAgendarNoDeadend() {
  console.log(
    "\n── P2-D: copy CTWA sin referral → Haiku + from_ad_at ──",
  );
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, CTWA_AGENDAR, {
      wamid: newWamid("wamid.qa.p2d"),
      contactName: "QA P2 Organico",
      // sin referral a propósito
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await waitHaiku(since, 4);
  const hasInteractive = outbound.some(
    (m) =>
      m.msg_type === "interactive" ||
      /\[lista\]|promos|categor/i.test(m.content ?? ""),
  );
  const hasHaikuOrUseful =
    haiku.length > 0 ||
    outbound.some((m) => HANDS_FEET_OR_PROMO_RE.test(m.content ?? ""));
  const onlySkipSaludoStatic =
    outbound.length >= 1 &&
    haiku.length === 0 &&
    !hasHaikuOrUseful &&
    outbound.some((m) => SKIP_SALUDO_STATIC_RE.test(m.content ?? "")) &&
    !outbound.some((m) => HANDS_FEET_OR_PROMO_RE.test(m.content ?? ""));

  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("from_ad_at")
    .eq("phone", TEST_PHONE)
    .maybeSingle();

  const fails = [];
  if (onlySkipSaludoStatic) {
    fails.push("solo dead-end «Para agendar, primero elige…» (sin Haiku)");
  }
  if (!hasHaikuOrUseful && !hasInteractive) {
    fails.push("sin Haiku ni lista/contenido uñas-promo");
  }
  if (RIGID_BOTONES_RE.test(outbound.map((m) => m.content).join(" "))) {
    fails.push("respuesta rígida usa los botones");
  }
  if (!sess?.from_ad_at) {
    fails.push("from_ad_at null (esperaba mark por copy CTWA 15% manos/pies)");
  }

  const pass = fails.length === 0;
  logCaseResult(
    "P2-D copy CTWA sin referral + from_ad_at",
    { pass, fails },
    outbound,
  );

  return {
    name: "P2-D copy sin referral + from_ad_at",
    pass,
    note: pass
      ? `Haiku/lista + from_ad_at=${String(sess.from_ad_at).slice(0, 19)}`
      : fails.join("; "),
  };
}

async function main() {
  const results = [];
  results.push(await validateCtwaExtraIntent());
  await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 12000);
  results.push(await validateCtwaPriceBurst());
  await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 12000);
  results.push(await validateCtwaAgendarNoDeadend());
  await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 12000);
  results.push(await validateOrganicAgendarNoDeadend());
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  finishAndExit(results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
