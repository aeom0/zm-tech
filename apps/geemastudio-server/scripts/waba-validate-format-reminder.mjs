#!/usr/bin/env node
/**
 * QA dirigido a reglas de FORMAT_INSTRUCTION tras reorden + FINAL_FORMAT_REMINDER
 * (PR #68). 4 escenarios en teléfonos QA dedicados; cleanup al final.
 *
 * Uso: node scripts/waba-validate-format-reminder.mjs
 * Requiere webhook desplegado con el código de la rama (prompt caching + reminder).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { seedSessionWithCart } from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  pollResponseSince,
  fetchHaikuSince,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE_1 = "51999000978"; // confirmación → add_to_cart
const PHONE_2 = "51999000979"; // última fecha gana
const PHONE_3 = "51999000980"; // terceros
const PHONE_4 = "51999000981"; // reclamo/garantía

const LAMINADO_ID = "svc-laminado-cejas";
const LIFTING_ID = "33fbadcc-30e8-4e82-9913-3a888aea73dc";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function outText(outbound) {
  return outbound.map((m) => String(m.content ?? "")).join("\n---\n");
}

async function getSession(phone) {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("step, cart_items, cart_service_ids, selected_day")
    .eq("phone", phone)
    .maybeSingle();
  return data;
}

async function scenario1ConfirmAddToCart() {
  console.log("\n══ 1) Confirmación → add_to_cart (Laminado de Cejas) ══");
  await cleanupQaPhone(supabase, PHONE_1, { deleteClient: true });

  let since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_1, "cuánto cuesta el laminado de cejas", {
      wamid: newWamid("wamid.qa.fmt.1a"),
      contactName: "QA FormatReminder 1",
    }),
  );
  const out1 = await pollOutboundSince(supabase, PHONE_1, since, {
    timeoutMs: 28000,
    minCount: 1,
  });
  const haiku1 = await fetchHaikuSince(supabase, PHONE_1, since);
  console.log("  Turno precio OUT:\n", outText(out1).slice(0, 600));
  console.log(
    "  Haiku triggers:",
    haiku1.map((h) => `${h.trigger_type}:${h.input_tokens}`).join(", ") ||
      "(ninguno)",
  );

  await sleep(2000);
  since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_1, "sí, ese", {
      wamid: newWamid("wamid.qa.fmt.1b"),
      contactName: "QA FormatReminder 1",
    }),
  );
  const out2 = await pollOutboundSince(supabase, PHONE_1, since, {
    timeoutMs: 28000,
    minCount: 1,
  });
  const haiku2 = await fetchHaikuSince(supabase, PHONE_1, since);
  const session = await getSession(PHONE_1);
  let cartIds = [];
  try {
    cartIds = JSON.parse(String(session?.cart_service_ids ?? "[]"));
  } catch {
    /* ignore */
  }
  const hasLaminado = cartIds.includes(LAMINADO_ID);
  const calendarHint =
    /Elegir fecha|Selecciona.*d[ií]a|date_|¿Qu[eé] d[ií]a/i.test(
      outText(out2),
    );
  const pass = hasLaminado || calendarHint;

  const note = [
    `cart_ids=${JSON.stringify(cartIds)}`,
    `step=${session?.step ?? "?"}`,
    `hasLaminado=${hasLaminado}`,
    `calendarHint=${calendarHint}`,
    `haiku=${haiku2.map((h) => h.trigger_type).join(",") || "none"}`,
  ].join("; ");

  logCaseResult(
    "Fmt-1 confirm→add_to_cart",
    {
      pass,
      fails: pass
        ? []
        : ["no quedó laminado en carrito ni selector de fecha"],
    },
    out2,
  );
  console.log("  Detalle:", note);
  console.log("  Turno confirm OUT:\n", outText(out2).slice(0, 800));

  return {
    name: "1 confirmación → add_to_cart",
    pass,
    outbound: outText(out2),
    note,
  };
}

async function scenario2LastDateWins() {
  console.log("\n══ 2) Última fecha gana (awaiting_datetime + corrección) ══");
  await cleanupQaPhone(supabase, PHONE_2, { deleteClient: true });
  await seedSessionWithCart(supabase, PHONE_2, LIFTING_ID, 70);
  await supabase
    .from("whatsapp_sessions")
    .update({
      step: "awaiting_datetime",
      selected_day: null,
      updated_at: new Date().toISOString(),
    })
    .eq("phone", PHONE_2);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(
      PHONE_2,
      "mejor el 14 no, prefiero el viernes",
      {
        wamid: newWamid("wamid.qa.fmt.2"),
        contactName: "QA FormatReminder 2",
      },
    ),
  );
  const { outbound, haiku } = await pollResponseSince(
    supabase,
    PHONE_2,
    since,
    { timeoutMs: 28000 },
  );
  const text = outText(outbound);
  // FORMAT: usar SOLO la última fecha; no afirmar que quedó agendada en la anterior
  const claimsOldBooked =
    /agendad[oa].*14|qued[oó].*14|reservad[oa].*14|cita confirmada.*14/i.test(
      text,
    );
  const inventsConfirmed = /¡Tu cita está (confirmada|anotada)!/i.test(text);
  const pass = outbound.length > 0 && !claimsOldBooked && !inventsConfirmed;

  logCaseResult(
    "Fmt-2 última fecha gana",
    {
      pass,
      fails: [
        ...(outbound.length === 0 ? ["sin respuesta OUT"] : []),
        ...(claimsOldBooked ? ["afirma cita en el 14"] : []),
        ...(inventsConfirmed ? ["inventa cita confirmada"] : []),
      ],
    },
    outbound,
  );
  console.log(
    "  Haiku:",
    haiku.map((h) => h.trigger_type).join(",") || "none",
  );
  console.log("  OUT:\n", text.slice(0, 800));

  return {
    name: "2 última fecha gana",
    pass,
    outbound: text,
    note: `claimsOldBooked=${claimsOldBooked}; inventsConfirmed=${inventsConfirmed}`,
  };
}

