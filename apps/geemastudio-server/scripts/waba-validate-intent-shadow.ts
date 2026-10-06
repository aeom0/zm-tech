#!/usr/bin/env -S deno run --allow-read --allow-env --config supabase/functions/deno.json
/**
 * Unit test puro (sin webhook / sin Anthropic) — skip gates + espejo regex
 * del modo sombra (`lib/intent-shadow.ts`).
 *
 * Origen: piloto 06–13 ago — ~55 % de acuerdo bruto; ~half filas = QA
 * (`51999000…`) y copy CTWA "quiero agendar" inflaban desacuerdo/tokens.
 */
import {
  computeRegexShadowIntent,
  isCtwaPrefillAgendarCopy,
  messageHasDateOrTimeIntent,
  shouldSkipIntentShadow,
  wouldTryCompleteBookingFromText,
  SHADOW_SYSTEM_PROMPT,
} from "../supabase/functions/whatsapp-webhook/lib/intent-shadow.ts";
import type { SupabaseClient } from "../supabase/functions/whatsapp-webhook/lib/supabase.ts";

type Case = {
  name: string;
  pass: boolean;
};

const cases: Case[] = [];

function check(name: string, pass: boolean) {
  cases.push({ name, pass });
}

// Stub: sin citas pendientes → soft-reschedule cae a otro; confirmText también.
const FAKE_SUPABASE = {
  from(_table: string) {
    const empty = { data: [] as unknown[], error: null };
    const noRow = { data: null, error: null };
    const builder: Record<string, unknown> = {};
    const chain = (result: typeof empty | typeof noRow) => {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "or", "order", "limit", "gte"]) {
        b[m] = () => chain(result);
      }
      b.maybeSingle = () => Promise.resolve(noRow);
      b.then = (
        onfulfilled?: (v: typeof result) => unknown,
        onrejected?: (e: unknown) => unknown,
      ) => Promise.resolve(result).then(onfulfilled, onrejected);
      return b;
    };
    builder.select = () => chain(empty);
    builder.eq = () => chain(empty);
    return builder;
  },
} as unknown as SupabaseClient;
const FAKE_PHONE = "51900000000";

/** Stub con 1 cita scheduled futura + reminder outbound (guards confirm prod). */
function fakeSupabaseConfirmReady(): SupabaseClient {
  const futureDate = "2099-06-15 11:00:00";
  const clientRow = { id: "client-confirm-1" };
  const apptRows = [
    {
      id: "appt-confirm-1",
      date: futureDate,
      price: "70",
      duration: 90,
      client_phone: FAKE_PHONE,
      status: "scheduled",
      service_id: null,
    },
  ];
  const reminderRows = [{ id: "msg-reminder-1" }];
  return {
    from(table: string) {
      const noRow = { data: null, error: null };
      const empty = { data: [] as unknown[], error: null };
      let result: { data: unknown; error: null } = empty;
      if (table === "clients") {
        result = { data: clientRow, error: null };
      } else if (table === "appointments") {
        result = { data: apptRows, error: null };
      } else if (table === "appointment_services") {
        result = empty;
      } else if (table === "services") {
        result = empty;
      } else if (table === "wa_messages") {
        result = { data: reminderRows, error: null };
      }
      const chain = (): Record<string, unknown> => {
        const b: Record<string, unknown> = {};
        for (const m of ["select", "eq", "in", "or", "order", "limit", "gte"]) {
          b[m] = () => chain();
        }
        b.maybeSingle = () =>
          Promise.resolve(
            table === "clients" ? { data: clientRow, error: null } : noRow,
          );
        b.then = (
          onfulfilled?: (v: unknown) => unknown,
          onrejected?: (e: unknown) => unknown,
        ) => Promise.resolve(result).then(onfulfilled, onrejected);
        return b;
      };
      return { select: () => chain() };
    },
  } as unknown as SupabaseClient;
}

// ── Skip: QA phone ──────────────────────────────────────────────────────────
check(
  "QA 51999000978 → skip qa_phone",
  shouldSkipIntentShadow({
    phone: "51999000978",
    messageText: "Hoy podría ser?",
  }) === "qa_phone",
);
check(
  "BSUID QA → skip qa_phone",
  shouldSkipIntentShadow({
    phone: "PE.QA04979903",
    messageText: "hola",
  }) === "qa_phone",
);
check(
  "teléfono real + mensaje normal → no skip",
  shouldSkipIntentShadow({
    phone: "51934565683",
    messageText: "Hoy podría ser?",
  }) === null,
);

// ── Skip: CTWA prefill / boilerplate ────────────────────────────────────────
const CTWA_15 =
  "Hola, vi el 15% de descuento en manos y pies y quiero agendar mi cita 💅";
const CTWA_MIRADA =
  "Hola, vi la promo de Mirada de Impacto y quiero agendar mi cita 💜";

