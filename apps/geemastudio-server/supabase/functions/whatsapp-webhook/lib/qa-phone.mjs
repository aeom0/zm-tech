// qa-phone.mjs — sin dependencias de Deno/Node para poder importarse tal cual
// desde la Edge Function (Deno) y desde los scripts QA (Node) sin duplicar lógica.

/**
 * Teléfonos extra de simulación (fuera del rango 51999000970–999).
 * Entran en cleanup y suprimen push; NO autorizan taps de plantilla ni OCR Sunat.
 * `51911100001` = caso D panel ejecutivo (PDF no-admin).
 * `51988800001` / `51988800002` = simulador interactivo del panel
 *   (`/panel/waba/simulador`, Alberto / Vanessa). Uso exclusivo de esa UI —
 *   no los usen las suites `yarn waba:validate*`.
 * `584144940417` = prueba manual Alberto (+58 414 4940417) — chat real sin spam push.
 */
export const QA_EXTRA_PHONES = [
  "51911100001",
  "51988800001", // simulador panel — Alberto
  "51988800002", // simulador panel — Vanessa
  "584144940417", // prueba manual Alberto (+58 414-4940417)
];

/** Teléfonos del simulador de chat WABA en el panel (fidelidad total vía dispatch). */
export const SIMULATOR_QA_PHONES = {
  alberto: "51988800001",
  vanessa: "51988800002",
};

/** Staff del salón (Vanessa) — único número que envía Constancia NPS. */
export const SALON_STAFF_PHONE = "51932535512";

export function digitsOnly(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

export function isSimulatorQaPhone(phone) {
  const d = digitsOnly(phone);
  return (
    d === SIMULATOR_QA_PHONES.alberto || d === SIMULATOR_QA_PHONES.vanessa
  );
}

/**
 * Rango de simulación `yarn waba:validate*` (51999000970–999).
 * Los taps de `pago_recibido_validar_zm` en suites usan este rango para
 * imitar a Vanessa; el extra `QA_EXTRA_PHONES` no entra aquí.
 *
 * Amplió el piso a 970 (15-sep-2026): `waba-validate-view-packs` usaba
 * `51999000977` (justo bajo el piso viejo 978) y disparaba push real a staff.
 */
export function isQaSimulationRangePhone(phone) {
  const d = digitsOnly(phone);
  if (!d.startsWith("519990009")) return false;
  const suffix = parseInt(d.slice(-3), 10);
  return suffix >= 970 && suffix <= 999;
}

/** True si es el WhatsApp staff del salón (+51 932 535 512). */
export function isSalonStaffPhone(phone) {
  return digitsOnly(phone) === SALON_STAFF_PHONE;
}

/**
 * Teléfonos de simulación QA (`yarn waba:validate*`) — no spamear push a Vanessa/dev.
 * Rango canónico: 51999000970–51999000999 + `QA_EXTRA_PHONES`.
 *
 * Fix 2026-08-02: antes comparaba el sufijo de 3 dígitos (`slice(-3)`, ej. `978`)
 * contra un rango de 2 dígitos (`78–99`) — nunca era verdadero, el guard jamás
 * suprimió ningún push desde su creación (commit f009e1a, 20-jul-2026).
 *
 * Fix 2026-09-15: piso 978→970 — suites nuevas bajo 978 (ej. view-packs `…977`)
 * no estaban en el guard y sí disparaban FCM.
 *
 * BSUID QA (`PE.QA…`, convención usada en `scripts/waba-validate-bsuid.mjs`):
 * mismo problema que el de arriba pero nunca tuvo cobertura — `isQaWaPhone`
 * solo comparaba dígitos, así que un BSUID de prueba nunca calzaba y una
 * respuesta real a esos hilos de simulación disparaba push real a Vanessa/dev.
 * No cubre BSUIDs reales de clientas/pruebas manuales fuera de esa convención
 * (ej. probar `type: "template"` con `recipient` contra un BSUID propio) —
 * ese caso es una conversación real y el push es el comportamiento esperado.
 */
export function isQaWaPhone(phone) {
  const s = String(phone ?? "").trim();
  // BSUID de simulación (`scripts/waba-validate:bsuid` → PE.QA…)
  if (/^PE\.QA/i.test(s)) return true;
  const d = digitsOnly(s);
  if (QA_EXTRA_PHONES.includes(d)) return true;
  return isQaSimulationRangePhone(d);
}
