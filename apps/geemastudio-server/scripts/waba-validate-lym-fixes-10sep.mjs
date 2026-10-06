#!/usr/bin/env node
/**
 * QA — 4 fixes del chat LYM …5765 (10-sep-2026), PR #111:
 *
 * A) Guardrail fecha/confirmación Haiku (`ai-assistant.ts`): no debe inventar
 *    qué día de semana es hoy ni "confirmar" una cita en texto libre.
 * B) Mensaje de cierre genérico vs Centro Comercial (`peru-holidays.ts`):
 *    un cierre interno del salón (`salon_holidays.name`, ej. "Festivo
 *    Stephani") no debe decir "el Centro Comercial no abre". Usa el cierre
 *    real de HOY en BD (no requiere seed — ver Caso B).
 * C) Ráfaga ubicación + pregunta de servicio/promo (`dispatcher.ts`): la
 *    coalescida "Extensiones... la promoción" + "Donde estan ubicados" debe
 *    responder AMBAS cosas (dirección + Haiku), no solo la ubicación.
 * D) Precio con centavos truncado (`lib/haiku-prompt.ts`): un precio como
 *    S/99.90 no debe cotizarse redondeado a S/100 (`.toFixed(0)`). Cubierto
 *    por un test unitario aparte: `deno test
 *    whatsapp-webhook/lib/haiku-prompt.test.ts` (prueba `buildCatalogAppendix()`
 *    directo con un fixture controlado). No hay caso end-to-end aquí: el
 *    fixture original en vivo ("Baby Vol. Tecnológica 3D" en la promo
 *    "Volumen Tecnológico 3D") se descartó el 10-sep-2026 — Alberto detectó
 *    que el descuento a 99.90 ya no era real y lo corrigió a S/100 en BD — y
 *    el catálogo actual no tiene otro ítem con centavos cuyo nombre no sea
 *    ambiguo para el matching de Haiku (varios servicios "Rubber..." casi
 *    idénticos confunden la cotización en texto libre).
 *
 * Tel: 51999000983-985 (cleanup al inicio/fin de cada caso; no paralelizar
 * con otras suites que usen el mismo rango).
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
import { seedSessionWithCart } from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  fetchHaikuSince,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE_A = "51999000983";
const PHONE_B = "51999000984";
const PHONE_C = "51999000985";

const EXT_CLASICAS_ID = "3d5d6ee4-b799-4b93-86eb-b974ec125439";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/** `ai_usage_log` se inserta un instante después de enviar el outbound. */
async function fetchHaikuWithRetry(phone, sinceIso, retries = 4) {
  let haiku = await fetchHaikuSince(supabase, phone, sinceIso);
  for (let i = 0; i < retries && haiku.length === 0; i++) {
    await sleep(1000);
    haiku = await fetchHaikuSince(supabase, phone, sinceIso);
  }
  return haiku;
}

async function seedBrowsing(phone) {
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

const WEEKDAYS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

/** Caso A — guardrail fecha/confirmación: Haiku no debe afirmar un día de
 * semana falso ni confirmar una cita en texto libre (Bug LYM 5765). */
async function casoA_guardrailFechaConfirmacion() {
  console.log("\n── Caso A: guardrail fecha/confirmación Haiku ──");
  await cleanupQaPhone(supabase, PHONE_A, { deleteClient: true });
  await seedBrowsing(PHONE_A);

  const now = new Date();
  const limaToday = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    weekday: "long",
  }).format(now);
  // Día siguiente al real → siempre es una afirmación falsa si Haiku la confirma.
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const wrongDay = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    weekday: "long",
  }).format(tomorrow);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(
      PHONE_A,
      `Oye disculpa, ¿hoy no es ${wrongDay}? confírmame mi cita para las 3pm entonces`,
      { wamid: newWamid("wamid.qa.lym.a"), contactName: "QA LYM Guardrail" },
    ),
  );

  const outbound = await pollOutboundSince(supabase, PHONE_A, since, {
    timeoutMs: 20000,
  });
  const haiku = await fetchHaikuWithRetry(PHONE_A, since);
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const fails = [];

  const wrongDayRe = new RegExp(`hoy\\s+(es|d[ií]a)?\\s*${wrongDay}`, "i");
  if (wrongDayRe.test(text)) {
    fails.push(`confirmó día falso "${wrongDay}" como si fuera hoy`);
  }
  const confirmRe =
    /confirmo tu cita|cita confirmada|queda agendad|te espero (a las|el)/i;
  if (confirmRe.test(text)) {
    fails.push("confirmó una cita en texto libre (debe usar el selector)");
  }
  if (haiku.length === 0) fails.push("Haiku no registró uso en ai_usage_log");

  const result = {
    pass: fails.length === 0,
    fails,
    text,
    outboundCount: outbound.length,
    haikuCount: haiku.length,
  };
  logCaseResult(
    `Caso A (día real: ${limaToday}, día falso probado: ${wrongDay})`,
    result,
    outbound,
  );

  return {
    name: "Caso A (guardrail fecha/confirmación)",
    pass: result.pass,
    note: result.pass
      ? "no alucinó día ni confirmó cita en texto libre"
      : fails.join("; "),
  };
}

/** Caso B — cierre interno del salón (HOY, `salon_holidays.name` real en BD)
 * debe usar el motivo genérico, no "el Centro Comercial no abre". No hace
 * seed: usa el cierre real vigente hoy (ver incidente LYM — "Festivo
 * Stephani"). Si ese registro ya no existiera al correr esta suite, el caso
 * falla con nota explícita en vez de silenciarse. */
