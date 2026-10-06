#!/usr/bin/env node
/**
 * QA dedicado — fixes 29-ago (caso Star …6469, PRs #85–#87).
 *
 * Caso A: combo cruzado de categorías (Extensiones + Lifting) sin pack real
 * en BD — Haiku no debe escribir el literal "S/?"/"S/??" del ejemplo del
 * prompt ni inventar un precio de "pack"; debe cotizar cada servicio por
 * separado con su precio real de catálogo.
 *
 * Caso B: ubicación enviada 2 veces en el mismo turno — 2 inbound
 * coalescidos (boilerplate CTWA + pregunta de ubicación) no deben disparar
 * el branch determinístico Y el CASO — ubicación de Haiku para el mismo
 * turno. Solo debe salir UN bloque de dirección (match "Calle Artesanos 150").
 * Cierre real: tryClaimLocationSend() (claim atómico, PR #87).
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
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE_PRECIO = "51999000993";
const PHONE_UBICACION = "51999000997";
/** Danae …6318: ubicación y luego efecto — Haiku no debe re-pegar Maps. */
const PHONE_DANAE = "51999000998";

const COMBO_CRUZADO_TEXT =
  "Hola, cuánto me costaría Extensiones Clásicas más Lifting de Pestañas juntos?";
const PLACEHOLDER_RE = /S\/\s*\?{1,2}/;
/** Precio real de catálogo (Yape/promo o lista) — no el placeholder S/?. */
const REAL_PRICE_RE = /S\/\s*\d{2,3}\b/;

const CTWA_BOILERPLATE =
  "¡Hola! 👋 Vi tu anuncio en Instagram y quiero más información 💜";
const LOCATION_QUESTION = "¿Dónde queda el salón?";
const REFERRAL = {
  source_type: "ad",
  headline: "ZM Lash QA fix 29-ago",
  ctwa_clid: "qa.ctwa.fix29ago.clid",
};
/** Dump canónico (calle o Maps). No matchear "Plazuelas" suelto — el menú/listas lo pueden citar. */
const LOCATION_DUMP_RE = /Calle Artesanos 150|maps\.app\.goo\.gl/i;
/** Respuesta de ubicación aunque Haiku parafrasee sin calle. */
const LOCATION_ANSWER_RE =
  /Calle Artesanos 150|maps\.app\.goo\.gl|Las Plazuelas.{0,80}(Benavides|Wong|KFC)|Estamos en Santiago de Surco/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/** Caso A — combo cruzado (Extensiones + Lifting) sin pack real. */
async function caseComboSinPack() {
  console.log(
    "\n── Caso A: combo cruzado sin pack real → sin literal S/? ──",
  );
  await cleanupQaPhone(supabase, PHONE_PRECIO, { deleteClient: true });

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_PRECIO, COMBO_CRUZADO_TEXT, {
      wamid: newWamid("wamid.qa.fix29ago.combo"),
      contactName: "QA Star Combo",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  let outbound = [];
  let haiku = [];
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    outbound = await pollOutboundSince(supabase, PHONE_PRECIO, since, {
      minCount: 1,
      timeoutMs: 3000,
    });
    haiku = await fetchHaikuSince(supabase, PHONE_PRECIO, since);
    if (outbound.length > 0 && haiku.length > 0) break;
    await sleep(2000);
  }

  const text = outbound.map((m) => m.content ?? "").join("\n");
  const fails = [];
  if (PLACEHOLDER_RE.test(text)) {
    fails.push('literal "S/?"/"S/??" presente en la respuesta');
  }
  if (haiku.length === 0) {
    fails.push("Haiku no registró uso en ai_usage_log");
  }
  if (outbound.length === 0) {
    fails.push("sin respuesta OUT");
  }
  // Aviso suave: conviene ver al menos un S/NN (promo o lista). No falla el caso
  // si Haiku frasea sin cifra, siempre que no haya placeholder.
  if (outbound.length > 0 && !REAL_PRICE_RE.test(text)) {
    console.log(
      "  ⚠ Ningún S/NN detectado en el texto (revisar manualmente; no es fail)",
    );
  }

  const pass = fails.length === 0;
  logCaseResult(
    "Caso A combo sin pack",
    {
      pass,
      fails,
      outboundCount: outbound.length,
      haikuCount: haiku.length,
    },
    outbound,
  );

  return {
    name: "Caso A (combo cruzado sin pack → sin S/?)",
    pass,
    note: pass
      ? `OK, sin placeholder (OUT=${outbound.length}, Haiku=${haiku.length})`
      : fails.join("; "),
  };
}

