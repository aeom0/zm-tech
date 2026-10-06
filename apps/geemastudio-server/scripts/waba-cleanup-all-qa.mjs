#!/usr/bin/env node
/**
 * Limpia todos los teléfonos QA WABA (51999000970–51999000999 + extras).
 * Uso: yarn waba:cleanup:qa
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { QA_EXTRA_PHONES } from "../supabase/functions/whatsapp-webhook/lib/qa-phone.mjs";

const QA_PHONES = [
  // Rango 970–977 (piso ampliado 15-sep — view-packs …977)
  "51999000970", // PR #134 Milagros / evaluación / fallback
  "51999000971",
  "51999000972",
  "51999000973",
  "51999000974",
  "51999000975",
  "51999000976",
  "51999000977", // view-packs
  "51999000978", // pati far-date + identity no-spam + payment-verification
  "51999000979", // browse-reengage
  "51999000980", // identity post-cita + retouch-reengage
  "51999000981", // treysy-flow
  "51999000982", // selector-debounce (P3 Yesenia) + ads-bounce-nudge
  "51999000983", // portfolio
  "51999000986", // button-empty-fallback + eli-yoja-quality
  "51999000985", // fanny-burst + design-pause (no paralelizar)
  "51999000984", // silence-watchdog
  "51999000987", // payment-slot-capacity cliente A
  "51999000988", // payment-slot-capacity cliente B
  "51999000989", // slot-capacity cliente A
  "51999000990", // slot-capacity cliente B + same-day smoke
  "51999000991", // booking-flow + special-overlap A
  "51999000992", // p2 ctwa intent + special-overlap B
  "51999000993", // effects + campaign-organic + special-overlap C
  "51999000994", // daytime / coalesce-burst + extensiones-lanes A
  "51999000995", // p4 / extensiones-lanes B
  "51999000996", // luana / natural-closing + extensiones-lanes C
  "51999000997", // angie-keissy + promo-filter + natural-closing A
  "51999000998", // p1 + ctwa-interest
  "51999000999", // p3
  ...QA_EXTRA_PHONES, // 51911100001 panel D + 51988800001/002 simulador + 584144940417 Alberto VE
];

const { url, serviceKey } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

let ok = 0;
for (const phone of QA_PHONES) {
  await cleanupQaPhone(supabase, phone, { deleteClient: true });
  const { count: msgs } = await supabase
    .from("wa_messages")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone);
  const { count: sessions } = await supabase
    .from("whatsapp_sessions")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone);
  console.log(
    `  ${phone}: wa_messages=${msgs ?? 0}, sessions=${sessions ?? 0}`,
  );
  if ((msgs ?? 0) === 0 && (sessions ?? 0) === 0) ok++;
}

console.log(
  `\nLimpieza QA: ${ok}/${QA_PHONES.length} teléfonos sin mensajes ni sesión.`,
);
process.exit(ok === QA_PHONES.length ? 0 : 1);
