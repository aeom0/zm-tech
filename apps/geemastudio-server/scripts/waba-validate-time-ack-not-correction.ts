#!/usr/bin/env -S deno run --allow-read --config supabase/functions/deno.json
/**
 * Unit puro: afirmación de asistencia con hora ("Estaré ahí a las 10") no es
 * corrección de hora ni pedido de cita (Nélida …6566, 24-sep-2026 — el bot
 * respondió "Horarios con cupo ese día: 5:30 PM" a una cita ya confirmada).
 */
import {
  matchesAttendanceAffirmation,
  matchesTimeCorrectionIntent,
} from "../supabase/functions/whatsapp-webhook/handlers/pending-appointment.ts";

const affirmations = [
  "Estare ahi a las 10.00",
  "Estaré ahí a las 10",
  "Llego a las 10 am",
  "Nos vemos mañana a las 10",
  "voy a estar ahi a las 10:00",
];
const corrections = [
  "No es a las 11",
  "Es a las 4:45 PM",
  "Era a las 3 pm",
  "Yo la coordiné para las 4",
  "no estare a las 10, puedo a las 11", // negación → sigue siendo cambio
];

let fail = 0;
function check(name: string, got: boolean, want: boolean) {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "✅" : "❌"} ${name}: ${got} (esperado ${want})`);
}

for (const t of affirmations) {
  check(`afirmación "${t}" ⇒ attendance`, matchesAttendanceAffirmation(t), true);
  check(`afirmación "${t}" ⇒ no corrección`, matchesTimeCorrectionIntent(t), false);
}
for (const t of corrections) {
  check(`corrección "${t}" ⇒ no attendance`, matchesAttendanceAffirmation(t), false);
  check(`corrección "${t}" ⇒ corrección`, matchesTimeCorrectionIntent(t), true);
}

if (fail) {
  console.error(`\n${fail} caso(s) fallaron`);
  Deno.exit(1);
}
console.log("\nOK");
