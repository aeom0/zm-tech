#!/usr/bin/env -S deno run --allow-read --config supabase/functions/deno.json
/**
 * Unit: dedupe honorativo mid-frase (Luciana/Vania, análisis 09-sep).
 */
import { addressWithoutHello } from "../supabase/functions/whatsapp-webhook/lib/client-address.ts";

type Case = { name: string; raw: string; body: string; expect: string };

const cases: Case[] = [
  {
    name: "Haiku mid-frase Srta. → no duplicar",
    raw: "Luciana Gómez",
    body: "perfecto, Srta. Luciana 💜 Tenemos varias opciones",
    expect: "Perfecto, Srta. Luciana 💜 Tenemos varias opciones",
  },
  {
    name: "sin honorativo → anteponer",
    raw: "Vania",
    body: "el Lifting de Pestañas es S/50",
    expect: "Srta. Vania, el Lifting de Pestañas es S/50",
  },
  {
    name: "ya empieza con Srta. → intacto",
    raw: "Sofia",
    body: "Srta. Sofia, te agendo Rímel",
    expect: "Srta. Sofia, te agendo Rímel",
  },
  {
    name: "lista 🌸 conserva saltos (Alberto VE)",
    raw: "Alberto",
    body: "Srta. Alberto, opciones:\n🌸 Clásicas — S/70\n🌸 Rímel — S/85",
    expect: "Srta. Alberto, opciones:\n🌸 Clásicas — S/70\n🌸 Rímel — S/85",
  },
  {
    name: "Srta. huérfano mid-frase → strip + prepend (Yelitza)",
    raw: "Yelitza",
    body: "perfecto, Srta. ¡Te esperamos el viernes",
    expect: "Srta. Yelitza, perfecto, ¡Te esperamos el viernes",
  },
  {
    name: "nombre suelto sin Srta. mid-frase → no duplicar (Alberto …0417, 17-sep)",
    raw: "Alberto",
    body: "perfecto, Alberto. Para manos y pies en gel tenemos opciones",
    expect:
      "Perfecto, Srta. Alberto. Para manos y pies en gel tenemos opciones",
  },
  {
    name: "lista de precios con \\n reales → no colapsar a texto corrido (Alberto …0417, 17-sep)",
    raw: "Alberto",
    body: "🌸 Rubber — S/55\n🌸 Soft Gel - Nuevo Set — S/70\n🌸 Poly Gel - Nuevo Set — S/70\n🌸 Builder Gel — S/60",
    expect:
      "Srta. Alberto, 🌸 Rubber — S/55\n🌸 Soft Gel - Nuevo Set — S/70\n🌸 Poly Gel - Nuevo Set — S/70\n🌸 Builder Gel — S/60",
  },
  {
    name: "Srta., huérfano con coma pegada al punto → no duplicar (Luz …2637, 18-sep)",
    raw: "Luz",
    body: "Srta., ¡qué bueno verte de nuevo! 💜 Tienes tu Manicure en Gel confirmada",
    expect: "Srta. Luz, ¡qué bueno verte de nuevo! 💜 Tienes tu Manicure en Gel confirmada",
  },
  {
    name: "Srta., Nombre mid-frase con coma → no duplicar",
    raw: "Luz",
    body: "perfecto, Srta., Luz 💜 te esperamos",
    expect: "Perfecto, Srta., Luz 💜 te esperamos",
  },
];

let fails = 0;
for (const c of cases) {
  const got = addressWithoutHello(c.raw, c.body);
  const ok = got === c.expect;
  console.log(`${ok ? "✅" : "❌"} ${c.name}`);
  if (!ok) {
    console.log(`   got:    ${JSON.stringify(got)}`);
    console.log(`   expect: ${JSON.stringify(c.expect)}`);
    fails++;
  }
}
if (fails > 0) Deno.exit(1);
console.log(`\n${cases.length - fails}/${cases.length} OK`);
