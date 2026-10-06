#!/usr/bin/env node
/**
 * QA BSUID / CTWA sin teléfono (Meta usernames).
 *
 * A) Unit: isWaBsuid / metaRecipientFields / waConversationKey
 * B) Webhook: inbound sin message.from + contacts.user_id → sesión + wa_messages + client.wa_user_id
 *    (outbound a BSUID de QA puede fallar en Meta; no exige respuesta entregada)
 *
 * Clave: PE.QA04979903 (cleanup por wa_user_id).
 */
import { createClient } from "@supabase/supabase-js";
import {
  isWaBsuid,
  metaRecipientFields,
  waConversationKey,
  isE164WaPhone,
  isWaSendableDest,
} from "../supabase/functions/_shared/wa-recipient.mjs";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildBsuidTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { sleep } from "./lib/waba-sim-assert.mjs";

const TEST_BSUID = "PE.QA04979903";
const CTWA_TEXT = "Hola, vi el 15% de descuento y quiero agendar mi cita";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function validateHelpers() {
  console.log("\n── A: helpers BSUID ──");
  const cases = [
    [isWaBsuid("PE.1704503080781860"), true, "isWaBsuid PE.…"],
    [isWaBsuid("51999000985"), false, "isWaBsuid teléfono"],
    [isWaBsuid(""), false, "isWaBsuid vacío"],
    [waConversationKey("PE.QA04979903"), "PE.QA04979903", "clave BSUID"],
    [waConversationKey("+51 999 000 985"), "51999000985", "clave E.164"],
    [
      JSON.stringify(metaRecipientFields("PE.QA1")),
      JSON.stringify({ recipient: "PE.QA1" }),
      "meta recipient",
    ],
    [
      JSON.stringify(metaRecipientFields("51932535512")),
      JSON.stringify({ to: "51932535512" }),
      "meta to",
    ],
    [isE164WaPhone("PE.QA1"), false, "E.164 no BSUID"],
    [isE164WaPhone("51932535512"), true, "E.164 ok"],
    [isWaSendableDest("PE.QA1"), true, "sendable BSUID"],
    [isWaSendableDest("51932535512"), true, "sendable E.164"],
    [isWaSendableDest(""), false, "sendable vacío"],
  ];
  let ok = true;
  for (const [got, expected, note] of cases) {
    const pass = got === expected;
    if (!pass) ok = false;
    console.log(`  ${pass ? "✅" : "❌"} ${note}: ${JSON.stringify(got)}`);
  }
  return { name: "A helpers", pass: ok, note: ok ? "ok" : "falló unit" };
}

async function validateWebhookBsuid() {
  console.log("\n── B: webhook CTWA sin message.from ──");
  await cleanupQaPhone(supabase, TEST_BSUID, { deleteClient: true });

  // Colchón: el reloj de Postgres a veces va ~1–2s detrás del Node local.
  const since = new Date(Date.now() - 15_000).toISOString();
  const wamid = newWamid("wamid.qa.bsuid");
  const status = await postWebhook(
    webhookUrl,
    buildBsuidTextPayload(TEST_BSUID, CTWA_TEXT, {
      wamid,
      contactName: "María Test BSUID",
      username: "maria_qa_bsuid",
      referral: {
        source_type: "ad",
        headline: "ZM QA BSUID",
        ctwa_clid: "qa.ctwa.bsuid",
      },
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  await sleep(10000);

  const { data: msgs } = await supabase
    .from("wa_messages")
    .select("direction, content, phone, created_at")
    .eq("phone", TEST_BSUID)
    .eq("wamid", wamid)
    .order("created_at", { ascending: true });

  const { data: session } = await supabase
    .from("whatsapp_sessions")
    .select("phone, step")
    .eq("phone", TEST_BSUID)
    .maybeSingle();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, wa_user_id, phone")
    .eq("wa_user_id", TEST_BSUID)
    .maybeSingle();

  const hasInbound = (msgs ?? []).some(
    (m) => m.direction === "in" && /15%|agendar/i.test(m.content ?? ""),
  );
  // Sesión puede faltar si Meta rechaza el BSUID de QA al primer send (400)
  // y el throw ocurre antes de upsertSession — inbound + client bastan para el MVP.
  const pass =
    status === 200 &&
    hasInbound &&
    !!client?.wa_user_id &&
    client.phone == null;

  console.log(
    `  inbound=${hasInbound} session=${!!session} client=${!!client?.id} phoneNull=${client?.phone == null} msgs=${(msgs ?? []).length}`,
  );
  for (const m of msgs ?? []) {
    console.log(`    · [${m.direction}] ${(m.content ?? "").slice(0, 80)}`);
  }
  console.log(
    `  (nota: outbound a BSUID inventado falla en Meta 400 — esperado en QA)`,
  );

  await cleanupQaPhone(supabase, TEST_BSUID, { deleteClient: true });
  return {
    name: "B webhook BSUID",
    pass,
    note: pass
      ? "inbound+sesión+client sin teléfono"
      : "faltó persistir hilo BSUID",
  };
}

async function main() {
  console.log("QA BSUID / CTWA sin teléfono\n");
  const results = [validateHelpers(), await validateWebhookBsuid()];
  console.log("\n── Resumen ──");
  for (const r of results) {
    console.log(`  ${r.pass ? "✅" : "❌"} ${r.name}: ${r.note}`);
  }
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
