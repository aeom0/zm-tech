#!/usr/bin/env -S deno run --allow-read --config supabase/functions/deno.json
/**
 * Unit test puro: extractTemplateAmountSpent + quirk Meta template_analytics.
 *
 * Meta a veces envía amount_spent sin `value` (≠ 0 explícito) y, en otros
 * días, amount_spent.value con sent/delivered/read en 0.
 */
import { extractTemplateAmountSpent } from "../supabase/functions/_shared/meta-pricing-client.ts";

type Case = {
  name: string;
  cost: Parameters<typeof extractTemplateAmountSpent>[0];
  expect: number | null;
};

const cases: Case[] = [
  {
    name: "sin cost → null",
    cost: undefined,
    expect: null,
  },
  {
    name: "cost vacío → null",
    cost: [],
    expect: null,
  },
  {
    name: "solo cost_per_delivered → null",
    cost: [{ type: "cost_per_delivered", value: 0.1 }],
    expect: null,
  },
  {
    name: "amount_spent sin value (Meta omitió) → null, no 0",
    cost: [
      { type: "amount_spent" },
      { type: "cost_per_delivered" },
      { type: "cost_per_url_button_click" },
    ],
    expect: null,
  },
  {
    name: "amount_spent value 0 explícito → 0",
    cost: [{ type: "amount_spent", value: 0 }],
    expect: 0,
  },
  {
    name: "amount_spent 0.28 (recordatorio quirk sent=0) → 0.28",
    cost: [{ type: "amount_spent", value: 0.28 }],
    expect: 0.28,
  },
  {
    name: "amount_spent 0.5 (retoque) → 0.5",
    cost: [
      { type: "amount_spent", value: 0.5 },
      { type: "cost_per_delivered" },
    ],
    expect: 0.5,
  },
  {
    name: "amount_spent value no numérico → null",
    cost: [{ type: "amount_spent", value: Number.NaN }],
    expect: null,
  },
];

let failed = 0;
for (const c of cases) {
  const got = extractTemplateAmountSpent(c.cost);
  const ok =
    got === c.expect ||
    (got != null && c.expect != null && Math.abs(got - c.expect) < 1e-9);
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${c.name}: got=${got} expect=${c.expect}`);
  } else {
    console.log(`OK   ${c.name}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${cases.length} fallaron`);
  Deno.exit(1);
}
console.log(`\n✓ template-analytics-cost ${cases.length}/${cases.length}`);
