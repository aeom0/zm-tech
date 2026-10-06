#!/usr/bin/env -S deno run --allow-read --config supabase/functions/deno.json
/**
 * Unit: matchesPortfolioOfferPhrase — oferta condicional vs mención informativa.
 */
import { matchesPortfolioOfferPhrase } from "../supabase/functions/whatsapp-webhook/lib/portfolio.ts";

const cases: { name: string; text: string; expect: boolean }[] = [
  {
    name: "Jacqueline …2438 — oferta condicional",
    text:
      "también te puedo mostrar opciones con fotos reales si quieres ver ejemplos ✨",
    expect: true,
  },
  {
    name: "¿quieres ver ejemplos?",
    text: "¿Quieres ver ejemplos de rubber en fotos reales?",
    expect: true,
  },
  {
    name: "informativo sin invitación → no CTA",
    text: "Tenemos fotos reales de trabajos en gel en el salón",
    expect: false,
  },
  {
    name: "solo 'ver ejemplos' sin invitación → no CTA",
    text: "Aquí puedes ver ejemplos en nuestra galería del local",
    expect: false,
  },
  {
    name: "mostrar el portafolio",
    text: "Si quieres te puedo enviar el portafolio de uñas",
    expect: true,
  },
];

let fails = 0;
for (const c of cases) {
  const got = matchesPortfolioOfferPhrase(c.text);
  if (got !== c.expect) {
    console.error(`❌ ${c.name}\n  expect ${c.expect} got ${got}`);
    fails++;
  } else {
    console.log(`✅ ${c.name}`);
  }
}
console.log(`\n${cases.length - fails}/${cases.length} OK`);
Deno.exit(fails > 0 ? 1 : 0);
