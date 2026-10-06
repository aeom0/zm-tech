#!/usr/bin/env -S deno run --allow-read --allow-env --config supabase/functions/deno.json
/**
 * Unit: matchesNaturalClosingIntent (Yelitza …1186 — okis / coalesce ok+gracias).
 */
import { matchesNaturalClosingIntent } from "../supabase/functions/whatsapp-webhook/handlers/dispatcher.ts";

type Case = { name: string; text: string; expect: boolean };

const cases: Case[] = [
  { name: "okis", text: "okis", expect: true },
  { name: "okis + newline + gracias", text: "okis\ngracias", expect: true },
  { name: "gracias", text: "gracias", expect: true },
  {
    name: "precio no es cierre",
    text: "cuánto cuesta el lifting?",
    expect: false,
  },
  {
    name: "listo mid-booking no es cierre",
    text: "listo te agendo el viernes",
    expect: false,
  },
];

let fails = 0;
for (const c of cases) {
  const got = matchesNaturalClosingIntent(c.text);
  const ok = got === c.expect;
  console.log(`${ok ? "✅" : "❌"} ${c.name}`);
  if (!ok) {
    console.log(`   got:    ${got}`);
    console.log(`   expect: ${c.expect}`);
    fails++;
  }
}
if (fails > 0) Deno.exit(1);
console.log(`\n${cases.length - fails}/${cases.length} OK`);