/** Caso B — 2 inbound coalescidos (CTWA + ubicación) → 1 sola dirección enviada. */
async function caseUbicacionNoDuplicada() {
  console.log(
    "\n── Caso B: CTWA + pregunta de ubicación coalescidos → 1 sola dirección ──",
  );
  await cleanupQaPhone(supabase, PHONE_UBICACION, { deleteClient: true });

  const since = new Date().toISOString();
  const status1 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_UBICACION, CTWA_BOILERPLATE, {
      wamid: newWamid("wamid.qa.fix29ago.ctwa1"),
      contactName: "QA Star Ubicacion",
      referral: REFERRAL,
    }),
  );
  console.log(`  Webhook1 (CTWA) HTTP ${status1}`);

  await sleep(1500);

  const status2 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_UBICACION, LOCATION_QUESTION, {
      wamid: newWamid("wamid.qa.fix29ago.ctwa2"),
      contactName: "QA Star Ubicacion",
    }),
  );
  console.log(`  Webhook2 (ubicación) HTTP ${status2} (+1.5s)`);

  // Coalesce base 4.5s + reintentos + Haiku ~5-9s
  let outbound = [];
  const deadline = Date.now() + 35000;
  while (Date.now() < deadline) {
    outbound = await pollOutboundSince(supabase, PHONE_UBICACION, since, {
      minCount: 1,
      timeoutMs: 3000,
    });
    if (outbound.some((m) => LOCATION_ANSWER_RE.test(m.content ?? ""))) {
      // dar un margen extra por si el segundo envío duplicado llega tarde
      await sleep(6000);
      outbound = await pollOutboundSince(supabase, PHONE_UBICACION, since, {
        minCount: 1,
        timeoutMs: 3000,
      });
      break;
    }
    await sleep(2000);
  }

  const locationHits = outbound.filter((m) =>
    LOCATION_ANSWER_RE.test(m.content ?? ""),
  );
  const dumpHits = outbound.filter((m) =>
    LOCATION_DUMP_RE.test(m.content ?? ""),
  );
  const fails = [];
  if (locationHits.length === 0) {
    fails.push("no se envió ningún bloque de dirección (esperaba ≥1)");
  } else if (dumpHits.length > 1) {
    fails.push(
      `dump Calle/Maps enviado ${dumpHits.length} veces (esperado ≤1)`,
    );
  }

  const pass = fails.length === 0;
  logCaseResult(
    "Caso B ubicación no duplicada",
    {
      pass,
      fails,
      outboundCount: outbound.length,
      haikuCount: 0,
    },
    outbound,
  );

  return {
    name: "Caso B (CTWA + ubicación coalescidos → 1 sola dirección)",
    pass,
    note: pass
      ? `OK, dirección enviada ${locationHits.length}x`
      : fails.join("; "),
  };
}

/**
 * Caso C — Danae …6318: "Donde se ubican?" → OUT Maps; luego "Wispy" /
 * efecto → Haiku cotiza SIN re-pegar Calle Artesanos (claim location_reply).
 */
async function caseUbicacionLuegoEfecto() {
  console.log(
    "\n── Caso C: ubicación + efecto seguido → 1 sola dirección (Danae) ──",
  );
  await cleanupQaPhone(supabase, PHONE_DANAE, { deleteClient: true });

  const since = new Date().toISOString();
  const status1 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_DANAE, "Donde se ubican?", {
      wamid: newWamid("wamid.qa.danae.loc1"),
      contactName: "QA Danae Loc",
    }),
  );
  console.log(`  Webhook1 (ubicación) HTTP ${status1}`);

  // Esperar a que salga el Maps determinístico antes del efecto
  let outbound = [];
  const deadline1 = Date.now() + 20000;
  while (Date.now() < deadline1) {
    outbound = await pollOutboundSince(supabase, PHONE_DANAE, since, {
      minCount: 1,
      timeoutMs: 2500,
    });
    if (outbound.some((m) => LOCATION_DUMP_RE.test(m.content ?? ""))) break;
    await sleep(1500);
  }

  await sleep(2500);

  const status2 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_DANAE, "Wispy", {
      wamid: newWamid("wamid.qa.danae.wispy"),
      contactName: "QA Danae Loc",
    }),
  );
  console.log(`  Webhook2 (Wispy) HTTP ${status2} (+2.5s)`);

  await sleep(1500);
  const status3 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_DANAE, "Es el efecto que gustaría", {
      wamid: newWamid("wamid.qa.danae.efecto"),
      contactName: "QA Danae Loc",
    }),
  );
  console.log(`  Webhook3 (efecto) HTTP ${status3}`);

  const deadline2 = Date.now() + 35000;
  while (Date.now() < deadline2) {
    outbound = await pollOutboundSince(supabase, PHONE_DANAE, since, {
      minCount: 2,
      timeoutMs: 3000,
    });
    const hasWispyish = outbound.some((m) =>
      /wispy|145|extensiones/i.test(m.content ?? ""),
    );
    if (hasWispyish) {
      await sleep(6000);
      outbound = await pollOutboundSince(supabase, PHONE_DANAE, since, {
        minCount: 2,
        timeoutMs: 3000,
      });
      break;
    }
    await sleep(2000);
  }

  const locationHits = outbound.filter((m) =>
    LOCATION_DUMP_RE.test(m.content ?? ""),
  );
  const fails = [];
  if (locationHits.length === 0) {
    fails.push("no se envió ningún bloque de dirección (esperaba ≥1)");
  } else if (locationHits.length > 1) {
    fails.push(
      `dirección enviada ${locationHits.length} veces (esperado exactamente 1)`,
    );
  }

  const pass = fails.length === 0;
  logCaseResult(
    "Caso C ubicación luego efecto",
    {
      pass,
      fails,
      outboundCount: outbound.length,
      haikuCount: 0,
    },
    outbound,
  );

  return {
    name: "Caso C (ubicación + Wispy → 1 sola dirección)",
    pass,
    note: pass
      ? `OK, dirección enviada ${locationHits.length}x (OUT=${outbound.length})`
      : fails.join("; "),
  };
}

async function main() {
  console.log("Validación fixes 29-ago + Danae ubicación (Star …6469 / …6318)");
  const results = [];
  try {
    results.push(await caseComboSinPack());
    await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 10000);
    results.push(await caseUbicacionNoDuplicada());
    await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 10000);
    results.push(await caseUbicacionLuegoEfecto());
  } finally {
    await cleanupQaPhone(supabase, PHONE_PRECIO, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_UBICACION, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_DANAE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
