#!/usr/bin/env node
/**
 * QA de isQaWaPhone() — regresión del bug 2026-08-02: comparaba el sufijo de
 * 3 dígitos (`slice(-3)`, ej. "978") contra un rango de 2 dígitos (78–99), por
 * lo que el guard nunca suprimía push para teléfonos QA (ni para nadie) desde
 * su creación (commit f009e1a, 20-jul-2026). Fix: rango 978–999.
 * Ampliación 15-sep-2026: piso 970 (view-packs …977 disparaba push).
 *
 * Test unitario puro (sin invocar el webhook) — importa el mismo módulo que
 * usa notify.ts en producción (supabase/functions/whatsapp-webhook/lib/qa-phone.mjs).
 */
import {
  isQaSimulationRangePhone,
  isQaWaPhone,
} from "../supabase/functions/whatsapp-webhook/lib/qa-phone.mjs";

const cases = [
  // [teléfono, esperado, nota]
  ["51999000970", true, "límite inferior ampliado (970)"],
  ["51999000977", true, "view-packs — debe omitir push (regresión 15-sep)"],
  ["51999000978", true, "límite inferior histórico del rango QA"],
  ["51999000999", true, "límite superior del rango QA"],
  ["51999000984", true, "teléfono QA usado por silence-watchdog"],
  ["51999000990", true, "teléfono QA usado por same-day smoke"],
  ["+51 999 000 981", true, "con formato (espacios/+) — normaliza dígitos"],
  ["PE.QA04979903", true, "BSUID QA (validate:bsuid) — no push error a staff"],
  ["pe.qa04979903", true, "BSUID QA case-insensitive"],
  ["PE.1704503080781860", false, "BSUID real — sí debe poder alertar"],
  [
    "51999000969",
    false,
    "justo debajo del rango QA (970) — no omitir push",
  ],
  ["519990009", false, "prefijo sin sufijo de 3 dígitos"],
  ["51934565683", false, "teléfono real (Lucía Landa) — nunca debe bloquearse"],
  ["51981444430", false, "número del bot — no es rango QA"],
  ["51932535512", false, "número de contacto humano del salón"],
  ["51911100001", true, "extra QA panel ejecutivo (PDF no-admin) — no push"],
  ["+51 911 100 001", true, "mismo extra con formato"],
  ["584144940417", true, "extra QA prueba manual Alberto (VE) — no push"],
  ["+58 414 4940417", true, "mismo VE con formato"],
];

const simCases = [
  ["51999000970", true, "piso 970 autoriza taps de plantilla en suites"],
  ["51999000977", true, "view-packs en rango simulación"],
  ["51999000978", true, "rango histórico 978 autoriza taps de plantilla en suites"],
  ["51911100001", false, "extra NO autoriza taps ni OCR — solo cleanup/push"],
  ["584144940417", false, "extra VE NO autoriza taps — solo cleanup/push"],
  ["51932535512", false, "932 no es rango QA (sí es staff aparte)"],
];

function main() {
  console.log("QA isQaWaPhone() — regresión rango 970–999\n");
  let allPass = true;
  for (const [phone, expected, note] of cases) {
    const got = isQaWaPhone(phone);
    const pass = got === expected;
    if (!pass) allPass = false;
    console.log(
      `  ${pass ? "✅" : "❌"} isQaWaPhone("${phone}") = ${got} (esperado ${expected}) — ${note}`,
    );
  }
  console.log("");
  for (const [phone, expected, note] of simCases) {
    const got = isQaSimulationRangePhone(phone);
    const pass = got === expected;
    if (!pass) allPass = false;
    console.log(
      `  ${pass ? "✅" : "❌"} isQaSimulationRangePhone("${phone}") = ${got} (esperado ${expected}) — ${note}`,
    );
  }
  console.log(
    `\n${allPass ? "✅ Todos los casos pasaron" : "❌ Hay casos fallando"}`,
  );
  process.exit(allPass ? 0 : 1);
}

main();