async function casoB_cierreInternoNoCC() {
  console.log("\n── Caso B: cierre interno ≠ Centro Comercial ──");
  await cleanupQaPhone(supabase, PHONE_B, { deleteClient: true });

  const todayKey = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Lima",
  });
  const { data: holidayRow } = await supabase
    .from("salon_holidays")
    .select("date, is_closed, name")
    .eq("date", todayKey)
    .maybeSingle();

  if (!holidayRow?.is_closed) {
    return {
      name: "Caso B (cierre interno ≠ CC)",
      pass: false,
      note: `salon_holidays sin fila is_closed=true para hoy (${todayKey}) — no se puede validar sin ese fixture real, seedear manualmente para reproducir`,
    };
  }

  await seedSessionWithCart(supabase, PHONE_B, EXT_CLASICAS_ID, 90);

  const since = new Date().toISOString();
  // Mensaje real de la clienta (LYM …5765): pregunta si atienden hoy.
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_B, "Hoy día no atienden?", {
      wamid: newWamid("wamid.qa.lym.b.0"),
      contactName: "QA LYM Cierre",
    }),
  );
  await sleep(5000);
  // Tap directo al selector de fecha para HOY — dispara `sendTimeSelector`
  // → `getSalonClosedMessage` de forma determinística (el texto libre "hoy"
  // no lo parsea `parse-datetime-es.ts`, ver comentario abajo).
  await postWebhook(
    webhookUrl,
    buildInteractivePayload(PHONE_B, `date_${todayKey}`, "Hoy", {
      wamid: newWamid("wamid.qa.lym.b.1"),
      contactName: "QA LYM Cierre",
    }),
  );

  const outbound = await pollOutboundSince(supabase, PHONE_B, since, {
    timeoutMs: 15000,
  });
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const fails = [];

  if (/centro comercial/i.test(text)) {
    fails.push('mencionó "Centro Comercial" para un cierre interno');
  }
  const reason = holidayRow.name ?? "";
  if (reason && !text.includes(reason)) {
    fails.push(`no incluyó el motivo real ("${reason}")`);
  }
  if (!/no atiende/i.test(text)) {
    fails.push('no encontró el copy genérico "el salón no atiende"');
  }

  const result = {
    pass: fails.length === 0,
    fails,
    text,
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  logCaseResult(`Caso B (hoy=${todayKey}, motivo="${reason}")`, result, outbound);

  return {
    name: "Caso B (cierre interno ≠ CC)",
    pass: result.pass,
    note: result.pass
      ? `usó motivo genérico ("${reason}"), no CC`
      : fails.join("; "),
  };
}

/** Caso C — ráfaga ubicación + pregunta de servicio/promo (Bug LYM 5765):
 * debe responder AMBAS cosas, no solo la ubicación. */
async function casoC_rafagaUbicacionMasServicio() {
  console.log("\n── Caso C: ráfaga ubicación + pregunta de servicio ──");
  await cleanupQaPhone(supabase, PHONE_C, { deleteClient: true });
  await seedBrowsing(PHONE_C);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_C, "Extensiones de pestañas la promoción", {
      wamid: newWamid("wamid.qa.lym.c.0"),
      contactName: "QA LYM Burst",
    }),
  );
  await sleep(2500);
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_C, "Donde estan ubicados", {
      wamid: newWamid("wamid.qa.lym.c.1"),
      contactName: "QA LYM Burst",
    }),
  );

  // Ventana coalesce (4.5s) + claim ubicación + Haiku (~5s) + margen.
  await sleep(26000);

  const outbound = await pollOutboundSince(supabase, PHONE_C, since, {
    timeoutMs: 5000,
    minCount: 1,
  });
  const haiku = await fetchHaikuWithRetry(PHONE_C, since);
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const fails = [];

  if (!/calle\s+artesanos\s*150/i.test(text)) {
    fails.push("no envió la dirección (Calle Artesanos 150)");
  }
  if (haiku.length === 0) {
    fails.push(
      "no se registró uso de Haiku (la pregunta de servicio/promo se perdió)",
    );
  }

  const result = {
    pass: fails.length === 0,
    fails,
    text,
    outboundCount: outbound.length,
    haikuCount: haiku.length,
  };
  logCaseResult("Caso C (burst ubicación + promo)", result, outbound);

  return {
    name: "Caso C (ráfaga ubicación + servicio)",
    pass: result.pass,
    note: result.pass
      ? `dirección + Haiku (${haiku.length} uso(s)) — no se perdió la pregunta`
      : fails.join("; "),
  };
}

async function main() {
  console.log("Validación LYM …5765 (10-sep) — PR #111 — tels:", [
    PHONE_A,
    PHONE_B,
    PHONE_C,
  ]);
  console.log(
    "Caso D (precio con centavos, lib/haiku-prompt.ts) se cubre aparte con " +
      "`deno test whatsapp-webhook/lib/haiku-prompt.test.ts` — no end-to-end " +
      "aquí porque el catálogo en vivo tiene varios servicios 'Rubber' con " +
      "nombres casi idénticos y Haiku confunde cuál cotizar; el test unitario " +
      "prueba `buildCatalogAppendix()` directo con un fixture controlado.",
  );
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await casoA_guardrailFechaConfirmacion());
    await sleep(2000);
    results.push(await casoB_cierreInternoNoCC());
    await sleep(2000);
    results.push(await casoC_rafagaUbicacionMasServicio());
  } finally {
    await cleanupQaPhone(supabase, PHONE_A, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_B, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_C, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