check("isCtwaPrefill 15% → true", isCtwaPrefillAgendarCopy(CTWA_15) === true);
check(
  "isCtwaPrefill Mirada → true",
  isCtwaPrefillAgendarCopy(CTWA_MIRADA) === true,
);
check(
  "CTWA 15% → skip ctwa_prefill",
  shouldSkipIntentShadow({
    phone: "51981444430",
    messageText: CTWA_15,
  }) === "ctwa_prefill",
);
check(
  "CTWA Mirada → skip ctwa_prefill",
  shouldSkipIntentShadow({
    phone: "51981444430",
    messageText: CTWA_MIRADA,
  }) === "ctwa_prefill",
);
check(
  "boilerplate Meta → skip ctwa_boilerplate",
  shouldSkipIntentShadow({
    phone: "51981444430",
    messageText: "¡Hola! Quiero más información",
  }) === "ctwa_boilerplate",
);
check(
  "CTWA + fecha → NO skip (sigue midiendo)",
  shouldSkipIntentShadow({
    phone: "51981444430",
    messageText:
      "Hola, vi el 15% de descuento en manos y pies y quiero agendar el viernes",
  }) === null,
);

// ── Date/time helpers ───────────────────────────────────────────────────────
check(
  "messageHasDateOrTimeIntent 'el viernes' → true",
  messageHasDateOrTimeIntent("el viernes") === true,
);
check(
  "messageHasDateOrTimeIntent 'Quiero extensión rímel' → false",
  messageHasDateOrTimeIntent("Quiero extensión rímel") === false,
);

// ── Espejo regex (sin carrito = otro, no crear_cita) ─────────────────────────
check(
  "regex: CTWA sin carrito → otro",
  (await computeRegexShadowIntent(FAKE_SUPABASE, FAKE_PHONE, CTWA_15, {
    step: "browsing",
  })) === "otro",
);
check(
  "regex: 'Hoy podría ser?' sin carrito → otro",
  (await computeRegexShadowIntent(
    FAKE_SUPABASE,
    FAKE_PHONE,
    "Hoy podría ser?",
    { step: "browsing" },
  )) === "otro",
);
check(
  "wouldTryCompleteBooking sin carrito → false",
  wouldTryCompleteBookingFromText("viernes a las 4", {
    step: "browsing",
  }) === false,
);
check(
  "regex: 'sí' corto SIN pending → otro (no confirmar fantasma)",
  (await computeRegexShadowIntent(FAKE_SUPABASE, FAKE_PHONE, "sí", {
    step: "browsing",
  })) === "otro",
);
check(
  "regex: 'Si' browsing SIN pending → otro (María Elena)",
  (await computeRegexShadowIntent(FAKE_SUPABASE, FAKE_PHONE, "Si", {
    step: "browsing",
  })) === "otro",
);
check(
  "regex: 'sí' CON pending+reminder → confirmar",
  (await computeRegexShadowIntent(
    fakeSupabaseConfirmReady(),
    FAKE_PHONE,
    "sí",
    { step: "browsing" },
  )) === "confirmar_cita_texto_libre",
);
check(
  "wouldTryComplete 'Hoy dia' CON carrito → true",
  wouldTryCompleteBookingFromText("Hoy dia", {
    step: "awaiting_datetime",
    cartItems: [
      { item_type: "service", item_id: "svc-1", quantity: 1, price: 99 },
    ],
  }) === true,
);
check(
  "wouldTryComplete 'En Octubre el 4 o 5' CON carrito → true",
  wouldTryCompleteBookingFromText("En Octubre el 4 o 5", {
    step: "awaiting_datetime",
    cartItems: [
      { item_type: "service", item_id: "svc-1", quantity: 1, price: 70 },
    ],
  }) === true,
);
check(
  "skip: copy CTWA no llama Haiku (tokens)",
  shouldSkipIntentShadow({
    phone: "51908598324",
    messageText: CTWA_15,
  }) === "ctwa_prefill",
);
check(
  "regex: reclamo plural → reclamo_garantia",
  (await computeRegexShadowIntent(
    FAKE_SUPABASE,
    FAKE_PHONE,
    "las pestañas se bajaron por completo, es garantía",
    { step: "browsing" },
  )) === "reclamo_garantia",
);

// ── Auditoría 28-ago: espejo regex debe quedar en otro (conservador) ───────
const AUDIT_SHADOW_OTRO = [
  "Buenas tardes tienes turno hoy a las 4pm",
  "Me confirmas xfavor gracias",
  "Hoy a las 4pm pestañas",
  "Podrá ser a las 5 pm",
  "Estoy a 2 minutos",
  "Ya llegie",
  "Todavía tengo problemas con mis uñas están quebradizas",
];
for (const msg of AUDIT_SHADOW_OTRO) {
  check(
    `audit regex otro: "${msg.slice(0, 28)}…"`,
    (await computeRegexShadowIntent(FAKE_SUPABASE, FAKE_PHONE, msg, {
      step: "browsing",
    })) === "otro",
  );
}

check(
  "prompt sombra incluye reglas anti falso positivo 28-ago",
  SHADOW_SYSTEM_PROMPT.includes("auditoría 28-ago"),
);

let fails = 0;
console.log("QA intent-shadow — skip gates + espejo regex\n");
for (const c of cases) {
  console.log(`${c.pass ? "✅" : "❌"} ${c.name}`);
  if (!c.pass) fails++;
}
console.log(
  fails === 0
    ? `\n✅ ${cases.length}/${cases.length} OK`
    : `\n❌ ${fails}/${cases.length} fallaron`,
);
Deno.exit(fails === 0 ? 0 : 1);
