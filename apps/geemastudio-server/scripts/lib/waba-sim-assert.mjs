/**
 * Aserciones y lectura de logs post-simulación WABA.
 */
import crypto from "node:crypto";

export function hashPhone(phone) {
  return crypto.createHash("sha256").update(phone).digest("hex").slice(0, 8);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Poll hasta OUT/ Haiku o timeout (webhook: waitUntil + coalesce ~2.5s + Haiku ~5s). */
export async function pollResponseSince(supabase, phone, sinceIso, opts = {}) {
  const { timeoutMs = 22000, intervalMs = 1500 } = opts;
  const deadline = Date.now() + timeoutMs;
  let outbound = [];
  let haiku = [];
  while (Date.now() < deadline) {
    outbound = await fetchOutboundSince(supabase, phone, sinceIso);
    haiku = await fetchHaikuSince(supabase, phone, sinceIso);
    if (outbound.length > 0 || haiku.length > 0) break;
    await sleep(intervalMs);
  }
  return { outbound, haiku };
}

/** Poll hasta que haya al menos minCount mensajes OUT o timeout. */
export async function pollOutboundSince(supabase, phone, sinceIso, opts = {}) {
  const { timeoutMs = 20000, intervalMs = 1500, minCount = 1 } = opts;
  const deadline = Date.now() + timeoutMs;
  let outbound = [];
  while (Date.now() < deadline) {
    outbound = await fetchOutboundSince(supabase, phone, sinceIso);
    if (outbound.length >= minCount) break;
    await sleep(intervalMs);
  }
  return outbound;
}

export async function fetchOutboundSince(supabase, phone, sinceIso) {
  const { data, error } = await supabase
    .from("wa_messages")
    .select("content, msg_type, created_at")
    .eq("phone", phone)
    .eq("direction", "out")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`wa_messages out: ${error.message}`);
  return data ?? [];
}

/** Errores persistidos por el webhook (wa_error_log) para ese teléfono. */
export async function fetchWaErrorsSince(supabase, phone, sinceIso) {
  const { data, error } = await supabase
    .from("wa_error_log")
    .select("step, msg_type, error_message, context, fallback_sent, created_at")
    .eq("phone", phone)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`wa_error_log: ${error.message}`);
  return data ?? [];
}

export async function fetchHaikuSince(supabase, phone, sinceIso) {
  const { data, error } = await supabase
    .from("ai_usage_log")
    .select("trigger_type, input_tokens, output_tokens, created_at")
    .eq("phone_hash", hashPhone(phone))
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`ai_usage_log: ${error.message}`);
  return data ?? [];
}

/**
 * @param {object[]} outbound - filas wa_messages direction=out
 * @param {object[]} haiku - filas ai_usage_log
 * @param {object} rules
 * @param {RegExp[]} [rules.mustMatch]
 * @param {RegExp[]} [rules.mustNotMatch]
 * @param {boolean} [rules.expectHaiku]
 * @param {boolean} [rules.allowPartialWithoutOut] - si Haiku corrió y no hay OUT (número no WA)
 */
export function assertOutbound(outbound, haiku, rules = {}) {
  const {
    mustMatch = [],
    mustNotMatch = [],
    expectHaiku = false,
    allowPartialWithoutOut = true,
  } = rules;

  const text = outbound.map((m) => m.content ?? "").join("\n");
  const fails = [];

  for (const re of mustMatch) {
    const ok = re.test(text);
    const partial =
      allowPartialWithoutOut &&
      expectHaiku &&
      haiku.length > 0 &&
      outbound.length === 0;
    if (!ok && !partial) fails.push(`falta match: ${re}`);
  }

  for (const re of mustNotMatch) {
    if (re.test(text)) fails.push(`prohibido: ${re}`);
  }

  if (expectHaiku && haiku.length === 0) {
    fails.push("Haiku no registró uso en ai_usage_log");
  }

  return {
    pass: fails.length === 0,
    fails,
    text,
    outboundCount: outbound.length,
    haikuCount: haiku.length,
  };
}

/** Imprime detalle de un caso para consola. */
export function logCaseResult(label, result, outbound) {
  console.log(`\n── ${label} ──`);
  console.log(`  Pass: ${result.pass ? "sí" : "no"}`);
  if (result.fails.length) {
    for (const f of result.fails) console.log(`  ✗ ${f}`);
  }
  console.log(`  OUT: ${result.outboundCount} · Haiku: ${result.haikuCount}`);
  for (const m of outbound) {
    console.log(`    · ${(m.content ?? "").slice(0, 120)}`);
  }
}

/** Resumen final y exit code. */
export function finishAndExit(results) {
  console.log("\n── Resumen ──");
  for (const r of results) {
    console.log(`  ${r.pass ? "✅" : "❌"} ${r.name}: ${r.note}`);
  }
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}