async function scenario3ThirdParty() {
  console.log("\n══ 3) Terceros / 2 personas → no add_to_cart ══");
  await cleanupQaPhone(supabase, PHONE_3, { deleteClient: true });
  // Mencionar servicio + terceros en el mismo turno (o con contexto previo)
  await seedSessionWithCart(supabase, PHONE_3, LIFTING_ID, 70);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_3, "es para mi amiga, somos 2 personas", {
      wamid: newWamid("wamid.qa.fmt.3"),
      contactName: "QA FormatReminder 3",
    }),
  );
  const { outbound, haiku } = await pollResponseSince(
    supabase,
    PHONE_3,
    since,
    { timeoutMs: 25000 },
  );
  const text = outText(outbound);
  const session = await getSession(PHONE_3);
  let cartIds = [];
  try {
    cartIds = JSON.parse(String(session?.cart_service_ids ?? "[]"));
  } catch {
    /* ignore */
  }
  // Gate determinístico o Haiku: mensaje de una cita / aquí mismo; sin nueva cita
  const thirdPartyOk =
    /una cita a la vez|alguien m[aá]s|m[aá]s de una persona|aqu[ií] mismo|932\s*535\s*512/i.test(
      text,
    );
  const noConfirm = !/¡Tu cita está (confirmada|anotada)!/i.test(text);
  const pass = outbound.length > 0 && thirdPartyOk && noConfirm;

  logCaseResult(
    "Fmt-3 terceros",
    {
      pass,
      fails: [
        ...(outbound.length === 0 ? ["sin OUT"] : []),
        ...(!thirdPartyOk ? ["no matchea copy terceros"] : []),
        ...(!noConfirm ? ["confirmó cita"] : []),
      ],
    },
    outbound,
  );
  console.log(
    "  Haiku:",
    haiku.map((h) => h.trigger_type).join(",") || "none (posible gate)",
  );
  console.log("  cart_ids:", cartIds);
  console.log("  OUT:\n", text.slice(0, 800));

  return {
    name: "3 terceros",
    pass,
    outbound: text,
    note: `haiku=${haiku.length}; thirdPartyOk=${thirdPartyOk}`,
  };
}

async function scenario4Complaint() {
  console.log("\n══ 4) Reclamo/garantía → no add_to_cart ══");
  await cleanupQaPhone(supabase, PHONE_4, { deleteClient: true });

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(
      PHONE_4,
      "se me cayeron las pestañas, hace 3 días me las hice",
      {
        wamid: newWamid("wamid.qa.fmt.4"),
        contactName: "QA FormatReminder 4",
      },
    ),
  );
  const { outbound, haiku } = await pollResponseSince(
    supabase,
    PHONE_4,
    since,
    { timeoutMs: 25000 },
  );
  const text = outText(outbound);
  const session = await getSession(PHONE_4);
  let cartIds = [];
  try {
    cartIds = JSON.parse(String(session?.cart_service_ids ?? "[]"));
  } catch {
    /* ignore */
  }
  const empatiaOrGate =
    /garant[ií]a|932\s*535\s*512|lamento|perdón|disculp/i.test(text);
  const noCart = cartIds.length === 0;
  const noConfirm = !/¡Tu cita está (confirmada|anotada)!/i.test(text);
  const pass = outbound.length > 0 && empatiaOrGate && noCart && noConfirm;

  logCaseResult(
    "Fmt-4 reclamo",
    {
      pass,
      fails: [
        ...(outbound.length === 0 ? ["sin OUT"] : []),
        ...(!empatiaOrGate ? ["sin empatía/garantía/932"] : []),
        ...(!noCart ? [`carrito no vacío: ${JSON.stringify(cartIds)}`] : []),
        ...(!noConfirm ? ["confirmó cita"] : []),
      ],
    },
    outbound,
  );
  console.log(
    "  Haiku:",
    haiku.map((h) => h.trigger_type).join(",") || "none (posible gate)",
  );
  console.log("  OUT:\n", text.slice(0, 800));

  return {
    name: "4 reclamo/garantía",
    pass,
    outbound: text,
    note: `haiku=${haiku.length}; cart=${JSON.stringify(cartIds)}`,
  };
}

async function main() {
  console.log("QA FORMAT_REMINDER — webhook:", webhookUrl);
  const results = [];
  results.push(await scenario1ConfirmAddToCart());
  await sleep(1500);
  results.push(await scenario2LastDateWins());
  await sleep(1500);
  results.push(await scenario3ThirdParty());
  await sleep(1500);
  results.push(await scenario4Complaint());

  console.log("\n── Cleanup QA ──");
  for (const p of [PHONE_1, PHONE_2, PHONE_3, PHONE_4]) {
    await cleanupQaPhone(supabase, p, { deleteClient: true });
  }

  console.log("\n══ RESUMEN JSON (pegar en PR) ══");
  console.log(
    JSON.stringify(
      results.map((r) => ({
        name: r.name,
        pass: r.pass,
        note: r.note,
        outbound_preview: (r.outbound || "").slice(0, 500),
      })),
      null,
      2,
    ),
  );

  finishAndExit(results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
